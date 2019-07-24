# WS1Jira Service Desk Approval Connector

This connector allows a user to view, approve, or decline Approvals in their Jira Service Desk approval queue.

## Discovery
The discovery URL is of the form:

    https://base_url/

## Card Response

The sample card looks something like this:

    {
        "objects": [{
            "image": {
                "href": "http://localhost:9191/images/connector.png"
            },
            "body": {
                "fields": [{
                        "type": "GENERAL",
                        "title": "Reporter",
                        "description": "David Customer"
                    },
                    {
                        "type": "GENERAL",
                        "title": "Phone details and justification",
                        "description": "Sample details and justification"
                    },
                    {
                        "type": "GENERAL",
                        "title": "Status",
                        "description": "Waiting for approval"
                    },
                    {
                        "type": "GENERAL",
                        "title": "Date Created",
                        "description": "Today 2:39 PM"
                    }
                ],
                "description": "Sample details and justification"
            },
            "actions": [{
                    "action_key": "OPEN_IN",
                    "id": "02fc1108-ec9e-481d-8773-432967540037",
                    "user_input": [],
                    "request": {},
                    "repeatable": true,
                    "primary": false,
                    "label": "View",
                    "completed_label": "View",
                    "type": "GET",
                    "url": {
                        "href": "https://mobileflows.atlassian.net/servicedesk/customer/portal/1/FSDP-32"
                    }
                },
                {
                    "action_key": "DIRECT",
                    "id": "ec10e9e5-71b2-44d3-aba6-196836bc6008",
                    "user_input": [],
                    "request": {
                        "decision": "approve",
                        "issueKey": "FSDP-32"
                    },
                    "repeatable": false,
                    "primary": true,
                    "label": "Approve",
                    "completed_label": "Approved",
                    "type": "POST",
                    "url": {
                        "href": "https://dev.hero.vmwservices.com/connectors/foo/bar/servicedesk/actions"
                    }
                },
                {
                    "action_key": "DIRECT",
                    "id": "9ec88082-7dd9-425a-b0a1-51645cce6410",
                    "user_input": [],
                    "request": {
                        "decision": "decline",
                        "issueKey": "FSDP-32"
                    },
                    "repeatable": false,
                    "primary": true,
                    "label": "Decline",
                    "completed_label": "Declined",
                    "type": "POST",
                    "url": {
                        "href": "https://dev.hero.vmwservices.com/connectors/foo/bar/servicedesk/actions"
                    }
                }
            ],
            "id": "ef60693a-969b-4492-bb17-2239ac717cde",
            "backend_id": "FSDP-32",
            "hash": "B4HjcGI1hBs/YEgSsIQzt3CZhAX68v3U1TVUKH4gcbE=",
            "header": {
                "title": "FSDP-32 : New mobile device"
            }
        }]
    }

Each card has three actions -- `View`, `Approve`, or `Decline`