'use client';

import Link from 'next/link';
import { Eye, Edit, Trash2, Users as UsersIcon } from 'lucide-react';
import { getRoleName } from '@/lib/helpers';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

const ROLE_BADGE_VARIANT = { 1: 'destructive', 2: 'success', 3: 'warning', 4: 'info' };

export default function UsersTable({ loading, paginatedUsers, departments, onView, onEdit, onDelete }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="px-6 py-3">User</TableHead>
          <TableHead className="px-6 py-3">Role</TableHead>
          <TableHead className="px-6 py-3">Department</TableHead>
          <TableHead className="px-6 py-3 text-center">Status</TableHead>
          <TableHead className="px-6 py-3">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell className="px-6 py-4"><Skeleton className="h-10 w-40 rounded-lg" /></TableCell>
              <TableCell className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-lg" /></TableCell>
              <TableCell className="px-6 py-4"><Skeleton className="h-4 w-24 rounded-lg" /></TableCell>
              <TableCell className="px-6 py-4"><Skeleton className="mx-auto h-6 w-16 rounded-lg" /></TableCell>
              <TableCell className="px-6 py-4"><Skeleton className="h-8 w-20 rounded-lg" /></TableCell>
            </TableRow>
          ))
        ) : paginatedUsers.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5}>
              <EmptyState icon={UsersIcon} title="No users found" description="Try adjusting your search or filters." />
            </TableCell>
          </TableRow>
        ) : paginatedUsers.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="px-6 py-4">
              <Link href={`/dashboard/admin/users/${user.id}`} className="flex items-center gap-3 group w-fit">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                  {user.name?.split(' ').map((n) => n[0]).join('').toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-medium text-foreground group-hover:text-primary group-hover:underline">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </Link>
            </TableCell>
            <TableCell className="px-6 py-4">
              <Badge variant={ROLE_BADGE_VARIANT[user.role_id] || 'secondary'}>
                {user.roleName || getRoleName(user.role_id)}
              </Badge>
            </TableCell>
            <TableCell className="px-6 py-4 text-muted-foreground">
              {departments.find((d) => d.id === user.department_id)?.name || 'N/A'}
            </TableCell>
            <TableCell className="px-6 py-4 text-center">
              <Badge variant={user.status === 'Active' ? 'success' : 'secondary'}>{user.status}</Badge>
            </TableCell>
            <TableCell className="px-6 py-4">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => onView(user)} className="hover:bg-primary/10 hover:text-primary">
                  <Eye size={16} />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => onEdit(user)} className="hover:bg-accent hover:text-accent-foreground">
                  <Edit size={16} />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => onDelete(user)} className="hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 size={16} />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
