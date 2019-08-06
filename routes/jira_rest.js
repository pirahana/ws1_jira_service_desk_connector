const rp = require('request-promise-native')
require('dotenv').config()

const SERVICEDESK_REQUEST_API = `https://api.atlassian.com/ex/jira/${process.env.CLOUD_ID}/rest/servicedeskapi/request`

/**
 * Returns a list of Customer Approvals assigned to the requesting user
 * @param  {} req request
 * @param  {} res response
 */
async function getCustomerRequestsPendingApproval (connectorAuthorization) {
  const options = {
    uri: `${SERVICEDESK_REQUEST_API}`,
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
async function getApprovalDetail (issueKey, connectorAuthorization) {
  const options = {
    uri: `${SERVICEDESK_REQUEST_API}/${issueKey}/approval`,
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: connectorAuthorization
    }
  }
  return rp(options).then(r => JSON.parse(r).values[0] || undefined)
}
/**
 * Given a customer request issue key, retrieve the approval detail to use to approve or deny
 * @param  {} issueKey identifier for the request
 * @param  {} connectorAuthorization authorization header including token_type and token
 */
async function postComment (issueKey, comment, connectorAuthorization) {
  const options = {
    uri: `${SERVICEDESK_REQUEST_API}/${issueKey}/comment`,
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: connectorAuthorization
    },
    body: {
      body: comment,
      public: true
    },
    json: true
  }
  return rp(options)
}
/**
 * Given an issueKey and and approvalId, aprove or decline a request
 * @param  {} userDecision either "approve" or "decline"
 * @param  {} issueKey identifier for the request
 * @param  {} approvalId identifier for the approval associated with the request
 * @param  {} connectorAuthorization authorization header including token_type and token
 * @returns final decision if it was approved or declined from the response
 */
async function approveOrDenyApproval (userDecision, issueKey, approvalId, connectorAuthorization) {
  const options = {
    uri: `${SERVICEDESK_REQUEST_API}/${issueKey}/approval/${approvalId}`,
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
 * Create a customer request in the service desk
* @param  {} serviceDeskId the ID of the service desk in which to create the ticket
 * @param  {} requestTypeId to ID of the desired request type
 * @param  {} summary summary of the request
 * @param  {} description description of the request
 * @param  {} connectorAuthorization authorization header including token_type and token
 */
async function createCustomerRequest (serviceDeskId, requestTypeId, summary, description, connectorAuthorization) {
  const options = {
    uri: `${SERVICEDESK_REQUEST_API}`,
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-type': 'application/json',
      Authorization: connectorAuthorization
    },
    body: {
      serviceDeskId: serviceDeskId,
      requestTypeId: requestTypeId,
      requestFieldValues: {
        summary: summary,
        description: description
      }
    },
    json: true
  }
  return rp(options)
}

exports.getCustomerRequestsPendingApproval = getCustomerRequestsPendingApproval
exports.getApprovalDetail = getApprovalDetail
exports.approveOrDenyApproval = approveOrDenyApproval
exports.createCustomerRequest = createCustomerRequest
exports.postComment = postComment
