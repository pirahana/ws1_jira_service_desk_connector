require('dotenv').config()
const assert = require('assert')
const auth = require('../routes/auth')
const createMockJiraServer = require('./support/mock_jira_server').createServer
const createMockHeroServer = require('./support/mock_hero_server').createServer

// eslint-disable-next-line no-unused-vars
var mockJira
// eslint-disable-next-line no-unused-vars
var mockHero

describe('auth tests:', function () {
  // setup includes bringing up the mock jira server
  before(function () {
    mockJira = createMockJiraServer()
    mockHero = createMockHeroServer()
  })

  it('envPublicKeyURL should return the URL from the env', function () {
    const url = auth.test.envPublicKeyURL()
    assert(url === process.env.token_public_key_url, `expected ${process.env.token_public_key_url} got ${url}`)
  })

  it('getPublicKey should return the public key', async function () {
    const key = await auth.test.getPublicKey({ authPubKeyUrl: auth.test.envPublicKeyURL() })
    assert(key.startsWith('-----BEGIN PUBLIC KEY-----'), 'Expected a public key but did not get one')
  })

  // teardown includes shutting down the mock jira server
  after(function () {
    mockJira.close(() => {
      mockHero.close()
    })
  })
})
