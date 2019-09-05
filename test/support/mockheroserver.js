const express = require('express')
const bodyParser = require('body-parser')
const fs = require('fs')
const uuidv4 = require('uuid/v4')
const jwt = require('jsonwebtoken')

/**
 * Create a Mock Hero Server with the appropriate APIs to respond to the connector
 */
function createServer () {
  const port = process.env.MOCK_HERO_SERVER_PORT || 10002
  const app = express()
  app.use(bodyParser.json())

  function publicKeyPath () {
    return './test/support/files/keys/public.pem'
  }

  app.get('/security/public-key', function (req, res) {
    fs.readFile(publicKeyPath(), 'utf8', function (err, data) {
      if (err !== undefined) {
        res.status(400).json({ error: err })
      } else {
        res.status(200).send(data)
      }
    })
  })

  app.get('/auth/oauthtoken', function (req, res) {
    res.status(200).send(userAuthToken(req))
  })

  /**
 * Retrieve a JWT for use with this mock
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

    return jwt.sign(payload, readPrivateKey(), jwtOptions)
  }

  /**
 * TODO:  this should not require access to test data, maybe
 */
  function readPrivateKey () {
    return fs.readFileSync('../test/support/files/keys/private.pem')
  }

  const server = app.listen(port)
  console.log('*** Mock jira is listening, call close() when finished')

  app.close = function () {
    console.log('*** Mock jira is shutting down')
    server.close()
  }

  return app
}

exports.createServer = createServer
