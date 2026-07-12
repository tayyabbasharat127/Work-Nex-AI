'use client';

import { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import { Check, X, Clock, Eye, Search, ChevronLeft, ChevronRight, ChevronDown, FileText, FolderOpen, Download, UploadCloud, Loader2, Settings2, Plus, Trash2 } from 'lucide-react';
import { leaveAPI } from '@/lib/api';
import { toast } from 'sonner';
import { useLeaveTypeLabels, formatLeaveType } from '@/hooks/useLeaveTypeLabels';

const STATUS_CONFIG = {
  PENDING:   { label: 'Pending',   bg: 'bg-amber-500/15',  text: 'text-amber-400',  border: 'border-amber-500/30',  dot: 'bg-amber-400' },
  APPROVED:  { label: 'Approved',  bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  REJECTED:  { label: 'Rejected',  bg: 'bg-red-500/15',    text: 'text-red-400',    border: 'border-red-500/30',    dot: 'bg-red-400' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-muted/30',      text: 'text-muted-foreground', border: 'border-border', dot: 'bg-muted-foreground' },
};

const TYPE_COLORS = {
  ANNUAL:       'bg-blue-500/15 text-blue-400',
  SICK:         'bg-red-500/15 text-red-400',
  CASUAL:       'bg-purple-500/15 text-purple-400',
  MATERNITY:    'bg-pink-500/15 text-pink-400',
  PATERNITY:    'bg-cyan-500/15 text-cyan-400',
  UNPAID:       'bg-orange-500/15 text-orange-400',
  BEREAVEMENT:  'bg-slate-500/15 text-slate-400',
  MARRIAGE:     'bg-rose-500/15 text-rose-400',
  STUDY:        'bg-indigo-500/15 text-indigo-400',
  HAJJ:         'bg-emerald-500/15 text-emerald-400',
  COMPENSATORY: 'bg-teal-500/15 text-teal-400',
  OTHER:        'bg-muted/30 text-muted-foreground',
};

const LEAVE_TYPES = Object.keys(TYPE_COLORS);

const emptyManualRule = () => ({
  leaveType: 'CASUAL',
  displayName: '',
  annualQuota: '',
  maxConsecutiveDays: '',
  minNoticeDays: '',
  applicableRoles: ['EMPLOYEE', 'MANAGER', 'ADMIN'],
  carryForwardAllowed: false,
  maxCarryForwardDays: '',
  requiresManagerApproval: true,
  autoApproveMaxDays: '',
  requiresAdminApproval: false,
  maxConcurrentLeavePercent: '',
});

const toNullableNumber = (value) => (value === '' || value === null || value === undefined ? null : Number(value));
const numToInput = (n) => (n === null || n === undefined ? '' : String(n));

const ruleFromActive = (rule) => ({
  leaveType: rule.leaveType,
  displayName: rule.displayName || '',
  annualQuota: numToInput(rule.annualQuota),
  maxConsecutiveDays: numToInput(rule.maxConsecutiveDays),
  minNoticeDays: numToInput(rule.minNoticeDays),
  applicableRoles: Array.isArray(rule.applicableRoles) && rule.applicableRoles.length ? rule.applicableRoles : ['EMPLOYEE', 'MANAGER', 'ADMIN'],
  carryForwardAllowed: Boolean(rule.carryForwardAllowed),
  maxCarryForwardDays: numToInput(rule.maxCarryForwardDays),
  requiresManagerApproval: rule.requiresManagerApproval !== false,
  autoApproveMaxDays: numToInput(rule.autoApproveMaxDays),
  requiresAdminApproval: Boolean(rule.requiresAdminApproval),
  maxConcurrentLeavePercent: numToInput(rule.maxConcurrentLeavePercent),
});

const ACCEPTED_POLICY_EXTENSIONS = ['txt', 'pdf', 'docx'];
const MAX_POLICY_FILE_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getInitials(firstName, lastName) {
  return `${(firstName || '?')[0]}${(lastName || '')[0] || ''}`.toUpperCase();
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Plain-English summary of a parsed/activated rule, instead of dumping raw JSON at admins.
function formatRuleSummary(rule) {
  const parts = [];
  parts.push(rule.annualQuota != null ? `${rule.annualQuota} days/year` : 'no fixed quota set');
  if (rule.maxConsecutiveDays != null) parts.push(`max ${rule.maxConsecutiveDays} consecutive day(s)`);
  if (rule.minNoticeDays != null) parts.push(`${rule.minNoticeDays} day(s) notice required`);
  parts.push(rule.carryForwardAllowed ? `carries forward (up to ${rule.maxCarryForwardDays || 0} days)` : 'no carry forward');
  if (rule.autoApproveMaxDays != null) parts.push(`auto-approves requests up to ${rule.autoApproveMaxDays} day(s)`);
  if (rule.maxConcurrentLeavePercent != null) parts.push(`pauses auto-approval at ${rule.maxConcurrentLeavePercent}% department concurrency`);
  parts.push(rule.requiresAdminApproval ? 'needs manager + admin approval' : rule.requiresManagerApproval ? 'needs manager approval' : 'no manager approval required beyond the auto-approve window');
  if (rule.requiresMedicalCertificateAfterDays) parts.push(`medical certificate required after ${rule.requiresMedicalCertificateAfterDays} day(s)`);
  return parts.join(' · ');
}

export default function AdminLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [search, setSearch] = useState('');
  const [viewingLeave, setViewingLeave] = useState(null);
  const [policyFile, setPolicyFile] = useState(null);
  const [policyDocument, setPolicyDocument] = useState(null);
  const [policyUploading, setPolicyUploading] = useState(false);
  const [isDraggingPolicy, setIsDraggingPolicy] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualRules, setManualRules] = useState([emptyManualRule()]);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  const [showUploadSection, setShowUploadSection] = useState(false);
  const { labels: typeLabels, refetch: refetchTypeLabels } = useLeaveTypeLabels();
  const policyInputRef = useRef(null);
  const itemsPerPage = 8;

  useEffect(() => { loadLeaves(); }, []);

  const loadLeaves = async () => {
    try {
      setLoading(true);
      const data = await leaveAPI.getAll();
      // Backend returns { leaves: [...] } or array
      const arr = Array.isArray(data) ? data : (data?.leaves || data?.data || []);
      setLeaves(arr);
    } catch {
      toast.error('Failed to load leaves');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await leaveAPI.approve(id, '');
      toast.success('Leave approved');
      loadLeaves();
      setViewingLeave(null);
    } catch (err) {
      toast.error(err.message || 'Failed to approve');
    }
  };

  const handleReject = async (id) => {
    try {
      await leaveAPI.reject(id, '');
      toast.success('Leave rejected');
      loadLeaves();
      setViewingLeave(null);
    } catch (err) {
      toast.error(err.message || 'Failed to reject');
    }
  };

  const handlePolicyUpload = async () => {
    if (!policyFile) {
      toast.error('Choose a policy document first');
      return;
    }
    try {
      setPolicyUploading(true);
      const uploaded = await leaveAPI.uploadPolicyDocument(policyFile);
      const extracted = await leaveAPI.extractPolicyDocument(uploaded.id);
      const parsed = await leaveAPI.aiParsePolicyDocument(extracted.id);
      setPolicyDocument(parsed);
      toast.success('Policy extracted. Review rules before activation.');
    } catch (err) {
      toast.error(err.message || 'Policy upload failed');
    } finally {
      setPolicyUploading(false);
    }
  };

  const selectPolicyFile = (file) => {
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (!ACCEPTED_POLICY_EXTENSIONS.includes(extension)) {
      toast.error('Choose a TXT, PDF, or DOCX policy document');
      return;
    }
    if (file.size > MAX_POLICY_FILE_SIZE) {
      toast.error('Policy document must be 10 MB or smaller');
      return;
    }

    setPolicyFile(file);
    setPolicyDocument(null);
  };

  const clearPolicyFile = () => {
    setPolicyFile(null);
    if (policyInputRef.current) policyInputRef.current.value = '';
  };

  const handleApprovePolicyRules = async () => {
    try {
      const approved = await leaveAPI.approvePolicyRules(policyDocument.id, policyDocument.parsedRules);
      setPolicyDocument(approved);
      toast.success('Policy rules approved and activated');
      refetchTypeLabels();
    } catch (err) {
      toast.error(err.message || 'Failed to approve rules');
    }
  };

  const openManualModal = async () => {
    setManualRules([emptyManualRule()]);
    setShowManualModal(true);
    setManualLoading(true);
    try {
      const active = await leaveAPI.getActivePolicyVersion();
      if (active?.rulesJson?.leavePolicies?.length) {
        setManualRules(active.rulesJson.leavePolicies.map(ruleFromActive));
      }
    } catch {
      // No active version yet (or fetch failed) — keep the blank starting form.
    } finally {
      setManualLoading(false);
    }
  };

  const updateManualRule = (index, field, value) => {
    setManualRules((prev) => prev.map((rule, i) => (i === index ? { ...rule, [field]: value } : rule)));
  };

  const toggleManualRuleRole = (index, role) => {
    setManualRules((prev) => prev.map((rule, i) => {
      if (i !== index) return rule;
      const has = rule.applicableRoles.includes(role);
      return { ...rule, applicableRoles: has ? rule.applicableRoles.filter((r) => r !== role) : [...rule.applicableRoles, role] };
    }));
  };

  const addManualRuleBlock = () => setManualRules((prev) => [...prev, emptyManualRule()]);
  const removeManualRuleBlock = (index) => setManualRules((prev) => prev.filter((_, i) => i !== index));

  const handleSaveManualRules = async () => {
    try {
      setManualSaving(true);
      const payload = manualRules.map((rule) => ({
        leaveType: rule.leaveType,
        displayName: rule.displayName?.trim() || null,
        annualQuota: toNullableNumber(rule.annualQuota),
        maxConsecutiveDays: toNullableNumber(rule.maxConsecutiveDays),
        minNoticeDays: toNullableNumber(rule.minNoticeDays),
        applicableRoles: rule.applicableRoles,
        carryForwardAllowed: rule.carryForwardAllowed,
        maxCarryForwardDays: toNullableNumber(rule.maxCarryForwardDays) || 0,
        requiresManagerApproval: rule.requiresManagerApproval,
        autoApproveMaxDays: toNullableNumber(rule.autoApproveMaxDays),
        requiresAdminApproval: rule.requiresAdminApproval,
        maxConcurrentLeavePercent: toNullableNumber(rule.maxConcurrentLeavePercent),
      }));
      await leaveAPI.saveManualPolicyRules(payload);
      toast.success('Policy rules activated');
      setShowManualModal(false);
      refetchTypeLabels();
    } catch (err) {
      toast.error(err.message || 'Failed to activate policy rules');
    } finally {
      setManualSaving(false);
    }
  };

  // Stats
  const stats = [
    { label: 'Total Requests', value: leaves.length, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/20' },
    { label: 'Pending', value: leaves.filter(l => l.status === 'PENDING').length, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/20' },
    { label: 'Approved', value: leaves.filter(l => l.status === 'APPROVED').length, icon: Check, color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/20' },
    { label: 'Rejected', value: leaves.filter(l => l.status === 'REJECTED').length, icon: X, color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/20' },
  ];

  // Filter
  const filtered = leaves.filter(l => {
    const emp = l.employee || {};
    const name = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
    const email = (emp.email || '').toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || l.status === filterStatus;
    const matchType = filterType === 'ALL' || l.leaveType === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />

      <main className="flex-1 overflow-auto md:ml-64">
        {/* Header */}
        <div className="sticky top-0 bg-card/80 backdrop-blur-xl border-b border-border px-8 py-5 z-20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Leave Management</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Review and manage employee leave requests</p>
            </div>
            <button onClick={loadLeaves} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:bg-muted transition text-sm">
              Refresh
            </button>
          </div>
        </div>

        <div className="px-8 py-6 space-y-6">
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

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className={`bg-card border ${s.border} rounded-2xl p-5 hover:shadow-md transition-all`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-xl ${s.bg}`}>
                      <Icon size={18} className={s.color} />
                    </div>
                    <span className={`text-3xl font-bold ${s.color}`}>{loading ? '—' : s.value}</span>
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">{s.label}</p>
                </div>
              );
            })}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search employee name or email..."
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-primary transition"
              />
            </div>
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              className="px-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-primary min-w-[140px]">
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select value={filterType} onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }}
              className="px-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-primary min-w-[140px]">
              <option value="ALL">All Types</option>
              {LEAVE_TYPES.map(t => (
                <option key={t} value={t}>{formatLeaveType(typeLabels, t)}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
                Loading leave requests...
              </div>
            ) : paginated.length === 0 ? (
              <div className="p-16 text-center">
                <FileText size={40} className="mx-auto text-muted-foreground mb-3" />
                <p className="font-semibold">No leave requests found</p>
                <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3.5 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee</th>
                    <th className="text-left py-3.5 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                    <th className="text-left py-3.5 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duration</th>
                    <th className="text-left py-3.5 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dates</th>
                    <th className="text-left py-3.5 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-right py-3.5 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginated.map(leave => {
                    const emp = leave.employee || {};
                    const firstName = emp.firstName || '';
                    const lastName = emp.lastName || '';
                    const fullName = firstName || lastName ? `${firstName} ${lastName}`.trim() : 'Unknown Employee';
                    const empId = emp.employeeId || '';
                    const status = leave.status || 'PENDING';
                    const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
                    const typeColor = TYPE_COLORS[leave.leaveType] || TYPE_COLORS.OTHER;
                    const days = leave.totalDays || 0;

                    return (
                      <tr key={leave.id} className="hover:bg-muted/20 transition group">
                        {/* Employee */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                              {getInitials(firstName, lastName)}
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{fullName}</p>
                              {empId && <p className="text-xs text-muted-foreground">{empId}</p>}
                            </div>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="py-4 px-5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${typeColor}`}>
                            {leave.leaveType ? formatLeaveType(typeLabels, leave.leaveType) : '—'}
                          </span>
                        </td>

                        {/* Duration */}
                        <td className="py-4 px-5">
                          <span className="text-sm font-semibold">{days}</span>
                          <span className="text-xs text-muted-foreground ml-1">{days === 1 ? 'day' : 'days'}</span>
                        </td>

                        {/* Dates */}
                        <td className="py-4 px-5">
                          <p className="text-sm">{formatDate(leave.startDate)}</p>
                          <p className="text-xs text-muted-foreground">to {formatDate(leave.endDate)}</p>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                            {statusCfg.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-5">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => setViewingLeave(leave)}
                              className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground">
                              <Eye size={15} />
                            </button>
                            {status === 'PENDING' && (
                              <>
                                <button onClick={() => handleApprove(leave.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition text-xs font-medium">
                                  <Check size={13} /> Approve
                                </button>
                                <button onClick={() => handleReject(leave.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition text-xs font-medium">
                                  <X size={13} /> Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition">
                  <ChevronLeft size={15} />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(page => (
                  <button key={page} onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition ${currentPage === page ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                    {page}
                  </button>
                ))}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {viewingLeave && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                <h2 className="text-lg font-bold">Leave Request Details</h2>
                <button onClick={() => setViewingLeave(null)} className="p-2 hover:bg-muted rounded-xl transition">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Employee Info */}
                {(() => {
                  const emp = viewingLeave.employee || {};
                  const firstName = emp.firstName || '';
                  const lastName = emp.lastName || '';
                  const fullName = firstName || lastName ? `${firstName} ${lastName}`.trim() : 'Unknown Employee';
                  const status = viewingLeave.status || 'PENDING';
                  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
                  const typeColor = TYPE_COLORS[viewingLeave.leaveType] || TYPE_COLORS.OTHER;

                  return (
                    <>
                      <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                          {getInitials(firstName, lastName)}
                        </div>
                        <div>
                          <p className="text-lg font-bold">{fullName}</p>
                          <p className="text-sm text-muted-foreground">{emp.employeeId || ''}</p>
                        </div>
                        <div className="ml-auto">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                            {statusCfg.label}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-muted/20 rounded-xl">
                          <p className="text-xs text-muted-foreground mb-1">Leave Type</p>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${typeColor}`}>
                            {viewingLeave.leaveType ? formatLeaveType(typeLabels, viewingLeave.leaveType) : '—'}
                          </span>
                        </div>
                        <div className="p-4 bg-muted/20 rounded-xl">
                          <p className="text-xs text-muted-foreground mb-1">Duration</p>
                          <p className="font-bold text-lg">{viewingLeave.totalDays || 0} <span className="text-sm font-normal text-muted-foreground">days</span></p>
                        </div>
                        <div className="p-4 bg-muted/20 rounded-xl">
                          <p className="text-xs text-muted-foreground mb-1">From</p>
                          <p className="font-semibold text-sm">{formatDate(viewingLeave.startDate)}</p>
                        </div>
                        <div className="p-4 bg-muted/20 rounded-xl">
                          <p className="text-xs text-muted-foreground mb-1">To</p>
                          <p className="font-semibold text-sm">{formatDate(viewingLeave.endDate)}</p>
                        </div>
                      </div>

                      {viewingLeave.isSandwiched && (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                          <p className="text-xs font-medium text-amber-500 mb-1">Sandwich Rule Applied</p>
                          <p className="text-sm">+{viewingLeave.sandwichExtraDays} day(s) added — a weekend/holiday between this leave and an unapproved absence was swallowed into the deduction.</p>
                        </div>
                      )}

                      <div className="p-4 bg-muted/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-2">Reason</p>
                        <p className="text-sm leading-relaxed">{viewingLeave.reason || 'No reason provided'}</p>
                      </div>

                      {viewingLeave.approverNote && (
                        <div className="p-4 bg-muted/20 rounded-xl">
                          <p className="text-xs text-muted-foreground mb-2">Approver Note</p>
                          <p className="text-sm">{viewingLeave.approverNote}</p>
                        </div>
                      )}

                      {status === 'PENDING' && (
                        <div className="flex gap-3 pt-1">
                          <button onClick={() => handleApprove(viewingLeave.id)}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition font-semibold">
                            <Check size={16} /> Approve
                          </button>
                          <button onClick={() => handleReject(viewingLeave.id)}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 transition font-semibold">
                            <X size={16} /> Reject
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Manual Policy Builder Modal */}
        {showManualModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
                <div>
                  <h3 className="font-bold text-lg">Add / Edit Leave Policy Rules</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {manualLoading ? 'Loading current active rules…' : 'These are your organization\'s currently active rules — edit and re-save, or add a new leave type. Activates the same way as an approved document.'}
                  </p>
                </div>
                <button onClick={() => setShowManualModal(false)} className="p-2 rounded-lg hover:bg-muted transition">
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
                <button onClick={() => setShowManualModal(false)} className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition">
                  Cancel
                </button>
                <button
                  onClick={handleSaveManualRules}
                  disabled={manualSaving || manualLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                >
                  {manualSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {manualSaving ? 'Saving...' : 'Save & Activate'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ManualField({ label, hint, children }) {
  return (
    <div className={hint ? 'col-span-2 sm:col-span-3' : ''}>
      <label className="block text-xs text-muted-foreground mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
