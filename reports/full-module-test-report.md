# FULL MODULE TEST REPORT

Overall: FAIL

| Module | Passed | Failed | Skipped | Notes |
|---|---:|---:|---:|---|
| Health | 3 | 0 | 0 | HTTP 200; HTTP 200; HTTP 200 |
| Public Registration | 8 | 0 | 0 | orgId=ef875ed2-8ca7-4a25-8e19-081f6d60b2b5; present; {"id":"38500df3-88dc-4d94-8c59-b79bd8d4bd57","email":"worknex_e2e_1779968844197.owner.1779968844336@example.com","role":"ADMIN","firstName":"E2E","lastName":"Owner","employeeId":"OWNER-MPPFHQKQ-2243D4","organizationId":"ef875ed2-8ca7-4a25-8e19-081f6d60b2b5"} |
| Auth | 11 | 0 | 0 | HTTP 401; HTTP 200; cookie only |
| Departments | 6 | 0 | 0 | HTTP 201; HTTP 200; HTTP 200 |
| Users | 5 | 0 | 0 | HTTP 201; HTTP 201; HTTP 200 |
| RBAC | 3 | 0 | 0 | HTTP 200; visible=1; HTTP 403 |
| Tenant | 4 | 0 | 0 | ef875ed2-8ca7-4a25-8e19-081f6d60b2b5; admin=ef875ed2-8ca7-4a25-8e19-081f6d60b2b5 manager=ef875ed2-8ca7-4a25-8e19-081f6d60b2b5 employee=ef875ed2-8ca7-4a25-8e19-081f6d60b2b5; HTTP 200 |
| Security | 5 | 0 | 0 | HTTP 401; HTTP 403; HTTP 422 |
| Attendance | 12 | 0 | 0 | HTTP 200; 409 is acceptable if prior run already checked in today; HTTP 409 |
| Leave | 12 | 0 | 1 | HTTP 200; HTTP 201; PENDING |
| Leave Automation | 4 | 0 | 0 | upload endpoint exercised; HTTP 200; HTTP 200 |
| Reports | 10 | 0 | 0 | HTTP 200; HTTP 200; HTTP 200 |
| Settings | 7 | 0 | 0 | HTTP 200; HTTP 200; HTTP 200 |
| Analytics | 7 | 0 | 0 | HTTP 200; HTTP 200; HTTP 200 |
| Employee APIs | 5 | 0 | 0 | HTTP 200; HTTP 200; HTTP 200 |
| Notifications | 5 | 0 | 0 | HTTP 200; HTTP 200; HTTP 200 |
| Performance | 4 | 0 | 0 | HTTP 200; HTTP 200; HTTP 200 |
| AI Backend | 4 | 0 | 0 | HTTP 200; {"answer":"## What happens without the AI service? The Node backend returns deterministic fallback responses and marks them with `fallback: true`. # Attendance Policy Attendance check-in and check-out use the configured attendance timezone. Late status is based on the configured late threshold.","message":"## What happens without the AI service? The Node backend returns deterministic fallback responses and marks them with `fallback: true`. # Attendance Policy Attendance check-in and check-out us; HTTP 200 |
| AI Direct | 5 | 0 | 0 | HTTP 200; HTTP 200; {"message":"## What happens without the AI service? The Node backend returns deterministic fallback responses and marks them with `fallback: true`. # Attendance Policy Attendance check-in and check-out use the configured attendance timezone. Late status is based on the configured late threshold.","answer":"## What happens without the AI service? The Node backend returns deterministic fallback responses and marks them with `fallback: true`. # Attendance Policy Attendance check-in and check-out us |
| Power BI | 2 | 0 | 0 | {"success":false,"message":"Power BI is not configured. Set POWERBI_CLIENT_ID, POWERBI_CLIENT_SECRET, POWERBI_TENANT_ID in environment.","errors":[]}; HTTP 200 |
| Frontend | 16 | 0 | 0 | 200 or expected auth redirect; 200 or expected auth redirect; 200 or expected auth redirect |
| Cleanup | 4 | 1 | 1 | cleanup cancel attempted; HTTP 200 {"success":true,"message":"User deactivated"}; HTTP 200 {"success":true,"message":"User deactivated"} |

## Failed Cases

- Cleanup / delete billing signup test organization: expected pass, actual FAIL. organization missing or prefix safety check failed

## Cleanup

- PASS: deactivate test employee - HTTP 200 {"success":true,"message":"User deactivated"}
- PASS: deactivate test manager - HTTP 200 {"success":true,"message":"User deactivated"}
- PASS: delete test department - deleted
- SKIPPED: delete test policy document - no delete endpoint exposed
- FAIL: delete billing signup test organization - organization missing or prefix safety check failed
