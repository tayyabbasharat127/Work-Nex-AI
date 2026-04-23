'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Users,
  CalendarX,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  Clock,
  TrendingUp,
  Bell,
  BookOpen,
  Shield,
  Brain,
  Zap,
  Database
} from 'lucide-react';

const ADMIN_MENU = [
  { label: 'Dashboard', href: '/dashboard/admin', icon: Home },
  { label: 'Analytics', href: '/dashboard/admin/analytics', icon: BarChart3 },
  { label: 'Users', href: '/dashboard/admin/users', icon: Users },
  { label: 'Attendance', href: '/dashboard/admin/attendance', icon: Clock },
  { label: 'Leaves', href: '/dashboard/admin/leaves', icon: CalendarX },
  { label: 'Departments', href: '/dashboard/admin/departments', icon: Users },
  { label: 'Reports', href: '/dashboard/admin/reports', icon: TrendingUp },
  { label: 'Forecast', href: '/dashboard/admin/forecast', icon: Zap },
  { label: 'AI Assistant', href: '/dashboard/admin/ai-chat', icon: Brain },
  { label: 'ETL Pipeline', href: '/dashboard/admin/etl', icon: Database },
  { label: 'Notifications', href: '/dashboard/admin/notifications', icon: Bell },
  { label: 'Logs', href: '/dashboard/admin/logs', icon: BookOpen },
  { label: 'Settings', href: '/dashboard/admin/settings', icon: Settings },
];

const MANAGER_MENU = [
  { label: 'Dashboard', href: '/dashboard/manager', icon: Home },
  { label: 'Team', href: '/dashboard/manager/team', icon: Users },
  { label: 'Attendance', href: '/dashboard/manager/attendance', icon: Clock },
  { label: 'Leaves', href: '/dashboard/manager/leaves', icon: CalendarX },
  { label: 'Performance', href: '/dashboard/manager/performance', icon: TrendingUp },
  { label: 'Settings', href: '/dashboard/manager/settings', icon: Settings },
];

const EMPLOYEE_MENU = [
  { label: 'Dashboard', href: '/dashboard/employee', icon: Home },
  { label: 'Attendance', href: '/dashboard/employee/attendance', icon: Clock },
  { label: 'My Leaves', href: '/dashboard/employee/leaves', icon: CalendarX },
  { label: 'Analytics', href: '/dashboard/employee/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/dashboard/employee/settings', icon: Settings },
];

export default function Sidebar({ role = 'admin' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const pathname = usePathname();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  const getMenuItems = () => {
    switch (role) {
      case 'manager':
        return MANAGER_MENU;
      case 'employee':
        return EMPLOYEE_MENU;
      default:
        return ADMIN_MENU;
    }
  };

  const menuItems = getMenuItems();

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-primary text-primary-foreground"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      } z-40`}>
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
              <span className="text-sidebar-primary-foreground font-bold">W</span>
            </div>
            <span className="text-lg font-bold text-sidebar-foreground">WorkNexAI</span>
          </Link>
        </div>

        {/* User Info */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sidebar-primary flex items-center justify-center">
              <Users size={20} className="text-sidebar-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">
                {user?.name || role.charAt(0).toUpperCase() + role.slice(1)}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email || `${role}@worknexai.com`}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-sidebar-accent scrollbar-track-transparent">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-destructive/20 transition"
          >
            <LogOut size={20} />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
