'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Plus } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { departmentAPI, rolesAPI, staffCategoryAPI } from '@/lib/api';
import { toast } from 'sonner';

import UsersFilters from './components/UsersFilters';
import UsersStatsCards from './components/UsersStatsCards';
import UsersTable from './components/UsersTable';
import UsersPagination from './components/UsersPagination';
import UserFormModal from './components/UserFormModal';
import UserViewModal from './components/UserViewModal';
import DeleteUserModal from './components/DeleteUserModal';

export default function AdminUsers() {
  const { users, loading, fetchUsers, createUser, updateUser, deleteUser } = useUsers();
  const [departments, setDepartments] = useState([]);
  const [staffCategories, setStaffCategories] = useState([]);
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    roleId: '',
    department_id: '',
    staff_category_id: '',
    manager_id: '',
    designation: '',
    phone: '',
    joiningDate: '',
    status: 'Active',
  });

  const defaultRoleId = () => roles.find(r => r.tier === 'EMPLOYEE' && r.isSystem)?.id || '';

  async function loadData() {
    try {
      await fetchUsers();
      const depts = await departmentAPI.getAll();
      setDepartments(Array.isArray(depts) ? depts : []);
      const categories = await staffCategoryAPI.getAll();
      setStaffCategories(Array.isArray(categories) ? categories : []);
      const roleList = await rolesAPI.getAll();
      setRoles(Array.isArray(roleList) ? roleList : []);
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
    const matchesRole = filterRole === 'All' || user.roleId === filterRole;
    const matchesDept = filterDept === 'All' || user.department_id === filterDept;
    return matchesSearch && matchesRole && matchesDept;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setShowPassword(false);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      roleId: defaultRoleId(),
      department_id: '',
      staff_category_id: '',
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
    setShowPassword(false);
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email,
      password: '',
      roleId: user.roleId || defaultRoleId(),
      department_id: user.department_id || '',
      staff_category_id: user.staff_category_id || '',
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
          <UsersFilters
            search={search} setSearch={setSearch}
            filterRole={filterRole} setFilterRole={setFilterRole}
            filterDept={filterDept} setFilterDept={setFilterDept}
            roles={roles} departments={departments}
          />

          <UsersStatsCards usersArray={usersArray} />

          {/* Users Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <UsersTable
              loading={loading}
              paginatedUsers={paginatedUsers}
              departments={departments}
              onView={handleOpenViewModal}
              onEdit={handleOpenEditModal}
              onDelete={handleOpenDeleteModal}
            />
            {!loading && (
              <UsersPagination
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                filteredCount={filteredUsers.length}
              />
            )}
          </div>
        </div>

        <UserFormModal
          open={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          editingUser={editingUser}
          loading={loading}
          formData={formData}
          setFormData={setFormData}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          roles={roles}
          departments={departments}
          staffCategories={staffCategories}
          users={users}
        />

        <UserViewModal
          open={showViewModal}
          user={viewingUser}
          departments={departments}
          onClose={() => setShowViewModal(false)}
        />

        <DeleteUserModal
          open={showDeleteModal}
          user={userToDelete}
          loading={loading}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
        />
      </main>
    </div>
  );
}
