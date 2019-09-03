/*
 * Copyright © 2018 VMware, Inc. All Rights Reserved.
 * SPDX-License-Identifier: BSD-2-Clause
 */

'use strict'

const jwt = require('jsonwebtoken')
const rp = require('request-promise-native')
const uuidv4 = require('uuid/v4')

const pubKeyCache = {}

async function authValidateAsync (req, res, next) {
  const authorization = req.header('authorization')

  if (authorization) {
    const authKeyURL = envPublicKeyURL(authorization)
    if (authKeyURL === null) {
      res.status(401).send({
        message: 'Invalid Authorization header'
      })
      return
    }
    const authOptions = {
      authPubKeyUrl: authKeyURL.toString()
    }

    try {
      const decoded = await verifyAuthAsync(authorization, authOptions)
      res.locals.jwt = decoded
      res.locals.vidm = authKeyURL
      next()
    } catch (error) {
      console.log('Identity verification failed:', error)
      res.status(401).json({
        message: `Identity verification failed! ${error}`
      })
    }
  } else {
    res.status(401).send({
      message: 'Missing Authorization header'
    })
  }
}

async function verifyAuthAsync (authorization, options) {
  var pubKeyContents
  try {
    pubKeyContents = await getPublicKey(options)

    const jwtOptions = {
      /*
       * Don't allow 'none' OR HMAC.
       *
       * We have decided that a RSA/ECDSA public key will be used and
       * which key has been set out-of-band.  We cannot allow the
       * caller to specify non-RSA/ECDSA algorithms or else they can
       * either specify none or specify HMAC that uses a shared
       * secret.
       * Since jwt.verify has the same parameter for shared secret or
       * public key, this would allow an attacker to specify HMAC alg
       * signed with a shared secret of the public key contents --
       * which are not meant to be hidden -- and appear to be valid.
       *
       * (It doesn't look like node-jsonwebtoken fixed this security
       * issue from 2015 yet, but they probably did and the fix just
       * isn't as obvious as using a different function name or
       * having a forced algorithm passed in, so I'm going to assume
       * that the burden is on us to make sure we don't mix pub key
       * and shared secret algorithms in the algorithms option.)
       */
      algorithms: [
        'RS256',
        'RS384',
        'RS512',
        'ES256',
        'ES384',
        'ES512'
      ],
      // audience: 'TODO',
      // issuer: 'TODO',
      // subject: 'TODO',
      clockTolerance: 60,
      clockTimestamp: Date.now() / 1000
    }

    const auth = authorization.replace('Bearer ', '').trim()

    var decoded = jwt.verify(auth, pubKeyContents, jwtOptions, (err, decoded) => {
      if (err) {
        throw new Error('Failed JWT validation! ' + err.message)
      } else {
        return decoded
      }
    })
    return decoded
  } catch (error) {
    throw new Error(error.message)
  }
}

function envPublicKeyURL () {
  return process.env.token_public_key_url
}

/**
 * Retrieve the public key, either from cache or from the remote server
 * @param  {} options contains `authPubKeyUrl` key and URL value where the public key can be found
 */
async function getPublicKey (options) {
  if (pubKeyCache && (options.authPubKeyUrl in pubKeyCache) && pubKeyCache[options.authPubKeyUrl].expiresAtTime > Date.now()) {
    return pubKeyCache[options.authPubKeyUrl].contents
  }

  try {
    const data = await rp(options.authPubKeyUrl)
    const expiresAtTime = Date.now() + 3600000
    console.log(
      'Updating pub key cache for url: %s, set to expire around: %s',
      options.authPubKeyUrl,
      new Date(expiresAtTime)
    )

    if (options.authPubKeyUrl in pubKeyCache) {
      console.log('Deleting old entry and replacing')
      delete pubKeyCache[options.authPubKeyUrl]
    }

    pubKeyCache[options.authPubKeyUrl] = {
      expiresAtTime: expiresAtTime,
      contents: data
    }

    return data
  } catch (error) {
    return new Error(`Failed to retrieve public key: ${error.statusCode}`)
  }
}

/**
 * Retrieve a JWT for use with this mock vIDM
 *
 * @param  {} '/SAAS/auth/oauthtoken'
 * @param  {} function(req,res)
 */
function userAuthToken (req) {
  const user = req.body.user || 'genericuser'
  const tenant = req.body.tenant || 'vmware'
  const domain = req.body.domain || 'VMWARE'
  const protocol = req.body.protocol || req.protocol
  const hostname = req.headers.host
  const host = `${protocol}://${hostname}`
  const issuer = `${host}/SAAS/auth`
  const email = req.body.email || `${user}@${domain}`
  const audience = `${host}/auth/oauthtoken`
  const expires = req.body.expires || '7d'

  const payload = {
    jti: uuidv4(),
    prn: `${user}@${tenant}`,
    domain: domain,
    eml: email,
    iss: issuer
  }
  const jwtOptions = {
    algorithm: 'RS256',
    expiresIn: expires,
    audience: audience,
    subject: user
  }

  return jwt.sign(payload, privateKey, jwtOptions)
}

// for unit testing
const testmethods = {}
if (process.env.NODE_ENV === 'test') {
  testmethods.envPublicKeyURL = envPublicKeyURL
  testmethods.getPublicKey = getPublicKey
  testmethods.authValidateAsync = authValidateAsync
  testmethods.verifyAuthAsync = verifyAuthAsync
  testmethods.userAuthToken = userAuthToken
  console.log('Exporting all vidm methods for testing')
}

exports.test = testmethods
exports.validate = authValidateAsync
