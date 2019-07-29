/*
 * Copyright © 2018 VMware, Inc. All Rights Reserved.
 * SPDX-License-Identifier: BSD-2-Clause
 *
 * Discovery is the process by which a connector explains its capabilties to the Mobile Flows server
 * The request is an unauthenticated GET and the response is JSON
*/
const urljoin = require('url-join')

/**
 * Express looks for X-Forwarded-Proto
 * @param  {} req express request
 */
function protocol (req) {
  return req.protocol
}

/**
   * request.hostname is broken in Express 4 so we have to deal with the X-Forwarded- headers ourselves
   * @param  {} req express request
   */
function derivedBaseUrl (req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const proto = req.headers['x-forwarded-proto'] || protocol(req)
  const forwardedPort = req.headers['x-forwarded-port']
  const forwardedPrefix = req.headers['x-forwarded-prefix'] || ''

  if (forwardedPort && forwardedPrefix) {
    return `${proto}://${host}:${forwardedPort}${forwardedPrefix}`
  } else {
    return `${proto}://${host}`
  }
}

function imageURL (req) {
  const baseURL = derivedBaseUrl(req)
  return `${baseURL}/images/connector.png`
}
/**
   * Combine the various path components to make the URL route to the action
   * @param  {} req
   * @param  {} virtualURL
   */
function prepareURL (req, virtualURL) {
  const routingPrefix = req.headers['x-routing-prefix'] || ''
  const forwardedPrefix = req.headers['x-forwarded-prefix'] || ''
  return urljoin(routingPrefix, forwardedPrefix, virtualURL)
}

/**
   * Return the discovery JSON response that describes the capabilities of this connector
   * @param  {} req express request
   * @param  {} res express response
   */
function discovery (req, res) {
  const baseURL = derivedBaseUrl(req)

  const discoveryJSON = {
    image: {
      href: `${baseURL}/images/connector.png`
    },
    object_types: {
      card: {
        pollable: true,
        doc: {
          href: 'https://vmwaresamples.github.io/card-connectors-guide/#schema/herocard-response-schema.json'
        },
        endpoint: {
          href: `${baseURL}/cards`
        }
      }
    }
  }
  res.json(discoveryJSON)
}

exports.discovery = discovery
exports.imageURL = imageURL
exports.prepareURL = prepareURL
