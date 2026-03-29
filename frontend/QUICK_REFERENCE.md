# Quick Reference Guide - API Integration

## 🚀 Getting Started

### Start Backend
```bash
cd backend
node Server.js
```

### Start Frontend
```bash
cd frontend
npm run dev
```

## 📦 Import Statements

```javascript
// API Client
import { authAPI, attendanceAPI, leaveAPI, userAPI, departmentAPI, analyticsAPI, reportsAPI, organizationSettingsAPI } from '@/lib/api';

// Hooks
import { useAuth } from '@/hooks/useAuth';
import { useAttendance } from '@/hooks/useAttendance';
import { useLeaves } from '@/hooks/useLeaves';
import { useUsers } from '@/hooks/useUsers';

// Context
import { useAuthContext } from '@/contexts/AuthContext';

// Helpers
import { formatDate, formatTime, calculateHours, getRoleName, getStatusColor } from '@/lib/helpers';
```

## 🔐 Authentication

### Login
```javascript
const { login } = useAuth();

try {
  const data = await login(email, password);
  router.push(`/dashboard/${getRolePath(data.user.role)}`);
} catch (err) {
  setError(err.message);
}
```

### Logout
```javascript
const { logout } = useAuth();
logout(); // Clears tokens and redirects to login
```

### Check Auth Status
```javascript
const { user, isAuthenticated } = useAuth();

if (!isAuthenticated) {
  router.push('/login');
}
```

## 👥 User Management

### Fetch Users
```javascript
const { users, loading, fetchUsers } = useUsers();

useEffect(() => {
  fetchUsers({ role: 3 }); // Optional filters
}, []);
```

### Create User
```javascript
const { createUser } = useUsers();

await createUser({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'password123',
  role: 3,
  departmentId: 1
});
```

### Update User
```javascript
const { updateUser } = useUsers();

await updateUser(userId, {
  name: 'Jane Doe',
  email: 'jane@example.com'
});
```

### Delete User
```javascript
const { deleteUser } = useUsers();

await deleteUser(userId);
```

## 📅 Attendance

### Check In/Out
```javascript
const { checkIn, checkOut } = useAttendance();

await checkIn();
await checkOut();
```

### Get Today's Status
```javascript
const { todayStatus, fetchTodayStatus } = useAttendance();

useEffect(() => {
  fetchTodayStatus();
}, []);

// Access data
console.log(todayStatus.checkIn);
console.log(todayStatus.checkOut);
```

### Get History
```javascript
const { history, fetchHistory } = useAttendance();

await fetchHistory({ 
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  limit: 30 
});
```

## 🏖️ Leave Management

### Apply for Leave
```javascript
const { createLeave } = useLeaves();

await createLeave({
  startDate: '2024-03-20',
  endDate: '2024-03-22',
  reason: 'Vacation',
  type: 'Annual'
});
```

### Get My Leaves
```javascript
const { leaves, fetchMyLeaves } = useLeaves();

useEffect(() => {
  fetchMyLeaves();
}, []);
```

### Update Leave Status (Admin)
```javascript
const { updateLeaveStatus } = useLeaves();

await updateLeaveStatus(leaveId, 'Approved', 'Enjoy your vacation!');
```

## 🏢 Departments

### Get All Departments
```javascript
const data = await departmentAPI.getAll();
```

### Create Department
```javascript
await departmentAPI.create({
  name: 'Engineering',
  description: 'Software development team'
});
```

## 📊 Analytics

### Get KPIs
```javascript
const kpis = await analyticsAPI.getKPIs({
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});
```

### Get Trends
```javascript
const trends = await analyticsAPI.getTrends({
  period: 'monthly'
});
```

## 🎨 UI Helpers

### Format Date/Time
```javascript
import { formatDate, formatTime, formatDateTime } from '@/lib/helpers';

formatDate('2024-03-20'); // "Mar 20, 2024"
formatTime('2024-03-20T08:30:00'); // "08:30 AM"
formatDateTime('2024-03-20T08:30:00'); // "Mar 20, 2024, 08:30 AM"
```

### Calculate Hours
```javascript
import { calculateHours } from '@/lib/helpers';

calculateHours(checkIn, checkOut); // "9h 30m"
```

### Status Colors
```javascript
import { getStatusColor } from '@/lib/helpers';

<span className={getStatusColor('Present')}>
  Present
</span>
```

### Role Names
```javascript
import { getRoleName, getRolePath } from '@/lib/helpers';

getRoleName(3); // "Employee"
getRolePath(3); // "employee"
```

## 🎯 Common Patterns

### Loading State
```javascript
const { data, loading, error, fetchData } = useHook();

if (loading) return <Spinner />;
if (error) return <Error message={error} />;
return <Content data={data} />;
```

### Form Submission
```javascript
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');
  
  try {
    await apiCall(formData);
    toast.success('Success!');
  } catch (err) {
    setError(err.message);
    toast.error(err.message);
  } finally {
    setLoading(false);
  }
};
```

### Data Fetching on Mount
```javascript
useEffect(() => {
  const loadData = async () => {
    try {
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };
  
  loadData();
}, []);
```

### Protected Route
```javascript
useEffect(() => {
  const token = localStorage.getItem('token');
  if (!token) {
    router.push('/login');
  }
}, []);
```

## 🔧 Troubleshooting

### Check Token
```javascript
const token = localStorage.getItem('token');
console.log('Token:', token);
```

### Check User
```javascript
const user = JSON.parse(localStorage.getItem('user'));
console.log('User:', user);
```

### Clear Storage
```javascript
localStorage.clear();
```

### API Base URL
```javascript
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
```

## 📱 Toast Notifications

```javascript
import { toast } from 'sonner';

toast.success('Operation successful!');
toast.error('Operation failed!');
toast.info('Information message');
toast.warning('Warning message');
```

## 🎨 Status Badge Component

```javascript
function StatusBadge({ status }) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {status}
    </span>
  );
}
```

## 📋 Table with API Data

```javascript
function DataTable() {
  const { data, loading, fetchData } = useHook();
  
  useEffect(() => {
    fetchData();
  }, []);
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <table>
      <thead>
        <tr>
          <th>Column 1</th>
          <th>Column 2</th>
        </tr>
      </thead>
      <tbody>
        {data.map(item => (
          <tr key={item.id}>
            <td>{item.field1}</td>
            <td>{item.field2}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

## 🔄 Refresh Data

```javascript
const { fetchData } = useHook();

const handleRefresh = async () => {
  await fetchData();
  toast.success('Data refreshed!');
};
```

## 📝 Form with Validation

```javascript
const [formData, setFormData] = useState({});
const [errors, setErrors] = useState({});

const validate = () => {
  const newErrors = {};
  
  if (!formData.email) {
    newErrors.email = 'Email is required';
  } else if (!isValidEmail(formData.email)) {
    newErrors.email = 'Invalid email format';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!validate()) return;
  
  // Submit form
};
```

---

For more details, see:
- `API_INTEGRATION_GUIDE.md` - Complete API documentation
- `INTEGRATION_README.md` - Setup and architecture guide
