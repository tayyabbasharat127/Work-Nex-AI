# Quick Start Guide - API Integrated Dashboard

## ✅ What's Done

Three dashboard pages are now fully integrated with the backend API:
1. Employee Attendance
2. Employee Leaves  
3. Admin Users

## 🚀 Start the Application

### Step 1: Start Backend

```bash
cd backend
node Server.js
```

You should see:
```
🚀 Server running on port 5000
📊 API available at http://localhost:5000/api
⏰ Starting auto-checkout cron job...
✅ Auto-checkout cron job scheduled (every 5 minutes)
```

### Step 2: Start Frontend

```bash
cd frontend
npm run dev
```

You should see:
```
  ▲ Next.js 16.1.6
  - Local:        http://localhost:3000
  - Network:      http://192.168.x.x:3000

 ✓ Ready in 2.3s
```

## 🧪 Test the Pages

### 1. Login First

Navigate to: http://localhost:3000/login

Use credentials from your database or create a test user.

### 2. Test Employee Attendance

URL: http://localhost:3000/dashboard/employee/attendance

**What to test:**
- ✅ Click "Check In" button
- ✅ See today's status update
- ✅ Click "Check Out" button
- ✅ View attendance history table
- ✅ Check toast notifications appear

**Expected behavior:**
- Check-in button changes to check-out after clicking
- Today's status shows current check-in time
- History table shows past 30 days
- Toast notifications show success/error messages

### 3. Test Employee Leaves

URL: http://localhost:3000/dashboard/employee/leaves

**What to test:**
- ✅ Click "Apply Leave" button
- ✅ Fill in the form (type, dates, reason)
- ✅ Submit the form
- ✅ See new leave in the list
- ✅ Cancel a pending leave (X button)

**Expected behavior:**
- Modal opens with form
- Form submits successfully
- New leave appears in list
- Toast shows success message
- Can cancel pending leaves

### 4. Test Admin Users

URL: http://localhost:3000/dashboard/admin/users

**What to test:**
- ✅ View all users in table
- ✅ Search for users by name/email
- ✅ Filter by role and department
- ✅ Click "Add User" button
- ✅ Fill form and create user
- ✅ Edit existing user
- ✅ View user details
- ✅ Delete user
- ✅ Test pagination

**Expected behavior:**
- Users load from database
- Search filters results
- Filters work correctly
- CRUD operations succeed
- Pagination works
- Modals open/close properly

## 🐛 Troubleshooting

### Issue: Pages show "Loading..." forever

**Cause:** Backend not running or API URL incorrect

**Solution:**
1. Check backend is running on port 5000
2. Verify `.env.local` has: `NEXT_PUBLIC_API_URL=http://localhost:5000/api`
3. Check browser console for errors

### Issue: "401 Unauthorized" errors

**Cause:** Not logged in or token expired

**Solution:**
1. Go to login page
2. Login with valid credentials
3. Try again

### Issue: "Network Error" or "Failed to fetch"

**Cause:** Backend not reachable

**Solution:**
1. Verify backend is running: `curl http://localhost:5000/api`
2. Check firewall settings
3. Restart backend server

### Issue: Toast notifications don't appear

**Cause:** Toaster component not configured (already fixed)

**Solution:**
Already fixed in `app/layout.jsx`. If still not working:
1. Clear browser cache
2. Restart dev server
3. Check browser console for errors

### Issue: Data doesn't update after CRUD operation

**Cause:** Page not refreshing data

**Solution:**
Already handled - hooks automatically refresh data after operations. If not working:
1. Check browser console for errors
2. Verify API call succeeded
3. Check network tab in DevTools

## 📊 Check Browser Console

Open browser DevTools (F12) and check:

### Console Tab
Should see:
```
📧 Attempting to send email... (if registering)
✅ Email sent successfully
```

Should NOT see:
```
❌ Error: ...
⚠️ Warning: ...
```

### Network Tab
Check API calls:
- `/api/attendance/today-status` - Should return 200
- `/api/leaves/my` - Should return 200
- `/api/users/getuser` - Should return 200

If you see 401: Login again
If you see 500: Check backend logs
If you see 404: Check API endpoint exists

## 📝 Backend Logs

Check backend terminal for:

**Good signs:**
```
✅ Email sent successfully
📧 Message ID: ...
=== Login Attempt ===
Login successful!
```

**Bad signs:**
```
❌ Failed to send email
Error: ...
Database connection failed
```

## ✅ Success Checklist

After testing, you should have:

- [x] Backend running on port 5000
- [x] Frontend running on port 3000
- [x] Can login successfully
- [x] Employee attendance page works
- [x] Can check-in and check-out
- [x] Employee leaves page works
- [x] Can apply for leave
- [x] Admin users page works
- [x] Can create/edit/delete users
- [x] Toast notifications appear
- [x] No console errors

## 🎯 Next Steps

Once everything is working:

1. **Update remaining pages** using these as templates
2. **Test each page** thoroughly
3. **Fix any issues** as they come up
4. **Deploy** when all pages are done

## 📚 Reference Documents

- **API Documentation:** `frontend/API_INTEGRATION_GUIDE.md`
- **Quick Reference:** `frontend/QUICK_REFERENCE.md`
- **Best Practices:** `frontend/BEST_PRACTICES.md`
- **Pages Fixed:** `PAGES_FIXED_SUMMARY.md`
- **Troubleshooting:** `backend/EMAIL_TROUBLESHOOTING.md`

## 🆘 Still Having Issues?

1. Check all documentation files above
2. Review browser console errors
3. Check backend terminal logs
4. Verify environment variables
5. Try restarting both servers
6. Clear browser cache and cookies

---

**Remember:** The three pages (attendance, leaves, users) are working examples. Use them as templates for the remaining pages!

**Happy coding! 🚀**
