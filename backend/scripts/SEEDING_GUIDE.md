# Test Data Seeding Guide

This guide explains how to populate your WorkNex database with realistic test data for comprehensive testing.

## What Gets Created

The seeding script creates:

- **5 Departments**: Engineering, Marketing, HR, Finance, Operations
- **5 Managers**: One manager per department
- **50 Employees**: 10 employees per manager
- **~3,500 Attendance Records**: 90 days of attendance for all 55 users (excluding weekends)
- **3 Leave Policies**: Annual (20 days), Sick (10 days), Casual (10 days)
- **165 Leave Balances**: One per user per leave type
- **150-250 Leave Requests**: 3-5 requests per employee with mixed statuses
- **200 Performance Reviews**: Quarterly reviews for all employees

## Running the Seed Script

### Step 1: Navigate to Backend Directory
```bash
cd backend
```

### Step 2: Run the Seed Script
```bash
node scripts/seed-test-data.js
```

The script will:
- Create all test data
- Show progress for each step
- Display a summary at the end
- Provide login credentials

## Login Credentials

After seeding, you can login with:

### Manager Accounts
- **Email**: manager1@worknex.com to manager5@worknex.com
- **Password**: manager123
- **Departments**: Engineering, Marketing, HR, Finance, Operations

### Employee Accounts
- **Email**: employee1@worknex.com to employee50@worknex.com
- **Password**: employee123
- **Assigned to**: Various managers across departments

## Clearing Test Data

If you need to clear all test data and start fresh:

```bash
node scripts/clear-test-data.js
```

This will delete:
- All test users (emails containing @worknex.com)
- All attendance records
- All leave requests and balances
- All performance reviews
- All departments

## Testing Scenarios

With this data, you can test:

### 1. Manager Dashboard
- Login as manager1@worknex.com
- View 10 team members
- See attendance records for your team
- Review leave requests
- Check team performance

### 2. Employee Dashboard
- Login as employee1@worknex.com
- View your attendance history (90 days)
- See your leave balance
- Apply for leave
- Check your performance reviews

### 3. Admin Dashboard
- View all 55 users
- See attendance across all departments
- Manage leave policies
- Run analytics and reports

### 4. Attendance Module
- 90 days of historical data
- Mix of PRESENT, LATE, and HALF_DAY statuses
- Realistic check-in/check-out times
- Weekend exclusions

### 5. Leave Module
- Multiple leave requests per employee
- Mix of PENDING, APPROVED, and REJECTED statuses
- Different leave types (Annual, Sick, Casual)
- Leave balances tracking

### 6. Performance Module
- Quarterly reviews for all employees
- Scores ranging from 60-100
- Manager-employee relationships

## Data Characteristics

### Attendance Data
- **Check-in times**: 8:00 AM - 9:30 AM
- **Check-out times**: 5:00 PM - 7:00 PM
- **Attendance rate**: ~95%
- **Late arrivals**: ~10% (after 9:30 AM)
- **Half days**: Based on working hours < 4

### Leave Requests
- **Date range**: Last 90 days
- **Duration**: 1-5 days per request
- **Status distribution**: Random mix of pending/approved/rejected
- **Types**: Annual, Sick, Casual

### Performance Reviews
- **Frequency**: Quarterly
- **Score range**: 60-100
- **Status**: All completed
- **Reviewer**: Direct manager

## Troubleshooting

### Error: Unique constraint violation
If you see unique constraint errors, the data might already exist. Run the clear script first:
```bash
node scripts/clear-test-data.js
node scripts/seed-test-data.js
```

### Error: Department not found
Make sure your database is properly migrated:
```bash
npx prisma migrate dev
```

### Error: Connection refused
Ensure your database is running and the connection string in `.env` is correct.

## Notes

- The script uses `upsert` for departments and managers to avoid duplicates
- All passwords are hashed using bcrypt
- Dates are generated randomly within realistic ranges
- The script is idempotent for departments and managers
- Employee data is always created fresh (no upsert)

## Next Steps

After seeding:
1. Start the backend server: `npm run dev`
2. Start the frontend: `cd ../frontend && npm run dev`
3. Login with any of the test accounts
4. Explore all modules with realistic data
5. Test filtering, sorting, and pagination
6. Verify manager-employee relationships
7. Test leave approval workflows
8. Review analytics and reports

---

## Deterministic Enterprise Demo Tenant

Use `scripts/demo-seeder.js` for the sales, QA, and browser-automation tenant. It is separate from the older random/test datasets and always targets exactly this organization:

- Name: `WorkNex Technologies`
- Slug: `worknex-technologies-demo`
- Industry: Software Development
- Country: Pakistan
- Timezone: Asia/Karachi
- Fixed anchor date: `2026-07-16` (override with `DEMO_ANCHOR_DATE`)

From the repository root:

```shell
npm run demo:seed
npm run demo:validate
npm run demo:reset
npm run demo:rebuild
```

`demo:seed` is a safe rerun: it removes and recreates only the fixed demo slug, then runs integrity validation. `demo:reset` removes only that tenant. `demo:rebuild` validates the Prisma schema, deploys pending migrations, then recreates the tenant.

Stable non-production accounts:

| Role | Email | Default non-production password |
|---|---|---|
| Admin | `admin@demo.worknex.ai` | `WorkNexDemo!2026` |
| Manager | `manager@demo.worknex.ai` | `WorkNexDemo!2026` |
| Employee | `employee@demo.worknex.ai` | `WorkNexDemo!2026` |

All seeded accounts have 2FA disabled. Set `DEMO_USER_PASSWORD` to replace the default. The seeder refuses to run when `NODE_ENV=production` unless `ALLOW_DEMO_SEED_IN_PRODUCTION=true`; production also requires an explicit `DEMO_USER_PASSWORD`.

Unsupported schema concepts are not fabricated: currency and employment joining-history records have no dedicated models; `REMOTE_WEB` is stored as the attendance source with `PRESENT` status; weekends have no artificial punches; primary AI conversation and forecast history are not persisted because no compatible tables exist.

## Demo Runtime

The repository-level runtime supervisor makes the seeded tenant client-ready with one command:

```shell
npm run demo:start
```

Before starting anything, it verifies installed dependencies, PostgreSQL access, migration status, the deterministic seed, and all three demo credentials. Pending migrations and unavailable PostgreSQL cause an immediate failure. Missing or invalid demo data is safely recreated for the fixed demo slug only.

Backend, AI, multi-agent, and frontend services that are not already running are launched concurrently and must become healthy within 60 seconds. Healthy existing services are reused. Runtime state and service logs are written under `.demo-runtime/`, which is gitignored.

```shell
npm run demo:status  # Process ownership and endpoint status
npm run demo:health  # Database, migrations, data, accounts, and endpoints
npm run demo:stop    # Stop only processes launched by demo:start
npm run demo:rebuild # Explicitly deploy migrations and recreate demo data
```

`demo:stop` deliberately leaves reused processes running. `demo:start` is disabled under `NODE_ENV=production` unless an approved isolated environment explicitly sets `ALLOW_DEMO_RUNTIME_IN_PRODUCTION=true`. Set `DEMO_START_TIMEOUT_MS`, `PYTHON_COMMAND`, or the `DEMO_*_HEALTH_URL` variables only when local readiness endpoints differ from the defaults.
