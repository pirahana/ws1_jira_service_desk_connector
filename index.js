const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
require('dotenv').config()

const PORT = process.env.PORT

const handleDiscovery = require('./routes/discovery').discovery
const vidm = require('./routes/vidm')
const jira = require('./routes/jira')
const handleCards = jira.handleCards
const handleActions = jira.handleActions

const app = express()
app.set('trust proxy', true)
app.use(bodyParser.urlencoded({
  extended: true
}))

// pull out the authorization headers into res.locals for easier access
app.use(
  [
    '/cards',
    '/actions'
  ],
  (req, res, next) => {
    res.locals.connectorAuthorization = req.header('x-connector-authorization')
    res.locals.authorization = req.header('authorization')
    if (process.env.DEBUG) {
      console.log(`----`)
      console.log(`AUTH: ${res.locals.authorization}`)
      console.log(`**`)
      console.log(`X-CONN-AUTH: ${res.locals.connectorAuthorization}`)
    }
    next()
  }
)

// validate JWT header before proceeding
app.use(
  [
    '/cards',
    '/actions'
  ],
  vidm.validate
)

// various request endpoints
app.get('/', handleDiscovery)
app.use('/images', express.static(path.join(__dirname, 'routes/public/images')))
app.post('/cards', handleCards)
app.post('/actions', handleActions)

console.log(`CONNECTOR LISTENING ON PORT ${PORT}`)
app.listen(PORT)
