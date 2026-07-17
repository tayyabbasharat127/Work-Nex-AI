'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import PageHeader from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { getRoleName } from '@/lib/helpers';
import { formatJoiningDate, formatTenure } from '../helpers';
import { userAPI, attendanceAPI, leaveAPI } from '@/lib/api';
import { toast } from 'sonner';
import {
  ArrowLeft, Mail, Phone, Briefcase, IdCard, ClipboardList, UsersRound, ShieldCheck, Calendar,
  UserCheck, UserX, AlertTriangle, TrendingUp, CheckCircle2, XCircle, Clock3, UserX2, LogIn, LogOut,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const PENDING_STATUSES = ['PENDING', 'PENDING_MANAGER', 'PENDING_ADMIN'];

function EmptyChart({ loading, label }) {
  return (
    <div className="min-h-48 flex items-center justify-center border border-dashed border-border rounded-lg text-sm text-muted-foreground">
      {loading ? 'Loading...' : label}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-xl">
        {label && <p className="font-semibold text-foreground mb-2">{label}</p>}
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

function DetailField({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3.5">
      <div className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

const localDateInputValue = (date) => {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
};

const leaveStatusLabel = (status) => {
  if (PENDING_STATUSES.includes(status)) return 'Pending';
  return (status || '').charAt(0) + (status || '').slice(1).toLowerCase();
};

const leaveStatusBadgeClass = (status) => {
  if (status === 'APPROVED') return 'bg-success/20 text-success';
  if (status === 'REJECTED') return 'bg-destructive/20 text-destructive';
  if (PENDING_STATUSES.includes(status)) return 'bg-warning/20 text-warning';
  return 'bg-muted text-muted-foreground';
};

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [leaveSummary, setLeaveSummary] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [recentLeaves, setRecentLeaves] = useState([]);
  const [punchDate, setPunchDate] = useState(() => localDateInputValue(new Date()));
  const [punches, setPunches] = useState([]);
  const [punchesLoading, setPunchesLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setNotFound(false);
      const userResult = await userAPI.getById(id);
      setEmployee(userResult);

      const today = new Date();
      const start = new Date();
      start.setDate(today.getDate() - 29);

      const [attendanceRes, summaryRes, balancesRes, recentRes] = await Promise.allSettled([
        attendanceAPI.getForUser(id, { startDate: localDateInputValue(start), endDate: localDateInputValue(today), limit: 100 }),
        leaveAPI.getSummaryForUser(id),
        leaveAPI.getUserBalances(id),
        leaveAPI.getAll({ employeeId: id, limit: 5 }),
      ]);

      setAttendanceRecords(attendanceRes.status === 'fulfilled'
        ? (Array.isArray(attendanceRes.value) ? attendanceRes.value : (attendanceRes.value?.records || []))
        : []);
      setLeaveSummary(summaryRes.status === 'fulfilled' && Array.isArray(summaryRes.value) ? summaryRes.value : []);
      setLeaveBalances(balancesRes.status === 'fulfilled' && Array.isArray(balancesRes.value) ? balancesRes.value : []);
      setRecentLeaves(recentRes.status === 'fulfilled' && Array.isArray(recentRes.value) ? recentRes.value : []);

      const anyFailed = [attendanceRes, summaryRes, balancesRes, recentRes].some((r) => r.status === 'rejected');
      if (anyFailed) toast.error('Some data on this page failed to load');
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let active = true;
    setPunchesLoading(true);
    attendanceAPI.getPunchesForUser(id, punchDate)
      .then((result) => { if (active) setPunches(Array.isArray(result) ? result : []); })
      .catch(() => { if (active) setPunches([]); })
      .finally(() => { if (active) setPunchesLoading(false); });
    return () => { active = false; };
  }, [id, punchDate]);

  // Attendance stats (last 30 days)
  const presentCount = attendanceRecords.filter((r) => ['PRESENT', 'LATE'].includes(r.status)).length;
  const absentCount = attendanceRecords.filter((r) => r.status === 'ABSENT').length;
  const lateCount = attendanceRecords.filter((r) => r.status === 'LATE').length;
  const attendanceRate = attendanceRecords.length ? Math.round((presentCount / attendanceRecords.length) * 100) : 0;

  const attendanceStats = [
    { label: 'Present Days', value: presentCount, icon: UserCheck, iconClassName: 'bg-success/10 text-success' },
    { label: 'Absent Days', value: absentCount, icon: UserX, iconClassName: 'bg-destructive/10 text-destructive' },
    { label: 'Late Arrivals', value: lateCount, icon: AlertTriangle, iconClassName: 'bg-warning/10 text-warning' },
    { label: 'Attendance Rate', value: `${attendanceRate}%`, icon: TrendingUp, iconClassName: 'bg-info/10 text-info' },
  ];

  const dailyHours = [...attendanceRecords]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((r) => ({
      day: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      hours: r.workingHours ? Number(r.workingHours.toFixed(1)) : 0,
    }));

  const attendanceDistribution = [
    { name: 'Present', value: attendanceRecords.filter((r) => r.status === 'PRESENT').length, color: 'var(--success)' },
    { name: 'Late', value: lateCount, color: 'var(--warning)' },
    { name: 'Absent', value: absentCount, color: 'var(--destructive)' },
    { name: 'On Leave', value: attendanceRecords.filter((r) => r.status === 'ON_LEAVE').length, color: 'var(--info)' },
  ].filter((item) => item.value > 0);

  // Leave stats
  const leaveCountFor = (statuses) => leaveSummary
    .filter((s) => statuses.includes(s.status))
    .reduce((sum, s) => sum + (s._count?.status || 0), 0);
  const approvedCount = leaveCountFor(['APPROVED']);
  const rejectedCount = leaveCountFor(['REJECTED']);
  const pendingCount = leaveCountFor(PENDING_STATUSES);
  const daysUsed = leaveSummary.find((s) => s.status === 'APPROVED')?._sum?.totalDays || 0;

  const leaveStats = [
    { label: 'Approved', value: approvedCount, icon: CheckCircle2, iconClassName: 'bg-success/10 text-success' },
    { label: 'Pending', value: pendingCount, icon: Clock3, iconClassName: 'bg-warning/10 text-warning' },
    { label: 'Rejected', value: rejectedCount, icon: XCircle, iconClassName: 'bg-destructive/10 text-destructive' },
    { label: 'Days Used', value: daysUsed, icon: Calendar, iconClassName: 'bg-primary/10 text-primary' },
  ];

  const leaveDistribution = [
    { name: 'Approved', value: approvedCount, color: 'var(--success)' },
    { name: 'Pending', value: pendingCount, color: 'var(--warning)' },
    { name: 'Rejected', value: rejectedCount, color: 'var(--destructive)' },
  ].filter((item) => item.value > 0);

  if (notFound) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar role="admin" />
        <main className="flex-1 overflow-auto md:ml-64 p-6">
          <EmptyState
            icon={UserX2}
            title="Employee not found"
            description="This employee doesn't exist or you don't have access to view their profile."
            action={(
              <button onClick={() => router.push('/dashboard/admin/users')} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition">
                <ArrowLeft size={16} /> Back to Users
              </button>
            )}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />

      <main className="flex-1 overflow-auto md:ml-64">
        <PageHeader
          title={loading ? 'Loading…' : (employee?.name || 'Employee Profile')}
          description={employee ? [employee.designation, employee.department?.name].filter(Boolean).join(' • ') : undefined}
          breadcrumbs={[{ label: 'Users' }, { label: employee?.name || 'Employee' }]}
          actions={(
            <button onClick={() => router.push('/dashboard/admin/users')} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:bg-muted transition text-sm">
              <ArrowLeft size={16} /> Back to Users
            </button>
          )}
        />

        <div className="p-6 space-y-6">
          {/* Profile summary */}
          {loading ? (
            <Skeleton className="h-32 w-full rounded-xl" />
          ) : employee && (
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-4 mb-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground">
                  {employee.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-bold text-foreground">{employee.name}</h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{employee.roleName || getRoleName(employee.role_id)}</Badge>
                    <Badge className={employee.status === 'Active' ? 'border-transparent bg-success/20 text-success' : ''} variant={employee.status === 'Active' ? undefined : 'secondary'}>
                      {employee.status}
                    </Badge>
                    {formatTenure(employee.joiningDate) && (
                      <span className="text-xs text-muted-foreground">{formatTenure(employee.joiningDate)}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <DetailField icon={Mail} label="Email" value={employee.email} />
                <DetailField icon={Phone} label="Phone" value={employee.phone} />
                <DetailField icon={Briefcase} label="Designation" value={employee.designation} />
                <DetailField icon={IdCard} label="Employee ID" value={employee.employeeId} />
                <DetailField icon={ClipboardList} label="Department" value={employee.department?.name} />
                <DetailField icon={UsersRound} label="Manager" value={employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : null} />
                <DetailField icon={ShieldCheck} label="Staff Category" value={employee.staffCategory?.name} />
                <DetailField icon={Calendar} label="Joining Date" value={formatJoiningDate(employee.joiningDate)} />
              </div>
            </div>
          )}

          {/* Attendance section */}
          <div>
            <h3 className="text-lg font-bold mb-3">Attendance — Last 30 Days</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {attendanceStats.map((stat) => (
                <StatCard key={stat.label} {...stat} loading={loading} />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
                <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Daily Working Hours</h4>
                {dailyHours.length ? (
                  <div className="h-64 min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyHours} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                        <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="hours" name="Hours" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <EmptyChart loading={loading} label="No attendance records in the last 30 days" />}
              </div>

              <div className="bg-card border border-border rounded-xl p-6">
                <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Status Breakdown</h4>
                {attendanceDistribution.length ? (
                  <>
                    <div className="h-40 min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={attendanceDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value">
                            {attendanceDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {attendanceDistribution.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-xs text-muted-foreground">{item.name}: {item.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <EmptyChart loading={loading} label="No status data for this period" />}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 mt-6">
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h4 className="text-sm font-semibold text-muted-foreground">Punch Log</h4>
                <input
                  type="date"
                  value={punchDate}
                  onChange={(e) => setPunchDate(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                />
              </div>
              {punchesLoading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
              ) : punches.length === 0 ? (
                <EmptyChart loading={false} label="No punches recorded for this day" />
              ) : (
                <div className="space-y-2">
                  {punches.map((punch) => (
                    <div key={punch.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-2.5 text-sm">
                      {punch.type === 'IN' ? (
                        <LogIn size={16} className="text-success" />
                      ) : (
                        <LogOut size={16} className="text-warning" />
                      )}
                      <span className="font-medium">{punch.type === 'IN' ? 'Check-in' : 'Check-out'}</span>
                      <span className="ml-auto text-muted-foreground">
                        {new Date(punch.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Leave section */}
          <div>
            <h3 className="text-lg font-bold mb-3">Leave Utilization</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {leaveStats.map((stat) => (
                <StatCard key={stat.label} {...stat} loading={loading} />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-card border border-border rounded-xl p-6">
                <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Request Status</h4>
                {leaveDistribution.length ? (
                  <div className="h-48 min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={leaveDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {leaveDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : <EmptyChart loading={loading} label="No leave requests found" />}
              </div>

              <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
                <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Leave Balances ({new Date().getFullYear()})</h4>
                {leaveBalances.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {leaveBalances.map((balance) => (
                      <div key={balance.id} className="rounded-xl border border-border/60 bg-muted/30 p-3.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-foreground">{balance.policy?.leaveType || 'Leave'}</span>
                          <span className="text-xs text-muted-foreground">{balance.remainingDays}/{balance.totalDays} left</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${balance.totalDays ? Math.min(100, (balance.usedDays / balance.totalDays) * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <EmptyChart loading={loading} label="No leave balances configured" />}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden mt-6">
              <div className="p-4 border-b border-border">
                <h4 className="text-sm font-semibold text-muted-foreground">Recent Leave Requests</h4>
              </div>
              {loading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Loading...</div>
              ) : recentLeaves.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No leave requests yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="text-left py-3 px-6 font-semibold">Type</th>
                        <th className="text-left py-3 px-6 font-semibold">Dates</th>
                        <th className="text-left py-3 px-6 font-semibold">Days</th>
                        <th className="text-left py-3 px-6 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {recentLeaves.map((leave) => (
                        <tr key={leave.id} className="hover:bg-muted/30 transition">
                          <td className="py-3 px-6 font-medium">{leave.otherLeaveName || leave.leaveType}</td>
                          <td className="py-3 px-6 text-muted-foreground">
                            {new Date(leave.startDate).toLocaleDateString()} – {new Date(leave.endDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-6">{leave.totalDays}</td>
                          <td className="py-3 px-6">
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${leaveStatusBadgeClass(leave.status)}`}>
                              {leaveStatusLabel(leave.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
