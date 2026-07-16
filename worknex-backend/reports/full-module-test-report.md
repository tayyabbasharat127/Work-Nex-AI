# FULL MODULE TEST REPORT

Overall: PASS

| Module | Passed | Failed | Skipped | Notes |
|---|---:|---:|---:|---|
| Health | 3 | 0 | 0 | HTTP 200; HTTP 200; HTTP 200 |
| Public Registration | 8 | 0 | 0 | orgId=3c1921da-e3e3-41e0-b9e2-bfffd44e2f8a; present; {"id":"3afcab73-d0f5-4f41-9dc5-659d2dfa1eae","email":"worknex_e2e_1784050071948.owner.1784050073352@example.com","firstName":"E2E","lastName":"Owner","employeeId":"OWNER-MRKXCN8W-A2C7B4","organizationId":"3c1921da-e3e3-41e0-b9e2-bfffd44e2f8a","role":"ADMIN","roleId":"60e7a58d-df7f-44a9-9b25-23597b3c1922","roleName":"Admin"} |
| Auth | 11 | 0 | 0 | HTTP 401; HTTP 200; cookie only |
| Departments | 6 | 0 | 0 | HTTP 201; HTTP 200; HTTP 200 |
| Users | 5 | 0 | 0 | HTTP 201; HTTP 201; HTTP 200 |
| RBAC | 3 | 0 | 0 | HTTP 200; visible=1; HTTP 403 |
| Tenant | 4 | 0 | 0 | 3c1921da-e3e3-41e0-b9e2-bfffd44e2f8a; admin=3c1921da-e3e3-41e0-b9e2-bfffd44e2f8a manager=3c1921da-e3e3-41e0-b9e2-bfffd44e2f8a employee=3c1921da-e3e3-41e0-b9e2-bfffd44e2f8a; HTTP 200 |
| Security | 5 | 0 | 0 | HTTP 401; HTTP 403; HTTP 422 |
| Attendance | 11 | 0 | 0 | HTTP 200; HTTP 404; HTTP 404 |
| Leave | 15 | 0 | 1 | HTTP 200; HTTP 201; PENDING_MANAGER |
| Leave Automation | 4 | 0 | 0 | upload endpoint exercised; HTTP 200; HTTP 200 |
| Reports | 10 | 0 | 0 | HTTP 200; HTTP 200; HTTP 200 |
| Settings | 5 | 0 | 0 | HTTP 200; HTTP 200; HTTP 200 |
| Analytics | 7 | 0 | 0 | HTTP 200; HTTP 200; HTTP 200 |
| Employee APIs | 5 | 0 | 0 | HTTP 200; HTTP 200; HTTP 200 |
| Notifications | 5 | 0 | 0 | HTTP 200; HTTP 200; HTTP 200 |
| Performance | 4 | 0 | 0 | HTTP 200; HTTP 200; HTTP 200 |
| AI Backend | 4 | 0 | 0 | HTTP 200; {"answer":"Your attendance history is on the **Attendance** page — check-in times, working hours, and monthly records.","message":"Your attendance history is on the **Attendance** page — check-in times, working hours, and monthly records.","sources":["attendance_policy.md","leave_policy.md"],"confidence":0.71,"actions":[{"type":"navigate","label":"Open attendance","path":"/dashboard/employee/attendance"}],"fallback":true,"intent":"attendance","data":{"mode":"statistical","actions":[{"type":"navi; HTTP 200 |
| AI Direct | 5 | 0 | 0 | HTTP 200; HTTP 200; {"message":"Your attendance history is on the **Attendance** page — check-in times, working hours, and monthly records.","answer":"Your attendance history is on the **Attendance** page — check-in times, working hours, and monthly records.","intent":"attendance","data":{"mode":"statistical","actions":[{"type":"navigate","label":"Open attendance","path":"/dashboard/employee/attendance"}]},"sources":["attendance_policy.md","leave_policy.md"],"confidence":0.71,"actions":[{"type":"navigate","label":" |
| Power BI | 2 | 0 | 0 | {"embedToken":"[REDACTED]","embedTokenId":"21ad7d4b-d605-4f04-b239-91c29e22d9cc","expiration":"2026-07-14T18:28:14Z","reportId":"313f66f6-a40a-4f25-80f6-ca6f81fce76e","workspaceId":"efece712-4e79-4943-80fc-e3cb2f0eb670","datasetId":null,"embedUrl":"https://app.powerbi.com/reportEmbed?reportId=313f66f6-a40a-4f25-80f6-ca6f81fce76e&groupId=efece712-4e79-4943-80fc-e3cb2f0eb670&w=2&config=eyJjbHVzdGVyVXJsIjoiaHR0cHM6Ly9XQUJJLVNXRURFTi1DRU5UUkFMLVBSSU1BUlktcmVkaXJlY3QuYW5hbHlzaXMud2luZG93cy5uZXQiLCJlb; HTTP 307 |
| Frontend | 16 | 0 | 0 | 200 or expected auth redirect; 200 or expected auth redirect; 200 or expected auth redirect |
| Cleanup | 5 | 0 | 1 | cleanup cancel attempted; HTTP 200 {"success":true,"message":"User deactivated"}; HTTP 200 {"success":true,"message":"User deactivated"} |

## Failed Cases

None.

## Cleanup

- PASS: deactivate test employee - HTTP 200 {"success":true,"message":"User deactivated"}
- PASS: deactivate test manager - HTTP 200 {"success":true,"message":"User deactivated"}
- PASS: delete test department - correctly blocked by assigned users
- SKIPPED: delete test policy document - no delete endpoint exposed
- PASS: delete billing signup test organization - 3c1921da-e3e3-41e0-b9e2-bfffd44e2f8a
