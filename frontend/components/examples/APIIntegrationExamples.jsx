// Example components showing how to integrate with the API
// These are reference examples - copy and adapt as needed

import { useState, useEffect } from 'react';
import { useUsers } from '@/hooks/useUsers';
import { useAttendance } from '@/hooks/useAttendance';
import { useLeaves } from '@/hooks/useLeaves';
import { formatDate, formatTime, getStatusColor } from '@/lib/helpers';
import { toast } from 'sonner';

// Example 1: Simple Data Fetching
export function UsersList() {
  const { users, loading, error, fetchUsers } = useUsers();

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) return <div>Loading users...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Users</h2>
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.name} - {user.email}</li>
        ))}
      </ul>
    </div>
  );
}

// Example 2: Data Table with Actions
export function UsersTable() {
  const { users, loading, fetchUsers, deleteUser } = useUsers();
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure?')) return;
    
    setDeleting(userId);
    try {
      await deleteUser(userId);
      toast.success('User deleted successfully');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-4">Name</th>
            <th className="text-left p-4">Email</th>
            <th className="text-left p-4">Role</th>
            <th className="text-left p-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={4} className="text-center p-8">Loading...</td>
            </tr>
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center p-8">No users found</td>
            </tr>
          ) : (
            users.map(user => (
              <tr key={user.id} className="border-t border-border">
                <td className="p-4">{user.name}</td>
                <td className="p-4">{user.email}</td>
                <td className="p-4">{user.role}</td>
                <td className="p-4">
                  <button
                    onClick={() => handleDelete(user.id)}
                    disabled={deleting === user.id}
                    className="text-destructive hover:underline disabled:opacity-50"
                  >
                    {deleting === user.id ? 'Deleting...' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// Example 3: Form with API Integration
export function CreateUserForm({ onSuccess }) {
  const { createUser } = useUsers();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 3,
    departmentId: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createUser(formData);
      toast.success('User created successfully');
      setFormData({ name: '', email: '', password: '', role: 3, departmentId: '' });
      onSuccess?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className="w-full px-4 py-2 rounded-lg border border-border"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          className="w-full px-4 py-2 rounded-lg border border-border"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Password</label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          className="w-full px-4 py-2 rounded-lg border border-border"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create User'}
      </button>
    </form>
  );
}

// Example 4: Attendance Check-in/out
export function AttendanceControls() {
  const { todayStatus, loading, checkIn, checkOut, fetchTodayStatus } = useAttendance();
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  useEffect(() => {
    fetchTodayStatus();
  }, []);

  useEffect(() => {
    if (todayStatus) {
      setIsCheckedIn(todayStatus.checkIn && !todayStatus.checkOut);
    }
  }, [todayStatus]);

  const handleCheckIn = async () => {
    try {
      await checkIn();
      toast.success('Checked in successfully!');
      setIsCheckedIn(true);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCheckOut = async () => {
    try {
      await checkOut();
      toast.success('Checked out successfully!');
      setIsCheckedIn(false);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-bold mb-4">Attendance</h3>
      
      {todayStatus && (
        <div className="mb-4 space-y-2">
          <p>Check In: {formatTime(todayStatus.checkIn)}</p>
          <p>Check Out: {formatTime(todayStatus.checkOut)}</p>
        </div>
      )}

      <div className="flex gap-3">
        {!isCheckedIn ? (
          <button
            onClick={handleCheckIn}
            disabled={loading}
            className="px-6 py-2 bg-success text-white rounded-lg hover:bg-success/90 disabled:opacity-50"
          >
            Check In
          </button>
        ) : (
          <button
            onClick={handleCheckOut}
            disabled={loading}
            className="px-6 py-2 bg-destructive text-white rounded-lg hover:bg-destructive/90 disabled:opacity-50"
          >
            Check Out
          </button>
        )}
      </div>
    </div>
  );
}

// Example 5: Leave Application Form
export function LeaveApplicationForm({ onSuccess }) {
  const { createLeave } = useLeaves();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    type: 'Annual'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createLeave(formData);
      toast.success('Leave application submitted');
      setFormData({ startDate: '', endDate: '', reason: '', type: 'Annual' });
      onSuccess?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Leave Type</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          className="w-full px-4 py-2 rounded-lg border border-border"
        >
          <option value="Annual">Annual Leave</option>
          <option value="Sick">Sick Leave</option>
          <option value="Personal">Personal Leave</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Start Date</label>
        <input
          type="date"
          value={formData.startDate}
          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          required
          className="w-full px-4 py-2 rounded-lg border border-border"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">End Date</label>
        <input
          type="date"
          value={formData.endDate}
          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          required
          className="w-full px-4 py-2 rounded-lg border border-border"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Reason</label>
        <textarea
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          required
          rows={4}
          className="w-full px-4 py-2 rounded-lg border border-border"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Apply for Leave'}
      </button>
    </form>
  );
}

// Example 6: Status Badge Component
export function StatusBadge({ status }) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {status}
    </span>
  );
}

// Example 7: Refresh Button
export function RefreshButton({ onRefresh, loading }) {
  return (
    <button
      onClick={onRefresh}
      disabled={loading}
      className="px-4 py-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50"
    >
      {loading ? 'Refreshing...' : 'Refresh'}
    </button>
  );
}

// Example 8: Search and Filter
export function SearchAndFilter({ onSearch, onFilter }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const handleSearch = (value) => {
    setSearch(value);
    onSearch(value);
  };

  const handleFilter = (value) => {
    setFilter(value);
    onFilter(value);
  };

  return (
    <div className="flex gap-4">
      <input
        type="text"
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search..."
        className="flex-1 px-4 py-2 rounded-lg border border-border"
      />
      
      <select
        value={filter}
        onChange={(e) => handleFilter(e.target.value)}
        className="px-4 py-2 rounded-lg border border-border"
      >
        <option value="all">All</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>
  );
}

// Example 9: Pagination
export function Pagination({ currentPage, totalPages, onPageChange }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-4 py-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50"
      >
        Previous
      </button>
      
      <span className="px-4 py-2">
        Page {currentPage} of {totalPages}
      </span>
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-4 py-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}

// Example 10: Error Display
export function ErrorDisplay({ error, onRetry }) {
  if (!error) return null;

  return (
    <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
      <p className="text-destructive mb-2">{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-destructive hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}

// Example 11: Loading Skeleton
export function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-muted rounded w-3/4"></div>
      <div className="h-4 bg-muted rounded w-1/2"></div>
      <div className="h-4 bg-muted rounded w-5/6"></div>
    </div>
  );
}

// Example 12: Modal with API Call
export function DeleteConfirmModal({ isOpen, onClose, onConfirm, itemName }) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-bold mb-4">Confirm Delete</h3>
        <p className="mb-6">Are you sure you want to delete {itemName}?</p>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-destructive text-white rounded-lg hover:bg-destructive/90 disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
