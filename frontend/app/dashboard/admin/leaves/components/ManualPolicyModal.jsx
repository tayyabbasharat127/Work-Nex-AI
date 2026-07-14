'use client';

import { X, Loader2, Trash2, Plus, Check } from 'lucide-react';
import { formatLeaveType } from '@/hooks/useLeaveTypeLabels';
import { LEAVE_TYPES } from '../constants';

function ManualField({ label, hint, children }) {
  return (
    <div className={hint ? 'col-span-2 sm:col-span-3' : ''}>
      <label className="block text-xs text-muted-foreground mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

export default function ManualPolicyModal({
  open, onClose,
  manualLoading, manualRules, manualSaving,
  typeLabels,
  updateManualRule, toggleManualRuleRole, addManualRuleBlock, removeManualRuleBlock,
  onSave,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-overlay backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div>
            <h3 className="font-bold text-lg">Add / Edit Leave Policy Rules</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {manualLoading ? 'Loading current active rules…' : 'These are your organization\'s currently active rules — edit and re-save, or add a new leave type. Activates the same way as an approved document.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {manualLoading && (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 size={20} className="animate-spin mr-2" /> Loading current rules...
            </div>
          )}
          {!manualLoading && manualRules.map((rule, index) => (
            <div key={index} className="border border-border rounded-xl p-4 space-y-4 bg-background/40">
              <div className="flex items-center gap-3">
                <select
                  value={rule.leaveType}
                  onChange={(e) => updateManualRule(index, 'leaveType', e.target.value)}
                  className="px-3 py-2 rounded-lg border border-border bg-card text-sm font-semibold shrink-0"
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t} value={t}>{formatLeaveType(typeLabels, t)}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={rule.displayName}
                  onChange={(e) => updateManualRule(index, 'displayName', e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-border bg-card text-sm"
                  placeholder={`Display name (optional) — e.g. "EL" for ${formatLeaveType({}, rule.leaveType)}`}
                />
                {manualRules.length > 1 && (
                  <button onClick={() => removeManualRuleBlock(index)} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition shrink-0">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <ManualField label="Annual Quota (days)">
                  <input type="number" min="0" value={rule.annualQuota} onChange={(e) => updateManualRule(index, 'annualQuota', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm" placeholder="e.g. 12" />
                </ManualField>
                <ManualField label="Max Consecutive Days">
                  <input type="number" min="0" value={rule.maxConsecutiveDays} onChange={(e) => updateManualRule(index, 'maxConsecutiveDays', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm" placeholder="optional" />
                </ManualField>
                <ManualField label="Min Notice (days)">
                  <input type="number" min="0" value={rule.minNoticeDays} onChange={(e) => updateManualRule(index, 'minNoticeDays', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm" placeholder="optional" />
                </ManualField>
                <ManualField label="Auto-Approve Up To (days)">
                  <input type="number" min="0" value={rule.autoApproveMaxDays} onChange={(e) => updateManualRule(index, 'autoApproveMaxDays', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm" placeholder="e.g. 1" />
                </ManualField>
                <ManualField label="Max Carry Forward (days)">
                  <input type="number" min="0" value={rule.maxCarryForwardDays} onChange={(e) => updateManualRule(index, 'maxCarryForwardDays', e.target.value)} disabled={!rule.carryForwardAllowed} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-40" placeholder="0" />
                </ManualField>
                <ManualField label="Max Concurrent Leave (% of department)" hint="Blocks auto-approval — routes to manager — once this many of the employee's department are already off on overlapping dates.">
                  <input type="number" min="0" max="100" value={rule.maxConcurrentLeavePercent} onChange={(e) => updateManualRule(index, 'maxConcurrentLeavePercent', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm" placeholder="e.g. 30" />
                </ManualField>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm pt-1">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={rule.carryForwardAllowed} onChange={(e) => updateManualRule(index, 'carryForwardAllowed', e.target.checked)} />
                  Carry forward allowed
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={rule.requiresManagerApproval} onChange={(e) => updateManualRule(index, 'requiresManagerApproval', e.target.checked)} />
                  Requires manager approval
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={rule.requiresAdminApproval} onChange={(e) => updateManualRule(index, 'requiresAdminApproval', e.target.checked)} />
                  Requires admin approval
                </label>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Applicable roles</p>
                <div className="flex gap-4 text-sm">
                  {['EMPLOYEE', 'MANAGER', 'ADMIN'].map((role) => (
                    <label key={role} className="flex items-center gap-2">
                      <input type="checkbox" checked={rule.applicableRoles.includes(role)} onChange={() => toggleManualRuleRole(index, role)} />
                      {role.charAt(0) + role.slice(1).toLowerCase()}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {!manualLoading && (
            <button
              type="button"
              onClick={addManualRuleBlock}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-border hover:border-primary hover:text-primary transition text-sm font-medium"
            >
              <Plus size={16} />
              Add another leave type
            </button>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition">
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={manualSaving || manualLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {manualSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {manualSaving ? 'Saving...' : 'Save & Activate'}
          </button>
        </div>
      </div>
    </div>
  );
}
