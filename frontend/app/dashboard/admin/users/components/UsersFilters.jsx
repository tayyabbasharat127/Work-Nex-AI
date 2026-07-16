'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function UsersFilters({
  search, setSearch,
  filterRole, setFilterRole,
  filterDept, setFilterDept,
  roles, departments,
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          type="text"
          placeholder="Search users by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 rounded-xl pl-11"
        />
      </div>
      <div className="flex gap-3">
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="h-11 min-w-40 rounded-xl">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Roles</SelectItem>
            {roles.filter((r) => r.tier !== 'SUPER_ADMIN').map((role) => (
              <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="h-11 min-w-40 rounded-xl">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Departments</SelectItem>
            {Array.isArray(departments) && departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
