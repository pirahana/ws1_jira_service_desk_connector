const { describe, it, before, after } = require('mocha')
const assert = require('assert')
const vidm = require('../routes/vidm')
const createMockJiraServer = require('./support/mockjiraserver').createServer

// eslint-disable-next-line no-unused-vars
var mockJira

describe('vIDM tests:', function () {
  // setup includes bringing up the mock jira server
  before(function () {
    mockJira = createMockJiraServer()
  })

  it('envPublicKeyURL should return the URL from the env', function () {
    const url = vidm.test.envPublicKeyURL()
    assert(url === process.env.token_public_key_url, `expected ${process.env.token_public_key_url} got ${url}`)
  })

  it('2- envPublicKeyURL should return the URL from the env', function () {
    const url = vidm.test.envPublicKeyURL()
    assert(url === process.env.token_public_key_url, `expected ${process.env.token_public_key_url} got ${url}`)
  })

  // teardown includes shutting down the mock jira server
  after(function () {
    mockJira.close()
  })

})
