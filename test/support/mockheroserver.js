const express = require('express')
const bodyParser = require('body-parser')
const fs = require('fs')

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

  const server = app.listen(port)
  console.log('*** Mock jira is listening, call close() when finished')

  app.close = function () {
    console.log('*** Mock jira is shutting down')
    server.close()
  }

  return app
}

exports.createServer = createServer
