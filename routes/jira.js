const crypto = require('crypto')
const uuidv4 = require('uuid/v4')
const discovery = require('./discovery')
const jiraRest = require('./jira_rest')

/**
 * Given the fields in a Jira service desk response, find the one that matches and return the value or other field
 * @param  {} requestFieldValues the array of requestFieldValues
 * @param  {} desiredName the fieldId of the field that is wanted
 * @param  {} desiredReturnField the field in the record that should be returned
 * @returns contents of the specified field, or an empty string
 */
function getFieldValueForName (requestFieldValues, desiredName, desiredReturnField) {
  const matches = requestFieldValues.filter((field) => {
    return field.fieldId === desiredName
  })
  if (matches.length > 0) {
    desiredReturnField = desiredReturnField || 'value'
    return matches[0][desiredReturnField] || ''
  }
}
/**
 * Given a customer request, return a card
 * @param  {} req http request (for headers, etc)
 * @param  {} customerRequest the request object from which to make a card
 * @returns JSON mobile flows card
 */
function makeCardFromCustomerRequest (req, customerRequest) {
  if (process.env.DEBUG) {
    console.log(`ACTION URL: ${discovery.prepareURL(req, '/actions')}`)
  }

  var sha256 = crypto.createHash('sha256')
  sha256.update(customerRequest.issueKey, 'utf8')
  sha256.update(customerRequest.currentStatus.statusDate.iso8601, 'utf8')
  const responseCard = {
    image: {
      href: `${discovery.imageURL(req)}`
    },
    body: {
      fields: [{
        type: 'GENERAL',
        title: 'Description',
        description: `${getFieldValueForName(customerRequest.requestFieldValues, 'description', 'value')}`
      },
      {
        type: 'GENERAL',
        title: 'Reporter',
        description: `${customerRequest.reporter.displayName}`
      },
      {
        type: 'GENERAL',
        title: `Request Type`,
        description: `${customerRequest.requestType.name}`
      },
      {
        type: 'GENERAL',
        title: 'Status',
        description: `${customerRequest.currentStatus.status}`
      },
      {
        type: 'GENERAL',
        title: 'Date Created',
        description: `${customerRequest.createdDate.friendly}`
      }
      ],
      description: `${customerRequest._links.web}`
    },
    actions: [{
      action_key: 'DIRECT',
      id: uuidv4(),
      user_input: [],
      request: {
        decision: 'approve',
        issueKey: customerRequest.issueKey
      },
      repeatable: false,
      primary: true,
      label: 'Approve',
      completed_label: 'Approved',
      type: 'POST',
      url: {
        href: `${discovery.prepareURL(req, '/actions')}`
      }
    },
    {
      action_key: 'USER_INPUT',
      id: uuidv4(),
      user_input: [
        {
          id: 'comment',
          label: 'Please explain why the Request is being denied',
          min_length: 5
        }
      ],
      request: {
        decision: 'decline',
        issueKey: customerRequest.issueKey
      },
      repeatable: false,
      primary: false,
      label: 'Decline',
      completed_label: 'Declined',
      type: 'POST',
      url: {
        href: `${discovery.prepareURL(req, '/actions')}`
      }
    }
    ],
    id: uuidv4(),
    backend_id: `${customerRequest.issueKey}`,
    hash: sha256.digest('base64'),
    header: {
      title: `${getFieldValueForName(customerRequest.requestFieldValues, 'summary', 'value')}`,
      subtitle: [`${customerRequest.issueKey}`]

    }

  }

  return responseCard
}

function makeStaticTicketCreationCard (req) {
  var sha256 = crypto.createHash('sha256')
  sha256.update('create_request', 'utf8')
  const responseCard = {
    image: {
      href: `${discovery.imageURL(req)}`
    },
    body: {
      fields: [],
      description: `Submit a Request`
    },
    actions: [{
      action_key: 'USER_INPUT',
      id: uuidv4(),
      user_input: [
        {
          id: 'summary',
          label: 'Summary',
          min_length: 1
        },
        {
          id: 'details',
          label: 'Details',
          min_length: 1
        }
      ],
      request: {
      },
      repeatable: true,
      primary: true,
      label: 'Create Request',
      completed_label: 'Create Request',
      type: 'POST',
      url: {
        href: `${discovery.prepareURL(req, '/actions')}`
      }
    }
    ],
    id: uuidv4(),
    backend_id: `create_request`,
    hash: sha256.digest('base64'),
    header: {
      title: `Create Customer Request`
    }
  }
  return responseCard
}

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
    cardArray.push(makeStaticTicketCreationCard(req)) // static card, temporary

    customerRequests.forEach(customerRequest => {
      const card = makeCardFromCustomerRequest(req, customerRequest)
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
      const commentResult = await jiraRest.postComment(issueKey, comment, connectorAuthorization)
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
