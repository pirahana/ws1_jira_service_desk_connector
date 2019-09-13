const express = require('express')
const bodyParser = require('body-parser')
const servicedesks = require('./files/listservicedesks')
const requesttypes = require('./files/getrequesttypes')
const requests = require('./files/getcustomerrequests')
const approval = require('./files/getapproval')
const approvalresponse = require('./files/approvalresponse')
const createRequest = require('./files/createcustomerrequest')
/**
 * Create a Mock Jira Service Desk service with the appropriate APIs to respond to the connector
 */
function createServer () {
  const port = process.env.MOCK_JIRA_SERVER_PORT || 10001
  const app = express()
  app.use(bodyParser.json())
  const baseURL = `http://localhost:${port}`

  app.get('/servicedesk', function (req, res) {
    res.status(200).json(servicedesks(baseURL))
  })

  app.get('/servicedesk/:serviceDeskId/requesttype', function (req, res) {
    const serviceDeskId = req.params.serviceDeskId
    res.status(200).json(requesttypes(baseURL, serviceDeskId))
  })

  app.get('/request', function (req, res) {
    // ?requestOwnership=APPROVER&requestStatus=OPEN_REQUESTS&approvalStatus=MY_PENDING_APPROVAL&expand=requestType
    res.status(200).json(requests(baseURL))
  })

  app.get('/request/:approvalIssueId/approval', function (req, res) {
    const approvalIssueId = req.params.approvalIssueId
    res.status(200).json(approval(baseURL, approvalIssueId))
  })

  app.post('/request/:approvalIssueId/approval/:approvalId', function (req, res) {
    const approvalIssueId = req.params.approvalIssueId
    const approvalId = req.params.approvalId
    const decision = req.body.decision
    res.status(200).json(approvalresponse(baseURL, approvalIssueId, approvalId, decision))
  })

  app.post('/request', (req, res) => {
    const summary = req.body.requestFieldValues.summary
    const description = req.body.requestFieldValues.description
    res.status(200).json(createRequest(baseURL, summary, description))
  })

  const server = app.listen(port)
  console.log('*** Mock jira is listening, call close() when finished')

  app.close = function (fn) {
    console.log('*** Mock jira is shutting down')
    server.close(() => fn())
  }

  return app
}

exports.createServer = createServer
