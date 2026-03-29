# Best Practices for API Integration

## 🎯 General Principles

### 1. Always Handle Errors
```javascript
// ❌ Bad
const data = await userAPI.getUsers();

// ✅ Good
try {
  const data = await userAPI.getUsers();
  // Handle success
} catch (error) {
  console.error('Failed to fetch users:', error);
  toast.error(error.message);
}
```

### 2. Show Loading States
```javascript
// ❌ Bad
const data = await fetchData();
return <div>{data}</div>;

// ✅ Good
const { data, loading } = useData();

if (loading) return <LoadingSpinner />;
return <div>{data}</div>;
```

### 3. Validate User Input
```javascript
// ❌ Bad
await createUser(formData);

// ✅ Good
if (!formData.email || !isValidEmail(formData.email)) {
  setError('Invalid email');
  return;
}
await createUser(formData);
```

## 🔐 Authentication

### Token Management
```javascript
// ✅ Always check authentication before protected operations
useEffect(() => {
  const token = localStorage.getItem('token');
  if (!token) {
    router.push('/login');
  }
}, []);
```

### Logout Properly
```javascript
// ✅ Clear all user data on logout
const handleLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  router.push('/login');
};
```

## 📊 Data Fetching

### Use Hooks for Data Management
```javascript
// ✅ Encapsulate data fetching logic in hooks
const { users, loading, error, fetchUsers } = useUsers();

useEffect(() => {
  fetchUsers();
}, []);
```

### Avoid Fetching in Render
```javascript
// ❌ Bad - causes infinite loop
function Component() {
  fetchData(); // Don't do this!
  return <div>...</div>;
}

// ✅ Good - fetch in useEffect
function Component() {
  useEffect(() => {
    fetchData();
  }, []);
  return <div>...</div>;
}
```

### Handle Empty States
```javascript
// ✅ Always handle empty data
if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
if (data.length === 0) return <EmptyState />;
return <DataList data={data} />;
```

## 🎨 UI/UX

### Provide Feedback
```javascript
// ✅ Always give user feedback
const handleSubmit = async () => {
  try {
    await submitData();
    toast.success('Data saved successfully!');
  } catch (error) {
    toast.error('Failed to save data');
  }
};
```

### Disable Buttons During Loading
```javascript
// ✅ Prevent double submissions
<button
  onClick={handleSubmit}
  disabled={loading}
  className="disabled:opacity-50 disabled:cursor-not-allowed"
>
  {loading ? 'Saving...' : 'Save'}
</button>
```

### Show Progress
```javascript
// ✅ Show what's happening
const [status, setStatus] = useState('');

const handleUpload = async () => {
  setStatus('Uploading...');
  await upload();
  setStatus('Processing...');
  await process();
  setStatus('Complete!');
};
```

## 🔄 State Management

### Keep State Close to Usage
```javascript
// ✅ Local state for component-specific data
const [isOpen, setIsOpen] = useState(false);

// ✅ Context for global state
const { user } = useAuthContext();
```

### Avoid Prop Drilling
```javascript
// ❌ Bad - passing through many levels
<Parent user={user}>
  <Child user={user}>
    <GrandChild user={user} />
  </Child>
</Parent>

// ✅ Good - use context
<AuthProvider>
  <Parent>
    <Child>
      <GrandChild /> {/* Uses useAuthContext() */}
    </Child>
  </Parent>
</AuthProvider>
```

## 📝 Forms

### Controlled Components
```javascript
// ✅ Use controlled inputs
const [value, setValue] = useState('');

<input
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

### Form Validation
```javascript
// ✅ Validate before submission
const validate = () => {
  const errors = {};
  
  if (!formData.email) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(formData.email)) {
    errors.email = 'Invalid email format';
  }
  
  if (!formData.password || formData.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }
  
  return errors;
};

const handleSubmit = (e) => {
  e.preventDefault();
  
  const errors = validate();
  if (Object.keys(errors).length > 0) {
    setErrors(errors);
    return;
  }
  
  // Submit form
};
```

### Reset Form After Success
```javascript
// ✅ Clear form after successful submission
const handleSubmit = async () => {
  try {
    await submitData(formData);
    setFormData(initialState); // Reset form
    toast.success('Success!');
  } catch (error) {
    toast.error(error.message);
  }
};
```

## 🚀 Performance

### Debounce Search
```javascript
// ✅ Debounce expensive operations
import { debounce } from '@/lib/helpers';

const debouncedSearch = debounce((query) => {
  searchAPI(query);
}, 300);

<input onChange={(e) => debouncedSearch(e.target.value)} />
```

### Memoize Expensive Calculations
```javascript
// ✅ Use useMemo for expensive operations
const filteredData = useMemo(() => {
  return data.filter(item => item.status === 'active');
}, [data]);
```

### Lazy Load Components
```javascript
// ✅ Lazy load heavy components
const HeavyComponent = lazy(() => import('./HeavyComponent'));

<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

## 🔒 Security

### Sanitize User Input
```javascript
// ✅ Never trust user input
const sanitizedInput = input.trim().replace(/[<>]/g, '');
```

### Validate on Backend Too
```javascript
// ⚠️ Frontend validation is for UX only
// Always validate on backend for security
```

### Don't Store Sensitive Data
```javascript
// ❌ Bad
localStorage.setItem('password', password);

// ✅ Good - only store tokens
localStorage.setItem('token', token);
```

## 📱 Responsive Design

### Mobile-First Approach
```javascript
// ✅ Design for mobile first, then scale up
<div className="w-full md:w-1/2 lg:w-1/3">
  {/* Content */}
</div>
```

### Touch-Friendly Targets
```javascript
// ✅ Make buttons large enough for touch
<button className="min-h-[44px] min-w-[44px]">
  Click me
</button>
```

## 🧪 Testing

### Write Testable Code
```javascript
// ✅ Separate logic from UI
const calculateTotal = (items) => {
  return items.reduce((sum, item) => sum + item.price, 0);
};

function Component({ items }) {
  const total = calculateTotal(items);
  return <div>Total: {total}</div>;
}
```

### Mock API Calls in Tests
```javascript
// ✅ Mock API calls for predictable tests
jest.mock('@/lib/api', () => ({
  userAPI: {
    getUsers: jest.fn(() => Promise.resolve([]))
  }
}));
```

## 📊 Data Display

### Format Data Consistently
```javascript
// ✅ Use helper functions for formatting
import { formatDate, formatCurrency } from '@/lib/helpers';

<div>
  <p>{formatDate(order.date)}</p>
  <p>{formatCurrency(order.total)}</p>
</div>
```

### Handle Null/Undefined
```javascript
// ✅ Always handle missing data
<div>
  {user?.name || 'Unknown User'}
  {user?.email || 'No email'}
</div>
```

## 🎯 Code Organization

### Group Related Code
```javascript
// ✅ Keep related code together
// hooks/useUserManagement.js
export function useUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const fetchUsers = async () => { /* ... */ };
  const createUser = async () => { /* ... */ };
  const updateUser = async () => { /* ... */ };
  const deleteUser = async () => { /* ... */ };
  
  return { users, loading, fetchUsers, createUser, updateUser, deleteUser };
}
```

### Use Meaningful Names
```javascript
// ❌ Bad
const d = new Date();
const u = await getU();

// ✅ Good
const currentDate = new Date();
const user = await getUser();
```

### Keep Functions Small
```javascript
// ✅ One function, one purpose
const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validatePassword = (password) => {
  return password.length >= 8;
};

const validateForm = (formData) => {
  return validateEmail(formData.email) && 
         validatePassword(formData.password);
};
```

## 🔄 API Calls

### Use Async/Await
```javascript
// ✅ Async/await is cleaner than promises
const fetchData = async () => {
  try {
    const data = await api.getData();
    return data;
  } catch (error) {
    console.error(error);
  }
};
```

### Handle Race Conditions
```javascript
// ✅ Cancel outdated requests
useEffect(() => {
  let cancelled = false;
  
  const fetchData = async () => {
    const data = await api.getData();
    if (!cancelled) {
      setData(data);
    }
  };
  
  fetchData();
  
  return () => {
    cancelled = true;
  };
}, []);
```

### Batch API Calls
```javascript
// ✅ Fetch related data together
const loadPageData = async () => {
  const [users, departments, settings] = await Promise.all([
    userAPI.getUsers(),
    departmentAPI.getAll(),
    settingsAPI.get()
  ]);
  
  return { users, departments, settings };
};
```

## 🎨 Component Patterns

### Composition Over Inheritance
```javascript
// ✅ Compose components
<Card>
  <CardHeader>
    <CardTitle>Users</CardTitle>
  </CardHeader>
  <CardContent>
    <UserList />
  </CardContent>
</Card>
```

### Render Props for Flexibility
```javascript
// ✅ Use render props for flexible components
<DataFetcher
  url="/api/users"
  render={({ data, loading }) => (
    loading ? <Spinner /> : <UserList users={data} />
  )}
/>
```

### Custom Hooks for Logic Reuse
```javascript
// ✅ Extract reusable logic into hooks
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });
  
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  
  return [value, setValue];
}
```

## 📝 Comments and Documentation

### Write Self-Documenting Code
```javascript
// ✅ Code should be readable without comments
const isUserActive = user.status === 'active';
const canUserEdit = isUserActive && user.role === 'admin';

if (canUserEdit) {
  // Allow editing
}
```

### Comment Complex Logic
```javascript
// ✅ Explain why, not what
// Using exponential backoff to avoid overwhelming the server
// after multiple failed requests
const retryWithBackoff = async (fn, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000);
    }
  }
};
```

## 🚨 Error Handling

### Specific Error Messages
```javascript
// ✅ Provide helpful error messages
try {
  await createUser(userData);
} catch (error) {
  if (error.message.includes('email')) {
    toast.error('This email is already registered');
  } else if (error.message.includes('password')) {
    toast.error('Password does not meet requirements');
  } else {
    toast.error('Failed to create user. Please try again.');
  }
}
```

### Log Errors for Debugging
```javascript
// ✅ Log errors with context
try {
  await api.call();
} catch (error) {
  console.error('API call failed:', {
    error: error.message,
    endpoint: '/api/users',
    timestamp: new Date().toISOString()
  });
  throw error;
}
```

## 🎯 Summary

1. **Always handle errors and loading states**
2. **Validate user input**
3. **Provide clear feedback**
4. **Keep code organized and readable**
5. **Test your code**
6. **Optimize for performance**
7. **Think about security**
8. **Make it accessible**
9. **Document complex logic**
10. **Follow consistent patterns**

---

Remember: Good code is code that is easy to read, maintain, and debug. Write code for humans first, computers second.
