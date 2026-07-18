# WorkNex HR data retention

Default operational retention is **7 years** for attendance, leave, performance, and
attrition records, subject to the university's legal and contractual requirements.
The institution must approve a final retention schedule before production and document
any legal hold that suspends deletion.

An authorized administrator with `users:manage` can permanently purge one user's HR
records using `DELETE /api/v1/users/:id/hr-data` with JSON body
`{"confirmation":"DELETE HR DATA"}`. The operation is tenant-scoped, deletes attendance,
leave requests/balances, performance, and attrition records, and writes a non-deleted
audit event containing the actor, time, target, and row counts. It does not delete the
user identity; deactivate the account separately.

Production operations should run an approved scheduled retention job after legal review.
Automatic age-based deletion is intentionally not enabled until that approval exists.
