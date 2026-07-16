'use client';

import { Users, UserCheck, ShieldCheck, User } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';

export default function UsersStatsCards({ usersArray }) {
  const stats = [
    { label: 'Total Users', value: usersArray.length, icon: Users, iconClassName: 'bg-primary/10 text-primary' },
    { label: 'Active', value: usersArray.filter((u) => u.status === 'Active').length, icon: UserCheck, iconClassName: 'bg-success/10 text-success' },
    { label: 'Managers', value: usersArray.filter((u) => u.role_id === 2).length, icon: ShieldCheck, iconClassName: 'bg-accent/10 text-accent-foreground' },
    { label: 'Employees', value: usersArray.filter((u) => u.role_id === 3).length, icon: User, iconClassName: 'bg-info/10 text-info' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} iconClassName={stat.iconClassName} />
      ))}
    </div>
  );
}
