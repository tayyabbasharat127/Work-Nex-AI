# FULL MODULE TEST REPORT

Overall: PASS

| Module | Passed | Failed | Skipped | Notes |
|---|---:|---:|---:|---|
| Health | 3 | 0 | 0 | HTTP 200; HTTP 200; HTTP 200 |
| Public Registration | 8 | 0 | 0 | orgId=ada21295-29de-4ac4-8148-a2f4887782e2; present; {"id":"a710c406-cd11-42ea-af49-c73577fd1a95","email":"worknex_e2e_1784184495700.owner.1784184495908@example.com","firstName":"E2E","lastName":"Owner","employeeId":"OWNER-MRN5DS3V-F9FEF9","organizationId":"ada21295-29de-4ac4-8148-a2f4887782e2","role":"ADMIN","roleId":"79e2f540-fe2c-4190-a2ba-f336448b935b","roleName":"Admin"} |
| Auth | 11 | 0 | 0 | HTTP 401; HTTP 200; cookie only |
| Departments | 6 | 0 | 0 | HTTP 201; HTTP 200; HTTP 200 |
| Users | 5 | 0 | 0 | HTTP 201; HTTP 201; HTTP 200 |
| RBAC | 3 | 0 | 0 | HTTP 200; visible=1; HTTP 403 |
| Tenant | 4 | 0 | 0 | ada21295-29de-4ac4-8148-a2f4887782e2; admin=ada21295-29de-4ac4-8148-a2f4887782e2 manager=ada21295-29de-4ac4-8148-a2f4887782e2 employee=ada21295-29de-4ac4-8148-a2f4887782e2; HTTP 200 |
| Security | 5 | 0 | 0 | HTTP 401; HTTP 403; HTTP 422 |
| Attendance | 12 | 0 | 0 | HTTP 200; 409 is acceptable if prior run already checked in today; HTTP 409 |
| Leave | 15 | 0 | 1 | HTTP 200; HTTP 201; PENDING_MANAGER |
| Leave Automation | 4 | 0 | 0 | upload endpoint exercised; HTTP 200; HTTP 200 |
| Reports | 10 | 0 | 0 | HTTP 200; HTTP 200; HTTP 200 |
| Settings | 7 | 0 | 0 | HTTP 200; HTTP 200; HTTP 200 |
| Analytics | 7 | 0 | 0 | HTTP 200; HTTP 200; HTTP 200 |
| Employee APIs | 5 | 0 | 0 | HTTP 200; HTTP 200; HTTP 200 |
| Notifications | 5 | 0 | 0 | HTTP 200; HTTP 200; HTTP 200 |
| Performance | 4 | 0 | 0 | HTTP 200; HTTP 200; HTTP 200 |
| AI Backend | 4 | 0 | 0 | HTTP 200; {"answer":"Your attendance history is on the **Attendance** page — check-in times, working hours, and monthly records.","message":"Your attendance history is on the **Attendance** page — check-in times, working hours, and monthly records.","sources":["attendance_policy.md"],"confidence":0.71,"actions":[{"type":"navigate","label":"Open attendance","path":"/dashboard/employee/attendance"}],"fallback":true,"intent":"attendance","data":{"mode":"statistical","actions":[{"type":"navigate","label":"Ope; HTTP 200 |
| AI Direct | 5 | 0 | 0 | HTTP 200; HTTP 200; {"message":"Your attendance history is on the **Attendance** page — check-in times, working hours, and monthly records.","answer":"Your attendance history is on the **Attendance** page — check-in times, working hours, and monthly records.","intent":"attendance","data":{"mode":"statistical","actions":[{"type":"navigate","label":"Open attendance","path":"/dashboard/employee/attendance"}]},"sources":["attendance_policy.md"],"confidence":0.71,"actions":[{"type":"navigate","label":"Open attendance"," |
| Power BI | 2 | 0 | 0 | {"embedToken":"H4sIAAAAAAAEACWTx66DVgBE_-VtiUQ1JVIWNAO-hkszbUfvvRmi_HtelP1s5pyZv3_M-OrGOPv584cRb-aMZnX3bMxzPJl84CKaJgeYmQz4DIzi5Cm4MhNrVJF5TiaoufFAtyna7okgfCM3LLQkWKkTWu_aXomCUmv8uJ7hx26zwGtqbxDgXZfGnBAkjxDkcYWIPd_iDKoRtmTglFYaaJ6bh5hZrPIuTAxHkDZ7P77saXGSltB5ffTnI6YXYr6aqOFmGU13gxMJIUCu0eDKFi1eIXj3obk880017HGh1QnNYHI3Dz0XoSet0jpmGJn698xhb5A-VyVQ8kKh6PXpqmm4PtXeNdv-AvxMph9leb0-DKGXoyeBm60nSt5Ml6t6hJ3t3kLT9_f2bSHcCHkS1yuERBqGELxr2m1y690tSsDtMwmeSGgZk9YLsAd9PdaK9pWTFk_6dEu5pNbHuMOC3Z9mFgOPfjkMmhbE-; HTTP 307 |
| Frontend | 16 | 0 | 0 | 200 or expected auth redirect; 200 or expected auth redirect; 200 or expected auth redirect |
| Cleanup | 5 | 0 | 1 | cleanup cancel attempted; HTTP 200 {"success":true,"message":"User deactivated"}; HTTP 200 {"success":true,"message":"User deactivated"} |

## Failed Cases

None.

## Cleanup

- PASS: deactivate test employee - HTTP 200 {"success":true,"message":"User deactivated"}
- PASS: deactivate test manager - HTTP 200 {"success":true,"message":"User deactivated"}
- PASS: delete test department - correctly blocked by assigned users
- SKIPPED: delete test policy document - no delete endpoint exposed
- PASS: delete billing signup test organization - ada21295-29de-4ac4-8148-a2f4887782e2
