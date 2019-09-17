const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
require('dotenv').config()

const PORT = process.env.PORT

const handleDiscovery = require('./routes/discovery').discovery
const auth = require('./routes/auth')
const jira = require('./routes/public/jira/jira_routes')

const app = express()
app.set('trust proxy', true)
app.use(bodyParser.urlencoded({
  extended: true
}))

const authenticatedAPIs = [
  '/cards',
  '/approvalAction',
  '/createRequest',
  '/listRequestTypes'
]

// pull out the authorization headers into res.locals for easier access
app.use(authenticatedAPIs, (req, res, next) => {
  res.locals.connectorAuthorization = req.header('x-connector-authorization')
  res.locals.authorization = req.header('authorization')
  if (process.env.DEBUG) {
    console.log('----')
    console.log(`AUTH: ${res.locals.authorization}`)
    console.log(`X-CONN-AUTH: ${res.locals.connectorAuthorization}`)
  }
  next()
}
)

// validate JWT header before proceeding
app.use(
  authenticatedAPIs,
  auth.validate
)

// various request endpoints
app.get('/', handleDiscovery)
app.use('/images', express.static(path.join(__dirname, 'routes/public/images')))
app.post('/cards', jira.handleCards)
app.post('/approvalAction', jira.handleApprovalAction)
app.post('/createCustomerRequest', jira.handleCreateCustomerRequest)
app.post('/listRequestTypes', jira.handleListRequestTypes)
app.post('/listServiceDesks', jira.handleListServiceDesks)
app.post('/setHash', function (req, res) {
  jira.setHash(req.body.hash)
  res.status(200).json({ new_hash: req.body.hash })
})

console.log(`CONNECTOR LISTENING ON PORT ${PORT}`)
module.exports = app.listen(PORT)
