const rp = require('request-promise-native')
const crypto = require('crypto')
const uuidv4 = require('uuid/v4')
const moment = require('moment')
const discovery = require('./discovery')
require('dotenv').config()

/**
 * Returns a list of Customer Approvals assigned to the requesting user
 * @param  {} req request
 * @param  {} res response
 */
async function getCustomerRequestsPendingApproval(connectorAuthorization) {
    const options = {
        uri: `https://api.atlassian.com/ex/jira/${process.env.CLOUD_ID}/rest/servicedeskapi/request`,
        qs: {
            requestOwnership: 'APPROVER',
            requestStatus: 'OPEN_REQUESTS',
            approvalStatus: 'MY_PENDING_APPROVAL',
            expand: 'requestType'
        },
        method: 'GET',
        headers: {
            Accept: 'application/json',
            Authorization: connectorAuthorization
        }
    }

    return rp(options).then(r => JSON.parse(r).values)
}
/**
 * Given a customer request issue key, retrieve the approval detail to use to approve or deny
 * @param  {} issueKey identifier for the request
 * @param  {} connectorAuthorization authorization header including token_type and token
 */
async function getApprovalDetail(issueKey, connectorAuthorization) {
    const options = {
        uri: `https://api.atlassian.com/ex/jira/${process.env.CLOUD_ID}/rest/servicedeskapi/request/${issueKey}/approval`,
        method: 'GET',
        headers: {
            Accept: 'application/json',
            Authorization: connectorAuthorization
        }
    }
    return rp(options).then(r => JSON.parse(r).values[0] || undefined)
}
/**
 * Given an issueKey and and approvalId, aprove or decline a request
 * @param  {} userDecision either "approve" or "decline"
 * @param  {} issueKey identifier for the request
 * @param  {} approvalId identifier for the approval associated with the request
 * @param  {} connectorAuthorization authorization header including token_type and token
 * @returns final decision if it was approved or declined from the response
 */
async function approveOrDenyApproval(userDecision, issueKey, approvalId, connectorAuthorization) {
    const options = {
        uri: `https://api.atlassian.com/ex/jira/${process.env.CLOUD_ID}/rest/servicedeskapi/request/${issueKey}/approval/${approvalId}`,
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-type': 'application/json',
            Authorization: connectorAuthorization
        },
        body: {
            decision: userDecision
        },
        json: true
    }
    return rp(options).then(r => r.finalDecision)
}
/**
 * Given the fields in a Jira service desk response, find the one that matches and return the value or other field
 * @param  {} requestFieldValues the array of requestFieldValues
 * @param  {} desiredName the fieldId of the field that is wanted
 * @param  {} desiredReturnField the field in the record that should be returned
 * @returns contents of the specified field, or an empty string
 */
function getFieldValueForName(requestFieldValues, desiredName, desiredReturnField) {
    const matches = requestFieldValues.filter((field) => {
        return field.fieldId === desiredName
    })
    if (matches.length > 0) {
        desiredReturnField = desiredReturnField || "value"
        return matches[0][desiredReturnField] || ""
    }
}
/**
 * Given a customer request, return a card
 * @param  {} req http request (for headers, etc)
 * @param  {} customerRequest the request object from which to make a card
 * @returns JSON mobile flows card
 */
function makeCardFromCustomerRequest(req, customerRequest) {

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
                    type: 'COMMENT',
                    title: 'Description',
                    description: `${getFieldValueForName(customerRequest.requestFieldValues,'description', 'value')}`,
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
                },
            ],
            description: `${customerRequest._links.web}`
        },
        actions: [{
                "action_key": "DIRECT",
                "id": uuidv4(),
                "user_input": [],
                "request": {
                    "decision": "approve",
                    "issueKey": customerRequest.issueKey
                },
                "repeatable": false,
                "primary": true,
                "label": "Approve",
                "completed_label": "Approved",
                "type": "POST",
                "url": {
                    "href": `${discovery.prepareURL(req, '/actions')}`
                }
            },
            {
                "action_key": "DIRECT",
                "id": uuidv4(),
                "user_input": [],
                "request": {
                    "decision": "decline",
                    "issueKey": customerRequest.issueKey
                },
                "repeatable": false,
                "primary": false,
                "label": "Decline",
                "completed_label": "Declined",
                "type": "POST",
                "url": {
                    "href": `${discovery.prepareURL(req, '/actions')}`
                }
            }
        ],
        id: uuidv4(),
        backend_id: `${customerRequest.issueKey}`,
        hash: sha256.digest('base64'),
        header: {
            title: `${getFieldValueForName(customerRequest.requestFieldValues,'summary', 'value')}`,
            subtitle: [`${customerRequest.issueKey}`]

        }

    }

    return responseCard
}

/**
 * The published card request endpoint
 * @param  {} req
 * @param  {} res
 */
async function handleCards(req, res) {
    try {
        const connectorAuthorization = res.locals.connectorAuthorization
        const customerRequests = await getCustomerRequestsPendingApproval(connectorAuthorization)

        let cardArray = []
        customerRequests.forEach(customerRequest => {
            const card = makeCardFromCustomerRequest(req, customerRequest)
            cardArray.push(card)
        });

        const responseJSON = {
            objects: cardArray
        }
        if (process.env.DEBUG) {
            console.log(`Sending status 200 and cardArray with ${cardArray.length} cards`)
        }
        res.status(200).json(responseJSON)

    } catch (error) {
        console.log(error)
        res.status(500).send()
    }
}

/**
 * The published approval request endpoint
 * @param  {} req
 * @param  {} res
 */
async function handleApprovalAction(req, res) {
    try {
        const connectorAuthorization = req.header('x-connector-authorization')
        const issueKey = req.body.issueKey
        const decision = req.body.decision
        console.log(`${issueKey} -- ${decision}`)

        const approval = await getApprovalDetail(issueKey, connectorAuthorization)

        if (approval === undefined) {
            res.status(400).json({
                error: "no approval found"
            })
            return
        }

        const result = await approveOrDenyApproval(decision, issueKey, approval.id, connectorAuthorization)

        if (process.env.DEBUG) {
            console.log(`Sending status 200 and action with ${result} result`)
        }

        res.status(200).json({
            status: result
        })

    } catch (error) {
        console.log(error)
        res.status(400).send()
    }
}

exports.handleCards = handleCards
exports.handleActions = handleApprovalAction