'use client';

import { Search } from 'lucide-react';

export default function UsersFilters({
  search, setSearch,
  filterRole, setFilterRole,
  filterDept, setFilterDept,
  roles, departments,
}) {
  return (
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
          {roles.filter(r => r.tier !== 'SUPER_ADMIN').map(role => (
            <option key={role.id} value={role.id}>{role.name}</option>
          ))}
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
  );
}
