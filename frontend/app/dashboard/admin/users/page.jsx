'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Search, Plus, Eye, Edit, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { departmentAPI } from '@/lib/api';
import { getRoleName } from '@/lib/helpers';
import { toast } from 'sonner';

export default function AdminUsers() {
  const { users, loading, fetchUsers, createUser, updateUser, deleteUser } = useUsers();
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [filterRole, setFilterRole] = useState('All');
  const [filterDept, setFilterDept] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role_id: 3,
    department_id: '',
    manager_id: '',
    designation: '',
    phone: '',
    joiningDate: '',
    status: 'Active',
  });

  async function loadData() {
    try {
      await fetchUsers();
      const depts = await departmentAPI.getAll();
      setDepartments(Array.isArray(depts) ? depts : []);
    } catch (err) {
      toast.error('Failed to load data');
      setDepartments([]);
    }
  }

  useEffect(() => {
    const loadTimer = setTimeout(loadData, 0);
    return () => clearTimeout(loadTimer);
  }, []);

  // Ensure users is always an array
  const usersArray = Array.isArray(users) ? users : [];

  const filteredUsers = usersArray.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === 'All' || user.role_id === parseInt(filterRole);
    const matchesDept = filterDept === 'All' || user.department_id === filterDept;
    return matchesSearch && matchesRole && matchesDept;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({ 
      name: '', 
      email: '', 
      password: '', 
      role_id: 3, 
      department_id: '', 
      manager_id: '',
      designation: '',
      phone: '',
      joiningDate: '',
      status: 'Active' 
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role_id: user.role_id || 3,
      department_id: user.department_id || '',
      manager_id: user.manager_id || '',
      designation: user.designation || '',
      phone: user.phone || '',
      joiningDate: user.joiningDate ? new Date(user.joiningDate).toISOString().split('T')[0] : '',
      status: user.status || 'Active'
    });
    setShowModal(true);
  };

  const handleOpenViewModal = (user) => {
    setViewingUser(user);
    setShowViewModal(true);
  };

  const handleOpenDeleteModal = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingUser) {
        await updateUser(editingUser.user_id || editingUser.id, formData);
        toast.success('User updated successfully');
      } else {
        await createUser(formData);
        toast.success('User created successfully');
      }
      setShowModal(false);
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteUser(userToDelete.user_id || userToDelete.id);
      toast.success('User deleted successfully');
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete user');
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />

      <main className="flex-1 overflow-auto md:ml-64">
        {/* Header */}
        <div className="sticky top-0 bg-card/80 backdrop-blur-xl border-b border-border p-6 z-20">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">User Management</h1>
              <p className="text-muted-foreground mt-1">Manage all users in your organization</p>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition font-medium"
            >
              <Plus size={20} />
              Add User
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:border-primary"
              >
                <option value="All">All Roles</option>
                <option value="1">Admin</option>
                <option value="2">Manager</option>
                <option value="3">Employee</option>
              </select>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:border-primary"
              >
                <option value="All">All Departments</option>
                {Array.isArray(departments) && departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-muted-foreground text-sm">Total Users</p>
              <p className="text-2xl font-bold text-primary">{usersArray.length}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-muted-foreground text-sm">Active</p>
              <p className="text-2xl font-bold text-success">{usersArray.filter(u => u.status === 'Active').length}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-muted-foreground text-sm">Managers</p>
              <p className="text-2xl font-bold text-accent">{usersArray.filter(u => u.role_id === 2).length}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-muted-foreground text-sm">Employees</p>
              <p className="text-2xl font-bold text-primary">{usersArray.filter(u => u.role_id === 3).length}</p>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading users...</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="text-left py-4 px-6 font-semibold">User</th>
                        <th className="text-left py-4 px-6 font-semibold">Role</th>
                        <th className="text-left py-4 px-6 font-semibold">Department</th>
                        <th className="text-center py-4 px-6 font-semibold">Status</th>
                        <th className="text-left py-4 px-6 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {paginatedUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-muted/30 transition">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                                {user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                              </div>
                              <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-muted-foreground text-xs">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                              user.role_id === 1 ? 'bg-red-500/20 text-red-500' :
                              user.role_id === 2 ? 'bg-green-500/20 text-green-500' :
                              user.role_id === 3 ? 'bg-yellow-500/20 text-yellow-500' :
                              'bg-blue-500/20 text-blue-500'
                            }`}>
                              {getRoleName(user.role_id)}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-muted-foreground">
                            {departments.find(d => d.id === user.department_id)?.name || 'N/A'}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-medium ${
                              user.status === 'Active' 
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {user.status}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => handleOpenViewModal(user)}
                                className="p-2 hover:bg-primary/10 rounded-lg transition group"
                              >
                                <Eye size={16} className="text-muted-foreground group-hover:text-primary" />
                              </button>
                              <button 
                                onClick={() => handleOpenEditModal(user)}
                                className="p-2 hover:bg-accent/10 rounded-lg transition group"
                              >
                                <Edit size={16} className="text-muted-foreground group-hover:text-accent" />
                              </button>
                              <button 
                                onClick={() => handleOpenDeleteModal(user)}
                                className="p-2 hover:bg-destructive/10 rounded-lg transition group"
                              >
                                <Trash2 size={16} className="text-muted-foreground group-hover:text-destructive" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                            currentPage === page 
                              ? 'bg-primary text-primary-foreground' 
                              : 'hover:bg-muted'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-bold">{editingUser ? 'Edit User' : 'Add New User'}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-muted rounded-lg transition">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                    placeholder="Enter email address"
                  />
                </div>
                {!editingUser && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Password</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                      placeholder="Enter password (optional)"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave empty to auto-generate. User will receive password via email.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Role</label>
                    <select
                      value={formData.role_id}
                      onChange={(e) => setFormData({ ...formData, role_id: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                    >
                      <option value={1}>Admin</option>
                      <option value={2}>Manager</option>
                      <option value={3}>Employee</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Department</label>
                    <select
                      value={formData.department_id}
                      onChange={(e) => setFormData({ ...formData, department_id: e.target.value || '' })}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                    >
                      <option value="">Select Department</option>
                      {Array.isArray(departments) && departments.map(dept => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Designation</label>
                    <input
                      type="text"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                      placeholder="e.g. Senior Developer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                      placeholder="+92 300 1234567"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Manager</label>
                    <select
                      value={formData.manager_id}
                      onChange={(e) => setFormData({ ...formData, manager_id: e.target.value || '' })}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                    >
                      <option value="">No Manager</option>
                      {Array.isArray(users) && users
                        .filter(u => [0, 1, 2].includes(u.role_id) && u.id !== editingUser?.id)
                        .map(manager => (
                          <option key={manager.id} value={manager.id}>
                            {manager.name} ({getRoleName(manager.role_id)})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Joining Date</label>
                    <input
                      type="date"
                      value={formData.joiningDate}
                      onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-border hover:bg-muted transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : editingUser ? 'Update User' : 'Add User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Modal */}
        {showViewModal && viewingUser && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-bold">User Details</h2>
                <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-muted rounded-lg transition">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                    {viewingUser.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{viewingUser.name}</h3>
                    <p className="text-muted-foreground">{getRoleName(viewingUser.role_id)}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between py-3 border-b border-border">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium">{viewingUser.email}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-border">
                    <span className="text-muted-foreground">Department</span>
                    <span className="font-medium">
                      {departments.find(d => d.id === viewingUser.department_id)?.name || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-muted-foreground">Status</span>
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      viewingUser.status === 'Active' ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
                    }`}>
                      {viewingUser.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && userToDelete && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl p-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} className="text-destructive" />
                </div>
                <h2 className="text-xl font-bold mb-2">Delete User</h2>
                <p className="text-muted-foreground mb-6">
                  Are you sure you want to delete <span className="font-semibold text-foreground">{userToDelete.name}</span>? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-border hover:bg-muted transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="flex-1 px-4 py-3 rounded-xl bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 transition disabled:opacity-50"
                  >
                    {loading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
