'use client';

export default function UsersStatsCards({ usersArray }) {
  return (
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
  );
}
