/**
 * All exported methods should take a request and response and should be declared async
 * All methods should be handling the response directly within them and
 * should not expect to return a Promise
 */
const jiraRest = require('./jira_rest')
const jiraUtil = require('./jira_util')

/**
 * The published card request endpoint
 * @param  {} req
 * @param  {} res
 */
async function handleCards (req, res) {
  try {
    const connectorAuthorization = res.locals.connectorAuthorization
    const customerRequests = await jiraRest.getCustomerRequestsPendingApproval(connectorAuthorization)

    const cardArray = []
    cardArray.push(jiraUtil.makeStaticTicketCreationCard(req)) // static card, temporary

    customerRequests.forEach(customerRequest => {
      const card = jiraUtil.makeCardFromCustomerRequest(req, customerRequest)
      cardArray.push(card)
    })

    const responseJSON = {
      objects: cardArray
    }
    if (process.env.DEBUG) {
      console.log(`Sending status 200 and cardArray with ${cardArray.length} cards`)
    }
    res.status(200).json(responseJSON)
  } catch (error) {
    if (process.env.DEBUG) {
      console.log(error.message || 'Unknown error')
    }
    if (error.statusCode) {
      res.header('X-Backend-Status', [error.statusCode])
    }
    res.status(400).send()
  }
}

async function handleListServiceDesks (req, res) {
  try {
    const connectorAuthorization = req.header('x-connector-authorization')
    const serviceDesks = await jiraRest.listServiceDesks(connectorAuthorization)

    if (process.env.DEBUG) {
      console.log(`Sending status 200 and action with ${JSON.stringify(serviceDesks)} result`)
    }
    res.status(200).json(serviceDesks)
  } catch (error) {
    if (process.env.DEBUG) {
      console.log(error.message || 'Unknown error')
    }
    if (error.statusCode) {
      res.header('X-Backend-Status', [error.statusCode])
    }
    res.status(400).send()
  }
}

async function handleListRequestTypes (req, res) {
  try {
    const connectorAuthorization = req.header('x-connector-authorization')
    const serviceDeskId = req.body.serviceDeskId || 1
    const requestTypes = await jiraRest.listRequestTypes(serviceDeskId, connectorAuthorization)

    if (process.env.DEBUG) {
      console.log(`Sending status 200 and action with ${JSON.stringify(requestTypes)} result`)
    }
    res.status(200).json(requestTypes)
  } catch (error) {
    if (process.env.DEBUG) {
      console.log(error.message || 'Unknown error')
    }
    if (error.statusCode) {
      res.header('X-Backend-Status', [error.statusCode])
    }
    res.status(400).send()
  }
}

/**
 * The published approval request endpoint
 * @param  {} req
 * @param  {} res
 */
async function handleApprovalAction (req, res) {
  try {
    const connectorAuthorization = req.header('x-connector-authorization')
    const issueKey = req.body.issueKey
    const decision = req.body.decision
    const comment = req.body.comment
    if (process.env.DEBUG) {
      console.log(`${issueKey} -- ${decision}`)
    }

    const approval = await jiraRest.getApprovalDetail(issueKey, connectorAuthorization)

    if (approval === undefined) {
      res.status(400).json({
        error: 'no approval found'
      })
      return
    }

    if (comment) {
      const commentResult = await jiraRest.postCommentOnRequest(issueKey, comment, connectorAuthorization)
      if (process.env.DEBUG) {
        console.log(JSON.stringify(commentResult))
      }
    }

    const result = await jiraRest.approveOrDenyApproval(decision, issueKey, approval.id, connectorAuthorization)

    if (process.env.DEBUG) {
      console.log(`Sending status 200 and action with ${result} result`)
    }

    res.status(200).json({
      status: result
    })
  } catch (error) {
    if (process.env.DEBUG) {
      console.log(error.message || 'Unknown error')
    }
    if (error.statusCode) {
      res.header('X-Backend-Status', [error.statusCode])
    }
    res.status(400).send()
  }
}

async function handleCreateCustomerRequest (req, res) {
  try {
    const connectorAuthorization = req.header('x-connector-authorization')
    const serviceDeskId = 1
    const requestTypeId = 1
    const summary = req.body.summary || 'summary here'
    const description = req.body.description || 'description here'

    const result = await jiraRest.createCustomerRequest(serviceDeskId, requestTypeId, summary, description, connectorAuthorization)
    const success = { issueId: result.issueId, issueKey: result.issueKey }
    res.status(200).json(success)
  } catch (error) {
    if (process.env.DEBUG) {
      console.log(error.message || 'Unknown error')
    }
    if (error.statusCode) {
      res.header('X-Backend-Status', [error.statusCode])
    }
    res.status(400).send()
  }
}

exports.handleCards = handleCards
exports.handleActions = handleApprovalAction
exports.handleCreateCustomerRequest = handleCreateCustomerRequest
exports.handleListServiceDesks = handleListServiceDesks
exports.handleListRequestTypes = handleListRequestTypes
