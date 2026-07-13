'use client';

import { ChevronDown, ChevronRight, Settings2, Download, FileText, FolderOpen, X, UploadCloud, Loader2 } from 'lucide-react';
import { formatLeaveType } from '@/hooks/useLeaveTypeLabels';
import { TYPE_COLORS, ACCEPTED_POLICY_EXTENSIONS } from '../constants';
import { formatFileSize, formatRuleSummary } from '../helpers';

export default function LeavePolicySetup({
  showUploadSection, setShowUploadSection,
  openManualModal,
  policyInputRef, policyFile, policyDocument, policyUploading, isDraggingPolicy, setIsDraggingPolicy,
  selectPolicyFile, clearPolicyFile, handlePolicyUpload, handleApprovePolicyRules,
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-5">
      <div>
        <h2 className="font-bold">Leave Policy Setup</h2>
        <p className="text-sm text-muted-foreground mt-1">Configure your organization&apos;s leave rules — quotas, approvals, auto-approval, carry-forward.</p>
      </div>

      <button
        type="button"
        onClick={openManualModal}
        className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary transition text-left"
      >
        <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <Settings2 size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold">Set Up Leave Policy</p>
          <p className="text-sm text-muted-foreground mt-0.5">Fill in a simple form — quotas, approvals, auto-approval limits. No file needed, takes a couple of minutes.</p>
        </div>
        <ChevronRight size={20} className="text-muted-foreground shrink-0" />
      </button>

      <button
        type="button"
        onClick={() => setShowUploadSection((v) => !v)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ChevronDown size={16} className={`transition-transform ${showUploadSection ? 'rotate-180' : ''}`} />
        Advanced: upload a policy document instead
      </button>

      {showUploadSection && (
        <div className="space-y-5 pt-1 border-t border-border">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pt-4">
            <p className="text-sm text-muted-foreground max-w-md">Already have a formal HR policy document? Upload it and WorkNex will extract structured rules for you to review before activating.</p>
            <a
              href="/samples/worknex-leave-policy-sample.txt"
              download
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-background hover:border-primary hover:text-primary transition text-sm font-medium whitespace-nowrap shrink-0"
            >
              <Download size={16} />
              Download Sample
            </a>
          </div>

          <input
            ref={policyInputRef}
            type="file"
            accept=".txt,.pdf,.docx"
            onChange={(event) => selectPolicyFile(event.target.files?.[0])}
            className="sr-only"
          />

          <div
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDraggingPolicy(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              event.preventDefault();
              if (!event.currentTarget.contains(event.relatedTarget)) setIsDraggingPolicy(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDraggingPolicy(false);
              selectPolicyFile(event.dataTransfer.files?.[0]);
            }}
            className={`rounded-2xl border-2 border-dashed p-6 transition ${
              isDraggingPolicy
                ? 'border-primary bg-primary/10'
                : 'border-border bg-background/40 hover:border-primary/60'
            }`}
          >
            {policyFile ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <FileText size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{policyFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(policyFile.size)} · Ready to extract
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => policyInputRef.current?.click()}
                    disabled={policyUploading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-primary hover:text-primary transition text-sm disabled:opacity-50"
                  >
                    <FolderOpen size={16} />
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={clearPolicyFile}
                    disabled={policyUploading}
                    className="p-2 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive transition disabled:opacity-50"
                    aria-label="Remove selected policy file"
                    title="Remove file"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mx-auto mb-3">
                  <UploadCloud size={28} />
                </div>
                <p className="font-semibold">Drag and drop your policy document here</p>
                <p className="text-sm text-muted-foreground mt-1">or choose it from your computer</p>
                <button
                  type="button"
                  onClick={() => policyInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 mt-4 rounded-xl bg-secondary hover:bg-secondary/80 transition text-sm font-medium"
                >
                  <FolderOpen size={17} />
                  Choose File
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Supported formats:</span>
              {ACCEPTED_POLICY_EXTENSIONS.map((extension) => (
                <span key={extension} className="px-2 py-1 rounded-md bg-muted border border-border font-medium uppercase">
                  {extension}
                </span>
              ))}
              <span>Maximum 10 MB</span>
            </div>
            <button
              onClick={handlePolicyUpload}
              disabled={!policyFile || policyUploading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {policyUploading ? <Loader2 size={17} className="animate-spin" /> : <UploadCloud size={17} />}
              {policyUploading ? 'Extracting Rules...' : 'Upload & Extract Rules'}
            </button>
          </div>
          {policyDocument?.parsedRules && (
            <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-3">
              {policyDocument.parsedRules.leavePolicies.map((rule, i) => (
                <div key={i} className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                  <span className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${TYPE_COLORS[rule.leaveType] || TYPE_COLORS.OTHER}`}>
                    {rule.displayName || formatLeaveType({}, rule.leaveType)}
                  </span>
                  <p className="text-sm text-muted-foreground">{formatRuleSummary(rule)}</p>
                </div>
              ))}
              {policyDocument.status !== 'APPROVED_RULES_ACTIVE' && (
                <button onClick={handleApprovePolicyRules} className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-medium">
                  Approve Rules
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
