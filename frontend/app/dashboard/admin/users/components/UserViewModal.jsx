'use client';

import { X, Mail, Phone, Briefcase, IdCard, ClipboardList, UsersRound, ShieldCheck, Calendar } from 'lucide-react';
import { getRoleName } from '@/lib/helpers';
import { formatJoiningDate, formatTenure } from '../helpers';

function DetailField({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/60">
      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-sm mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
}

export default function UserViewModal({ open, user, departments, onClose }) {
  if (!open || !user) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header banner — avatar/name live inside the banner itself,
            not overlapping its edge, so there's no fragile negative-margin
            positioning to break. */}
        <div className="relative bg-gradient-to-br from-primary to-primary/70 px-6 pt-5 pb-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition"
          >
            <X size={20} />
          </button>
          <p className="text-primary-foreground/70 text-xs font-semibold uppercase tracking-wide mb-4">User Details</p>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-foreground/15 border border-primary-foreground/25 flex items-center justify-center text-primary-foreground font-bold text-xl shrink-0">
              {user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-primary-foreground truncate">{user.name}</h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-primary-foreground/15 text-primary-foreground text-xs font-semibold">
                  {user.roleName || getRoleName(user.role_id)}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.status === 'Active' ? 'bg-success/90 text-success-foreground' : 'bg-primary-foreground/20 text-primary-foreground'
                }`}>
                  {user.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pt-5 pb-6 overflow-y-auto">
          {formatTenure(user.joiningDate) && (
            <p className="text-xs text-muted-foreground mb-4">{formatTenure(user.joiningDate)}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <DetailField icon={Mail} label="Email" value={user.email} />
            <DetailField icon={Phone} label="Phone" value={user.phone} />
            <DetailField icon={Briefcase} label="Designation" value={user.designation} />
            <DetailField icon={IdCard} label="Employee ID" value={user.employeeId} />
            <DetailField
              icon={ClipboardList}
              label="Department"
              value={user.department?.name || departments.find(d => d.id === user.department_id)?.name}
            />
            <DetailField icon={UsersRound} label="Manager" value={user.manager ? `${user.manager.firstName} ${user.manager.lastName}` : null} />
            <DetailField icon={ShieldCheck} label="Staff Category" value={user.staffCategory?.name} />
            <DetailField icon={Calendar} label="Joining Date" value={formatJoiningDate(user.joiningDate)} />
          </div>
        </div>
      </div>
    </div>
  );
}
