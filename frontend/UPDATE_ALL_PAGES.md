# Dashboard Pages API Integration Guide

This document provides the updated code for all dashboard pages with API integration.

## Pages to Update

### Employee Dashboard
1. ✅ attendance/page.jsx - DONE
2. ⏳ leaves/page.jsx
3. ⏳ page.jsx (home)
4. ⏳ analytics/page.jsx
5. ⏳ settings/page.jsx

### Admin Dashboard  
1. ⏳ users/page.jsx
2. ⏳ departments/page.jsx
3. ⏳ attendance/page.jsx
4. ⏳ leaves/page.jsx
5. ⏳ analytics/page.jsx
6. ⏳ reports/page.jsx
7. ⏳ settings/page.jsx
8. ⏳ page.jsx (home)

### Manager Dashboard
1. ⏳ attendance/page.jsx
2. ⏳ leaves/page.jsx
3. ⏳ team/page.jsx
4. ⏳ page.jsx (home)

## Implementation Strategy

Since there are many pages, I'll provide:
1. Complete implementations for the most critical pages
2. Templates for similar pages
3. Reusable components

## Priority Order

### Phase 1: Core Functionality (Immediate)
1. Employee Attendance ✅
2. Employee Leaves
3. Admin Users
4. Admin Departments

### Phase 2: Management (Next)
5. Admin Leaves
6. Admin Attendance
7. Manager Team
8. Manager Leaves

### Phase 3: Analytics & Reports
9. Admin Analytics
10. Admin Reports
11. Employee Analytics

### Phase 4: Settings & Misc
12. All Settings pages
13. Dashboard home pages
14. Remaining pages

## Common Patterns

All pages follow these patterns:

```javascript
// 1. Import hooks and utilities
import { useState, useEffect } from 'react';
import { useHook } from '@/hooks/useHook';
import { formatDate, formatTime } from '@/lib/helpers';
import { toast } from 'sonner';

// 2. Initialize hook
const { data, loading, error, fetchData, createData, updateData, deleteData } = useHook();

// 3. Load data on mount
useEffect(() => {
  fetchData();
}, []);

// 4. Handle loading state
if (loading) return <LoadingSpinner />;

// 5. Handle error state
if (error) return <ErrorMessage error={error} />;

// 6. Render data
return <DataDisplay data={data} />;
```

## Next Steps

Run the following command to see which pages need updating:

```bash
cd frontend
find app/dashboard -name "page.jsx" -type f
```

Then update each page following the patterns in:
- `app/dashboard/employee/attendance/page.jsx` (completed example)
- `components/examples/APIIntegrationExamples.jsx` (component patterns)
- `QUICK_REFERENCE.md` (API usage examples)
