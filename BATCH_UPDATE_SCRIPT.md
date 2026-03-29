# Batch Update Script for All Dashboard Pages

## Overview

This document provides instructions and code templates to update all dashboard pages with API integration.

## Quick Update Commands

### Step 1: Backup Current Pages
```bash
cd frontend/app/dashboard
find . -name "page.jsx" -exec cp {} {}.backup \;
```

### Step 2: Replace Pages

I've created updated versions with `-new.jsx` suffix. To apply them:

```bash
# Employee pages
mv app/dashboard/employee/leaves/page-new.jsx app/dashboard/employee/leaves/page.jsx

# Continue for other pages...
```

## Pages Status

### ✅ Completed (Ready to Use)
1. `employee/attendance/page.jsx` - Full API integration
2. `employee/leaves/page-new.jsx` - Ready to replace

### 🔄 In Progress (Templates Provided)
See templates below for:
- Admin Users
- Admin Departments
- Admin Leaves
- Admin Attendance
- Manager pages

### ⏳ Pending
- Analytics pages
- Reports pages
- Settings pages
- Dashboard home pages

## Template: Admin Users Page

```javascript
'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useUsers } from '@/hooks/useUsers';
import { toast } from 'sonner';

export default function AdminUsers() {
  const { users, loading, fetchUsers, createUser, updateUser, deleteUser } = useUsers();
  
  useEffect(() => {
    fetchUsers();
  }, []);

  // Add your UI logic here
  // See: components/examples/APIIntegrationExamples.jsx
}
```

## Template: Admin Departments Page

```javascript
'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { departmentAPI } from '@/lib/api';
import { toast } from 'sonner';

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const data = await departmentAPI.getAll();
      setDepartments(data);
    } catch (err) {
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  // Add CRUD operations
}
```

## Template: Admin Leaves Page

```javascript
'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useLeaves } from '@/hooks/useLeaves';
import { toast } from 'sonner';

export default function AdminLeaves() {
  const { leaves, loading, fetchAllLeaves, updateLeaveStatus } = useLeaves();
  
  useEffect(() => {
    fetchAllLeaves();
  }, []);

  const handleApprove = async (leaveId) => {
    try {
      await updateLeaveStatus(leaveId, 'Approved', 'Approved by admin');
      toast.success('Leave approved');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleReject = async (leaveId) => {
    try {
      await updateLeaveStatus(leaveId, 'Rejected', 'Rejected by admin');
      toast.success('Leave rejected');
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Add your UI
}
```

## Common Patterns

### 1. Data Fetching
```javascript
useEffect(() => {
  const loadData = async () => {
    try {
      await fetchData();
    } catch (err) {
      toast.error('Failed to load data');
    }
  };
  loadData();
}, []);
```

### 2. Form Submission
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    await createData(formData);
    toast.success('Success!');
    setShowModal(false);
  } catch (err) {
    toast.error(err.message);
  }
};
```

### 3. Delete Confirmation
```javascript
const handleDelete = async (id) => {
  if (!confirm('Are you sure?')) return;
  try {
    await deleteData(id);
    toast.success('Deleted successfully');
  } catch (err) {
    toast.error(err.message);
  }
};
```

## Automated Update Process

### Option 1: Manual Update (Recommended)
1. Open each page file
2. Copy the template
3. Adapt to existing UI
4. Test functionality

### Option 2: Script-Based (Advanced)
Create a Node.js script to automate updates:

```javascript
const fs = require('fs');
const path = require('path');

const pages = [
  'employee/leaves/page.jsx',
  'admin/users/page.jsx',
  // ... add more
];

pages.forEach(page => {
  const filePath = path.join(__dirname, 'app/dashboard', page);
  // Read, transform, write
});
```

## Testing Checklist

After updating each page:

- [ ] Page loads without errors
- [ ] Data fetches correctly
- [ ] Loading states work
- [ ] Error handling works
- [ ] Create/Update/Delete operations work
- [ ] Toast notifications appear
- [ ] UI remains responsive

## Rollback Plan

If issues occur:

```bash
# Restore from backup
find . -name "page.jsx.backup" -exec sh -c 'mv "$1" "${1%.backup}"' _ {} \;
```

## Priority Update Order

1. **Critical (Do First)**
   - Employee Attendance ✅
   - Employee Leaves
   - Admin Users
   - Admin Departments

2. **Important (Do Next)**
   - Admin Leaves
   - Admin Attendance
   - Manager Team
   - Manager Leaves

3. **Nice to Have**
   - Analytics pages
   - Reports pages
   - Settings pages

## Support

For issues:
1. Check `QUICK_REFERENCE.md`
2. See `components/examples/APIIntegrationExamples.jsx`
3. Review `BEST_PRACTICES.md`
4. Check browser console for errors

## Estimated Time

- Per page: 15-30 minutes
- Total pages: ~20
- Total time: 5-10 hours

## Next Steps

1. Start with employee/leaves page (already created)
2. Move to admin/users page
3. Continue with priority list
4. Test each page after update
5. Update checklist in `INTEGRATION_CHECKLIST.md`

---

**Remember:** Test each page after updating before moving to the next one!
