# Roles And Permissions

SUPER_ADMIN is the platform-level role and can access platform-wide routes only where explicitly allowed.

ADMIN can access organization-wide data inside the user's organization.

MANAGER can access only direct subordinates inside the same organization for users, attendance, leave, analytics, performance, and reports.

EMPLOYEE can access only self-scoped profile, attendance, leave, performance, and notification data.

The chatbot must not bypass these permissions. It can explain policies and suggest navigation, but protected data must come from scoped backend APIs.
