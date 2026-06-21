# WorkNex AI — Power BI Row-Level Security (RLS) Configuration

## Overview

WorkNex AI uses 4 roles in Power BI to mirror the application's RBAC:

| Power BI Role   | Sees                                                 |
|-----------------|------------------------------------------------------|
| `SuperAdmin`    | All organizations, all data                         |
| `OrgAdmin`      | Own organization only                               |
| `Manager`       | Own department + their direct reports only          |
| `Employee`      | Own records only                                    |

---

## Setup Steps (Power BI Desktop)

1. Open the `.pbix` file in Power BI Desktop
2. Go to **Modeling → Manage Roles**
3. Create each role below and paste in the DAX filter expression

---

## Role Definitions

### Role: `OrgAdmin`

Table: **Organization**
```dax
[id] = USERPRINCIPALNAME()
```
> Replace `USERPRINCIPALNAME()` with `LOOKUPVALUE(Organization[id], Organization[adminEmail], USERPRINCIPALNAME())` if emails are in the Organization table.

Table: **User**
```dax
[organizationId] = LOOKUPVALUE(
    Organization[id],
    Organization[adminEmail],
    USERPRINCIPALNAME()
)
```

Table: **Attendance**
```dax
[organizationId] = LOOKUPVALUE(
    Organization[id],
    Organization[adminEmail],
    USERPRINCIPALNAME()
)
```

Table: **LeaveRequest**
```dax
[organizationId] = LOOKUPVALUE(
    Organization[id],
    Organization[adminEmail],
    USERPRINCIPALNAME()
)
```

Table: **PerformanceRecord**
```dax
[organizationId] = LOOKUPVALUE(
    Organization[id],
    Organization[adminEmail],
    USERPRINCIPALNAME()
)
```

---

### Role: `Manager`

Table: **User**
```dax
[managerId] = LOOKUPVALUE(User[id], User[email], USERPRINCIPALNAME())
    || [email] = USERPRINCIPALNAME()
```

Table: **Attendance**
```dax
RELATED(User[managerId]) = LOOKUPVALUE(User[id], User[email], USERPRINCIPALNAME())
    || RELATED(User[email]) = USERPRINCIPALNAME()
```

Table: **LeaveRequest**
```dax
RELATED(User[managerId]) = LOOKUPVALUE(User[id], User[email], USERPRINCIPALNAME())
    || RELATED(User[email]) = USERPRINCIPALNAME()
```

Table: **PerformanceRecord**
```dax
RELATED(User[managerId]) = LOOKUPVALUE(User[id], User[email], USERPRINCIPALNAME())
    || RELATED(User[email]) = USERPRINCIPALNAME()
```

---

### Role: `Employee`

Table: **User**
```dax
[email] = USERPRINCIPALNAME()
```

Table: **Attendance**
```dax
RELATED(User[email]) = USERPRINCIPALNAME()
```

Table: **LeaveRequest**
```dax
[employee][email] = USERPRINCIPALNAME()
```

Table: **LeaveBalance**
```dax
RELATED(User[email]) = USERPRINCIPALNAME()
```

Table: **PerformanceRecord**
```dax
RELATED(User[email]) = USERPRINCIPALNAME()
```

---

## Publishing to Power BI Service

1. **Publish** the `.pbix` from Power BI Desktop → Power BI Service
2. Go to **Datasets → Security** in Power BI Service
3. Assign Azure AD users/groups to each role:
   - `SuperAdmin` → WorkNex Super Admins AAD group
   - `OrgAdmin` → Organization Admin accounts
   - `Manager` → All manager-role accounts
   - `Employee` → All employee accounts
4. Click **Test as role** to verify filters work before going live

---

## Environment Variables Required (Azure AD)

Add to `worknex-backend/.env`:
```
POWERBI_CLIENT_ID=<Azure App Registration Client ID>
POWERBI_CLIENT_SECRET=<Client Secret>
POWERBI_TENANT_ID=<Azure Tenant ID>
POWERBI_WORKSPACE_ID=<Power BI Workspace ID>
POWERBI_REPORT_ID=<Embedded Report ID>
```

Obtain these from:
- Azure Portal → App Registrations → Your App → Overview (Client ID, Tenant ID)
- Azure Portal → App Registrations → Certificates & Secrets (Client Secret)
- Power BI Service → Workspace Settings (Workspace ID)
- Power BI Service → Report URL (Report ID)

---

## Embed Token Flow (Backend)

The backend generates embed tokens via Microsoft's REST API:

```
POST https://api.powerbi.com/v1.0/myorg/groups/{workspaceId}/reports/{reportId}/GenerateToken
Authorization: Bearer <AAD_ACCESS_TOKEN>
Body: { "accessLevel": "View", "identities": [{ "username": "<user_email>", "roles": ["OrgAdmin"], "datasets": ["<dataset_id>"] }] }
```

The token is passed to the frontend's Power BI JavaScript SDK:
```javascript
powerbi.embed(container, {
  type: 'report',
  id: POWERBI_REPORT_ID,
  embedUrl: embedUrl,
  accessToken: embedToken,
  tokenType: models.TokenType.Embed,
});
```
