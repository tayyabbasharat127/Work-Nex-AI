'use client';

import { X, Mail, Phone, Briefcase, IdCard, ClipboardList, UsersRound, ShieldCheck, Calendar } from 'lucide-react';
import { getRoleName } from '@/lib/helpers';
import { formatJoiningDate, formatTenure } from '../helpers';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';

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

export default function UserViewModal({ open, user, departments, onClose }) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent showCloseButton={false} className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0">
        {/* Header banner — avatar/name live inside the banner itself,
            not overlapping its edge, so there's no fragile negative-margin
            positioning to break. */}
        <div className="relative bg-linear-to-br from-primary to-primary/70 px-6 pb-6 pt-5">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-2 text-primary-foreground/80 transition hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <X size={20} />
          </button>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-primary-foreground/70">User Details</p>

          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-primary-foreground/25 bg-primary-foreground/15 text-xl font-bold text-primary-foreground">
              {user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-xl font-bold text-primary-foreground">{user.name}</h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Badge className="border-transparent bg-primary-foreground/15 text-primary-foreground">
                  {user.roleName || getRoleName(user.role_id)}
                </Badge>
                <Badge className={`border-transparent ${user.status === 'Active' ? 'bg-success/90 text-success-foreground' : 'bg-primary-foreground/20 text-primary-foreground'}`}>
                  {user.status}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto px-6 pb-6 pt-5">
          {formatTenure(user.joiningDate) && (
            <p className="mb-4 text-xs text-muted-foreground">{formatTenure(user.joiningDate)}</p>
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
      </DialogContent>
    </Dialog>
  );
}
