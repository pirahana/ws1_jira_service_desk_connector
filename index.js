const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
require('dotenv').config()

const PORT = process.env.PORT

const handleDiscovery = require('./routes/discovery').discovery
const vidm = require('./routes/vidm')
const jira = require('./routes/public/jira/jira_routes')

const app = express()
app.set('trust proxy', true)
app.use(bodyParser.urlencoded({
  extended: true
}))

const authenticatedAPIs = [
  '/cards',
  '/actions',
  '/createRequest',
  '/listRequestTypes'
]

// pull out the authorization headers into res.locals for easier access
app.use(authenticatedAPIs, (req, res, next) => {
  res.locals.connectorAuthorization = req.header('x-connector-authorization')
  res.locals.authorization = req.header('authorization')
  if (process.env.DEBUG) {
    console.log(`----`)
    console.log(`AUTH: ${res.locals.authorization}`)
    console.log(`X-CONN-AUTH: ${res.locals.connectorAuthorization}`)
  }
  next()
}
)

// validate JWT header before proceeding
app.use(
  authenticatedAPIs,
  vidm.validate
)

// various request endpoints
app.get('/', handleDiscovery)
app.use('/images', express.static(path.join(__dirname, 'routes/public/images')))
app.post('/cards', jira.handleCards)
app.post('/actions', jira.handleActions)
app.post('/createCustomerRequest', jira.handleCreateCustomerRequest)
app.post('/listRequestTypes', jira.handleListRequestTypes)
app.post('/listServiceDesks', jira.handleListServiceDesks)

console.log(`CONNECTOR LISTENING ON PORT ${PORT}`)
app.listen(PORT)
