# QA TEST MATRIX — WorkNex AI
**Generated:** 2026-05-23

Legend: ✅ Covered | ⚠️ Partial | ❌ Not Covered | 🔍 Needs Verification

---

## Module 1: Auth / JWT / 2FA

| Test Case | health | smoke | test:full | Manual | Status |
|---|---|---|---|---|---|
| Login success (admin) | ❌ | ✅ | ✅ | — | ✅ Covered |
| Login success (manager) | ❌ | ✅ | ✅ | — | ✅ Covered |
| Login success (employee) | ❌ | ✅ | ✅ | — | ✅ Covered |
| Login failure (wrong password) | ❌ | ❌ | ✅ | — | ✅ Covered |
| Refresh token | ❌ | ❌ | ✅ | — | ✅ Covered |
| Logout | ❌ | ❌ | ❌ | ❌ | ❌ Not Covered |
| 2FA setup | ❌ | ❌ | ❌ | ❌ | ❌ Not Covered |
| 2FA verify | ❌ | ❌ | ❌ | ❌ | ❌ Not Covered |
| 2FA disable | ❌ | ❌ | ❌ | ❌ | ❌ Not Covered |
| 2FA validate (login gate) | ❌ | ❌ | ❌ | ❌ | ❌ Not Covered |
| Forgot password | ❌ | ❌ | ❌ | ❌ | ❌ Not Covered |
| Reset password | ❌ | ❌ | ❌ | ❌ | ❌ Not Covered |
| /users/me for all roles | ❌ | ❌ | ✅ | — | ✅ Covered |
| Token stored in localStorage risk | ❌ | ❌ | ❌ | ❌ | ❌ Not Tested |

**Coverage: 5/14 (36%)**

---

## Module 2: RBAC and Tenant Isolation

| Test Case | health | smoke | test:full | Manual | Status |
|---|---|---|---|---|---|
| Admin sees own org users only | ❌ | ⚠️ | ✅ | — | ✅ Covered |
| Manager sees subordinates only | ❌ | ⚠️ | ✅ | — | ✅ Covered |
| Employee cannot list users | ❌ | ❌ | ✅ | — | ✅ Covered |
| Employee sees only own data | ❌ | ⚠️ | ✅ | — | ✅ Covered |
| Manager cannot access non-subordinate attendance | ❌ | ❌ | ✅ | — | ✅ Covered |
| Manager cannot approve non-subordinate leave | ❌ | ❌ | ✅ | — | ✅ Covered |
| Cross-org data leakage | ❌ | ❌ | ⚠️ | ❌ | ⚠️ Partial |
| SUPER_ADMIN cross-org access | ❌ | ❌ | ❌ | ❌ | ❌ Not Covered |
| organizationId present on all returned user records | ❌ | ❌ | ✅ | — | ✅ Covered |
| No returned users missing organizationId | ❌ | ❌ | ✅ | — | ✅ Covered |

**Coverage: 7/10 (70%)**

---

## Module 3: Users / Departments

| Test Case | health | smoke | test:full | Manual | Status |
|---|---|---|---|---|---|
| Admin create user | ❌ | ❌ | ✅ | — | ✅ Covered |
| Admin update user | ❌ | ❌ | ✅ | — | ✅ Covered |
| Admin deactivate user | ❌ | ❌ | ✅ | — | ✅ Covered |
| Manager create user | ❌ | ❌ | ❌ | ❌ | ❌ Not Covered |
| Department create | ❌ | ❌ | ✅ | — | ✅ Covered |
| Department update | ❌ | ❌ | ✅ | — | ✅ Covered |
| Department delete | ❌ | ❌ | ✅ | — | ✅ Covered |
| Delete blocked with active users | ❌ | ❌ | ✅ | — | ✅ Covered |
| Manager cannot update department | ❌ | ❌ | ✅ | — | ✅ Covered |
| Manager cannot delete department | ❌ | ❌ | ✅ | — | ✅ Covered |
| Audit log on user create | ❌ | ❌ | ❌ | ❌ | ❌ Not Covered |

**Coverage: 8/11 (73%)**

---

## Module 4: Attendance

| Test Case | health | smoke | test:full | Manual | Status |
|---|---|---|---|---|---|
| Employee today endpoint | ❌ | ✅ | ✅ | — | ✅ Covered |
| Employee check-in | ❌ | ❌ | ✅ | — | ✅ Covered |
| Duplicate check-in blocked | ❌ | ❌ | ✅ | — | ✅ Covered |
| Employee check-out | ❌ | ❌ | ✅ | — | ✅ Covered |
| Employee attendance history | ❌ | ❌ | ✅ | — | ✅ Covered |
| Manager reads subordinate attendance | ❌ | ✅ | ✅ | — | ✅ Covered |
| Manager cannot read non-subordinate attendance | ❌ | ❌ | ✅ | — | ✅ Covered |
| Admin reads all attendance | ❌ | ❌ | ✅ | — | ✅ Covered |
| Admin manual correction | ❌ | ❌ | ✅ | — | ✅ Covered |
| Admin attendance summary | ❌ | ❌ | ✅ | — | ✅ Covered |
| Late logic | ❌ | ❌ | ❌ | ❌ | ❌ Not Covered |
| Half-day logic | ❌ | ❌ | ❌ | ❌ | ❌ Not Covered |
| Absent auto-generation | ❌ | ❌ | ❌ | ❌ | ❌ Not Covered |
| Holiday effect on attendance | ❌ | ❌ | ❌ | ❌ | ❌ Not Covered |
| Wi-Fi / IP verification | ❌ | ❌ | ❌ | ❌ | ❌ Not Covered |
| TMS fallback sync | ❌ | ❌ | ❌ | ❌ | ❌ Not Covered |

**Coverage: 10/16 (63%)**

---

## Module 5: Leave + AI Policy Automation

| Test Case | health | smoke | test:full | Manual | Status |
|---|---|---|---|---|---|
| Employee balance check | ❌ | ✅ | ✅ | — | ✅ Covered |
| Valid leave apply | ❌ | ❌ | ✅ | — | ✅ Covered |
| Insufficient balance blocked | ❌ | ❌ | ✅ | — | ✅ Covered |
| Overlap blocked | ❌ | ❌ | ✅ | — | ✅ Covered |
| Decision explanation persisted | ❌ | ❌ | ✅ | — | ✅ Covered |
| Decision explanation fetch | ❌ | ❌ | ✅ | — | ✅ Covered |
| Manager approve leave | ❌ | ❌ | ✅ | — | ✅ Covered |
| Manager evaluate leave | ❌ | ❌ | ✅ | — | ✅ Covered |
| Manager cannot approve non-subordinate | ❌ | ❌ | ✅ | — | ✅ Covered |
| Admin leave list | ❌ | ❌ | ✅ | — | ✅ Covered |
| Admin balances by user | ❌ | ❌ | ✅ | — | ✅ Covered |
| Policy document upload | ❌ | ❌ | ✅ | — | ✅ Covered |
| Policy document extract | ❌ | ❌ | ✅ | — | ✅ Covered |
| AI-parse policy document | ❌ | ❌ | ✅ | — | ✅ Covered |
| Approve parsed rules | ❌ | ❌ | ✅ | — | ✅ Covered |
| LeaveDecisionLog persisted | ❌ | ❌ | ⚠️ | ❌ | ⚠️ Partial |
| Auto-approve/reject logic | ❌ | ❌ | ⚠️ | ❌ | ⚠️ Partial |

**Coverage: 15/17 (88%)**

---

## Module 6: Reports / Settings

| Test Case | health | smoke | test:full | Manual | Status |
|---|---|---|---|---|---|
| Reports list | ❌ | ✅ | ✅ | — | ✅ Covered |
| Generate attendance report | ❌ | ❌ | ✅ | — | ✅ Covered |
| Attendance report | ❌ | ✅ | ✅ | — | ✅ Covered |
| Leave report | ❌ | ❌ | ✅ | — | ✅ Covered |
| Performance report | ❌ | ❌ | ✅ | — | ✅ Covered |
| Department report | ❌ | ❌ | ✅ | — | ✅ Covered |
| CSV export | ❌ | ❌ | ✅ | — | ✅ Covered |
| Manager report access | ❌ | ❌ | ✅ | — | ✅ Covered |
| Employee cannot access dept report | ❌ | ❌ | ✅ | — | ✅ Covered |
| Admin get org settings | ❌ | ✅ | ✅ | — | ✅ Covered |
| Admin update settings | ❌ | ❌ | ✅ | — | ✅ Covered |
| Settings persistence | ❌ | ❌ | ✅ | — | ✅ Covered |
| Manager cannot update settings | ❌ | ❌ | ✅ | — | ✅ Covered |
| Employee cannot update settings | ❌ | ❌ | ✅ | — | ✅ Covered |
| Attendance policy JSON settings | ❌ | ❌ | ❌ | ❌ | ❌ Not Covered |

**Coverage: 14/15 (93%)**

---

## Module 7: Dashboards / Analytics

| Test Case | health | smoke | test:full | Manual | Status |
|---|---|---|---|---|---|
| Admin dashboard API | ❌ | ✅ | ✅ | — | ✅ Covered |
| Admin attendance trends | ❌ | ❌ | ✅ | — | ✅ Covered |
| Admin attendance by dept | ❌ | ❌ | ✅ | — | ✅ Covered |
| Admin leave summary | ❌ | ❌ | ✅ | — | ✅ Covered |
| Admin workforce headcount | ❌ | ❌ | ✅ | — | ✅ Covered |
| Admin audit logs | ❌ | ❌ | ✅ | — | ✅ Covered |
| Manager team-scoped dashboard | ❌ | ❌ | ✅ | — | ✅ Covered |
| Employee API endpoints | ❌ | ⚠️ | ✅ | — | ✅ Covered |
| ETL sync logs | ❌ | ❌ | ❌ | ❌ | ❌ Not Covered |
| Empty state handling | ❌ | ❌ | ❌ | ❌ | ❌ Not Covered |

**Coverage: 8/10 (80%)**

---

## Module 8: Notifications

| Test Case | health | smoke | test:full | Manual | Status |
|---|---|---|---|---|---|
| Employee list notifications | ❌ | ❌ | ✅ | — | ✅ Covered |
| Employee unread count | ❌ | ❌ | ✅ | — | ✅ Covered |
| Mark one notification read | ❌ | ❌ | ✅ | — | ✅ Covered |
| Admin broadcast | ❌ | ❌ | ✅ | — | ✅ Covered |
| Broadcast recipient count | ❌ | ❌ | ✅ | — | ✅ Covered |
| Org scoping of notifications | ❌ | ❌ | ⚠️ | ❌ | ⚠️ Partial |
| Mark all read | ❌ | ❌ | ❌ | ❌ | ❌ Not Covered |

**Coverage: 5/7 (71%)**

---

## Module 9: Performance

| Test Case | health | smoke | test:full | Manual | Status |
|---|---|---|---|---|---|
| Employee gets own performance | ❌ | ✅ | ✅ | — | ✅ Covered |
| Manager team performance | ❌ | ❌ | ✅ | — | ✅ Covered |
| Manager leaderboard | ❌ | ❌ | ✅ | — | ✅ Covered |
| Admin user-specific performance | ❌ | ❌ | ✅ | — | ✅ Covered |
| Employee cannot see team | ❌ | ❌ | ❌ | ❌ | ❌ Not Covered |

**Coverage: 4/5 (80%)**

---

## Module 10: AI Service

| Test Case | health | smoke | test:full | Manual | Status |
|---|---|---|---|---|---|
| AI /health | ✅ | ✅ | ✅ | — | ✅ Covered |
| Training script runs | ✅ | ❌ | ❌ | — | ✅ Covered |
| Model artifact created | ⚠️ | ❌ | ❌ | — | ⚠️ Partial |
| RAG JSON fallback created | ✅ | ❌ | ❌ | — | ✅ Covered |
| Dependency check | ✅ | ❌ | ❌ | — | ✅ Covered |
| Backend /ai/chat | ❌ | ✅ | ✅ | — | ✅ Covered |
| Backend /ai/predict-performance | ❌ | ✅ | ✅ | — | ✅ Covered |
| Direct AI /chat | ❌ | ❌ | ✅ | — | ✅ Covered |
| Direct AI /predict/performance | ❌ | ❌ | ✅ | — | ✅ Covered |
| fallback:true in response | ❌ | ❌ | ✅ | — | ✅ Covered |
| ChromaDB optional failure | ❌ | ❌ | ❌ | ❌ | ❌ Not Covered |
| RAG answer grounded | ❌ | ❌ | ✅ | — | ✅ Covered |

**Coverage: 9/12 (75%)**

---

## Module 11: Power BI

| Test Case | health | smoke | test:full | Manual | Status |
|---|---|---|---|---|---|
| Backend token endpoint (configured) | ❌ | ❌ | ✅ | — | ✅ Covered |
| Backend 503 honest when not configured | ❌ | ❌ | ✅ | — | ✅ Covered |
| Frontend Power BI page renders | ❌ | ❌ | ✅ | — | ✅ Covered |
| RLS limitation documented | ❌ | ❌ | ❌ | ❌ | ❌ Not in test |
| No fake embedded report | ❌ | ❌ | ⚠️ | ❌ | ⚠️ Partial |

**Coverage: 3/5 (60%)**

---

## Module 12: Public Registration

| Test Case | health | smoke | test:full | Manual | Status |
|---|---|---|---|---|---|
| POST /billing/register succeeds | ❌ | ❌ | ✅ | ✅ (in session) | ✅ Covered |
| organizationId in response | ❌ | ❌ | ✅ | — | ✅ Covered |
| licenseKey in response | ❌ | ❌ | ✅ | — | ✅ Covered |
| 503 on unmigrated DB | ❌ | ❌ | ✅ | — | ✅ Covered |
| No file path in 503 body | ❌ | ❌ | ✅ | — | ✅ Covered |
| Duplicate org name → 409 | ❌ | ❌ | ✅ | — | ✅ Covered |
| Owner user created after step 2 | ❌ | ❌ | ❌ | ❌ | ❌ Not Covered (BUG-REG-001) |
| Two-step atomicity failure | ❌ | ❌ | ❌ | ❌ | ❌ Not Covered (BUG-REG-001) |
| Smoke: /billing/register | ❌ | ❌ | ❌ | — | ❌ Not in smoke |

**Coverage: 5/9 (56%)**

---

## Module 13: Frontend Routes

| Route | test:full | Smoke | Status |
|---|---|---|---|
| `/` | ✅ | ✅ | ✅ |
| `/login` | ✅ | ✅ | ✅ |
| `/register` | ❌ | ❌ | ❌ Not tested |
| `/forgot-password` | ❌ | ❌ | ❌ Not tested |
| `/reset-password` | ❌ | ❌ | ❌ Not tested |
| `/verify-otp` | ❌ | ❌ | ❌ Not tested |
| `/dashboard/admin` | ✅ | ⚠️ | ✅ |
| `/dashboard/admin/attendance` | ✅ | ❌ | ✅ |
| `/dashboard/admin/leaves` | ✅ | ❌ | ✅ |
| `/dashboard/admin/reports` | ✅ | ❌ | ✅ |
| `/dashboard/admin/settings` | ✅ | ❌ | ✅ |
| `/dashboard/admin/ai-chat` | ✅ | ❌ | ✅ |
| `/dashboard/admin/forecast` | ✅ | ❌ | ✅ |
| `/dashboard/admin/powerbi` | ✅ | ❌ | ✅ |
| `/dashboard/manager` | ✅ | ❌ | ✅ |
| `/dashboard/employee` | ✅ | ❌ | ✅ |
| Route guards (auth redirect) | ⚠️ | ❌ | ⚠️ Not verified |
| Console errors on load | ❌ | ❌ | ❌ Not tested |

**Coverage: 12/18 (67%)**

---

## Overall Automated Coverage Summary

| Module | Tests | Covered | Coverage % |
|---|---|---|---|
| Auth / JWT / 2FA | 14 | 5 | 36% |
| RBAC / Tenant Isolation | 10 | 7 | 70% |
| Users / Departments | 11 | 8 | 73% |
| Attendance | 16 | 10 | 63% |
| Leave + AI Automation | 17 | 15 | 88% |
| Reports / Settings | 15 | 14 | 93% |
| Dashboards / Analytics | 10 | 8 | 80% |
| Notifications | 7 | 5 | 71% |
| Performance | 5 | 4 | 80% |
| AI Service | 12 | 9 | 75% |
| Power BI | 5 | 3 | 60% |
| Public Registration | 9 | 5 | 56% |
| Frontend Routes | 18 | 12 | 67% |
| **TOTAL** | **149** | **105** | **70%** |

---

## Critical Coverage Gaps

| Gap | Risk | Priority |
|---|---|---|
| 2FA full flow not tested | Auth bypass risk | HIGH |
| Logout not tested | Session management risk | MEDIUM |
| Two-step registration atomicity not tested | Orphaned orgs in production | HIGH |
| client `role: SUPER_ADMIN` not verified on backend | Privilege escalation | CRITICAL |
| localStorage token theft simulation | XSS risk unverified | HIGH |
| Wi-Fi/IP attendance verification | Policy bypass risk | MEDIUM |
| Late/half-day/absent generation | Core business logic gap | MEDIUM |
| Smoke test missing /billing/register | Regression gap | MEDIUM |
