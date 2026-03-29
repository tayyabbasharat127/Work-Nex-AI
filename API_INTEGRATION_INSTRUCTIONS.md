# API Integration Instructions - Complete Guide

## 🎯 Overview

I've created API-integrated versions of the dashboard pages. This document explains how to apply them.

## ✅ Completed Pages

### Ready to Use (Full API Integration)
1. **Employee Attendance** - `app/dashboard/employee/attendance/page.jsx` ✅ APPLIED
2. **Employee Leaves** - `app/dashboard/employee/leaves/page-new.jsx` ✅ CREATED
3. **Admin Users** - `app/dashboard/admin/users/page-new.jsx` ✅ CREATED

## 📋 How to Apply Updates

### Method 1: Replace Individual Files (Recommended)

```bash
cd frontend

# Backup original files first
cp app/dashboard/employee/leaves/page.jsx app/dashboard/employee/leaves/page.jsx.backup
cp app/dashboard/admin/users/page.jsx app/dashboard/admin/users/page.jsx.backup

# Apply new versions
mv app/dashboard/employee/leaves/page-new.jsx app/dashboard/employee/leaves/page.jsx
mv app/dashboard/admin/users/page-new.jsx app/dashboard/admin/users/page.jsx

# Test the pages
npm run dev
```

### Method 2: Manual Copy-Paste

1. Open the `-new.jsx` file
2. Copy all content
3. Open the original `page.jsx` file
4. Replace all content
5. Save and test

## 🔄 Remaining Pages to Update

### High Priority
- [ ] `admin/departments/page.jsx`
- [ ] `admin/leaves/page.jsx`
- [ ] `admin/attendance/page.jsx`
- [ ] `manager/team/page.jsx`
- [ ] `manager/leaves/page.jsx`

### Medium Priority
- [ ] `admin/analytics/page.jsx`
- [ ] `admin/reports/page.jsx`
- [ ] `employee/analytics/page.jsx`
- [ ] `employee/settings/page.jsx`

### Low Priority
- [ ] Dashboard home pages
- [ ] Settings pages
- [ ] Misc pages (ETL, Forecast, Logs, etc.)

## 📝 Template for Remaining Pages

Use this template for pages not yet created:

```javascript
'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { toast } from 'sonner';
// Import appropriate hook or API

export default function PageName() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Fetch data from API
      const result = await apiCall();
      setData(result);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="role-here" />
      
      <main className="flex-1 overflow-auto md:ml-64">
        {/* Your content */}
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div>{/* Display data */}</div>
        )}
      </main>
    </div>
  );
}
```

## 🧪 Testing Checklist

After applying each update:

1. **Start servers**
   ```bash
   # Terminal 1 - Backend
   cd backend
   node Server.js
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

2. **Test functionality**
   - [ ] Page loads without errors
   - [ ] Data fetches correctly
   - [ ] Loading states appear
   - [ ] Error handling works
   - [ ] CRUD operations work
   - [ ] Toast notifications show
   - [ ] UI is responsive

3. **Check browser console**
   - No errors
   - API calls succeed
   - Data structure is correct

## 🔧 Common Issues & Solutions

### Issue 1: "Cannot find module '@/hooks/useHook'"

**Solution:** Hook might not exist yet. Use direct API calls:

```javascript
import { apiName } from '@/lib/api';

const [data, setData] = useState([]);

useEffect(() => {
  const loadData = async () => {
    const result = await apiName.method();
    setData(result);
  };
  loadData();
}, []);
```

### Issue 2: "toast is not defined"

**Solution:** Install and configure Sonner:

```bash
npm install sonner
```

Add to `app/layout.jsx`:
```javascript
import { Toaster } from 'sonner';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

### Issue 3: API returns 401 Unauthorized

**Solution:** Check authentication:
1. Verify user is logged in
2. Check token in localStorage
3. Verify token hasn't expired
4. Re-login if needed

### Issue 4: Data structure doesn't match

**Solution:** Check backend response format and adapt:

```javascript
// If backend returns { data: [...] }
const result = await apiCall();
setData(result.data || result);

// If backend returns different field names
const mapped = result.map(item => ({
  id: item.user_id,
  name: item.user_name,
  // ... map other fields
}));
```

## 📚 Reference Documents

- **API Documentation:** `frontend/API_INTEGRATION_GUIDE.md`
- **Quick Reference:** `frontend/QUICK_REFERENCE.md`
- **Best Practices:** `frontend/BEST_PRACTICES.md`
- **Examples:** `frontend/components/examples/APIIntegrationExamples.jsx`
- **Helpers:** `frontend/lib/helpers.js`

## 🚀 Quick Start Commands

```bash
# 1. Apply employee leaves page
cd frontend
mv app/dashboard/employee/leaves/page-new.jsx app/dashboard/employee/leaves/page.jsx

# 2. Apply admin users page
mv app/dashboard/admin/users/page-new.jsx app/dashboard/admin/users/page.jsx

# 3. Start development
npm run dev

# 4. Test in browser
# Navigate to http://localhost:3000/dashboard/employee/leaves
# Navigate to http://localhost:3000/dashboard/admin/users
```

## 📊 Progress Tracking

Update `INTEGRATION_CHECKLIST.md` as you complete each page:

```markdown
- [x] Employee Attendance
- [x] Employee Leaves
- [x] Admin Users
- [ ] Admin Departments
- [ ] Admin Leaves
...
```

## 🎓 Learning Resources

### For New Pages

1. **Copy existing pattern** from completed pages
2. **Adapt the hook** or API calls
3. **Update UI** to match your design
4. **Test thoroughly**

### Example Workflow

```javascript
// 1. Start with template
import { useState, useEffect } from 'react';

// 2. Add your hook
import { useYourHook } from '@/hooks/useYourHook';

// 3. Initialize
const { data, loading, fetchData } = useYourHook();

// 4. Load data
useEffect(() => {
  fetchData();
}, []);

// 5. Render
return <YourUI data={data} loading={loading} />;
```

## 💡 Tips

1. **Start with simple pages** (view-only) before complex ones (CRUD)
2. **Test each page** before moving to the next
3. **Keep backups** of original files
4. **Use browser DevTools** to debug API calls
5. **Check Network tab** to see request/response
6. **Console log** data to understand structure

## 🆘 Getting Help

If you encounter issues:

1. Check browser console for errors
2. Check Network tab for failed requests
3. Review `QUICK_REFERENCE.md` for examples
4. Check `BEST_PRACTICES.md` for patterns
5. Look at completed pages for reference

## ✨ Next Steps

1. **Apply the 3 completed pages** (attendance, leaves, users)
2. **Test them thoroughly**
3. **Create remaining pages** using templates
4. **Update checklist** as you progress
5. **Deploy when complete**

## 🎉 Success Criteria

You'll know integration is complete when:

- ✅ All pages load without errors
- ✅ Data fetches from real API
- ✅ CRUD operations work
- ✅ Loading states appear
- ✅ Error handling works
- ✅ Toast notifications show
- ✅ No console errors
- ✅ All tests pass

---

**Remember:** Take it one page at a time. Test thoroughly before moving to the next!

**Estimated Time:** 
- Applying 3 completed pages: 30 minutes
- Creating remaining pages: 5-8 hours
- Testing and fixes: 2-3 hours
- **Total: 8-12 hours**

Good luck! 🚀
