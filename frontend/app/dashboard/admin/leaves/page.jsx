'use client';

import { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import { Check, Clock, FileText, X } from 'lucide-react';
import { leaveAPI } from '@/lib/api';
import { toast } from 'sonner';
import { useLeaveTypeLabels } from '@/hooks/useLeaveTypeLabels';

import { ACCEPTED_POLICY_EXTENSIONS, MAX_POLICY_FILE_SIZE } from './constants';
import { emptyManualRule, ruleFromActive, toNullableNumber } from './helpers';
import LeavePolicySetup from './components/LeavePolicySetup';
import LeaveStatsCards from './components/LeaveStatsCards';
import LeaveFilters from './components/LeaveFilters';
import LeaveTable from './components/LeaveTable';
import LeavePagination from './components/LeavePagination';
import LeaveDetailModal from './components/LeaveDetailModal';
import ManualPolicyModal from './components/ManualPolicyModal';
import HolidayManagement from './components/HolidayManagement';
import LeaveAutomationSettings from './components/LeaveAutomationSettings';

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
      toast.success('Final admin approval completed');
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
    { label: 'Total Requests', value: leaves.length, icon: FileText, color: 'text-info', bg: 'bg-info/15', border: 'border-info/20' },
    { label: 'Pending', value: leaves.filter(l => ['PENDING', 'PENDING_MANAGER', 'PENDING_ADMIN'].includes(l.status)).length, icon: Clock, color: 'text-warning', bg: 'bg-warning/15', border: 'border-warning/20' },
    { label: 'Approved', value: leaves.filter(l => l.status === 'APPROVED').length, icon: Check, color: 'text-success', bg: 'bg-success/15', border: 'border-success/20' },
    { label: 'Rejected', value: leaves.filter(l => l.status === 'REJECTED').length, icon: X, color: 'text-destructive', bg: 'bg-destructive/15', border: 'border-destructive/20' },
  ];

  // Filter
  const filtered = leaves.filter(l => {
    const emp = l.employee || {};
    const name = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
    const email = (emp.email || '').toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
    const matchStatus = filterStatus === 'ALL'
      || (filterStatus === 'PENDING' && ['PENDING', 'PENDING_MANAGER', 'PENDING_ADMIN'].includes(l.status))
      || l.status === filterStatus;
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
        <div className="sticky top-0 bg-card/80 backdrop-blur-xl border-b border-border px-5 py-4 z-20">
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

        <div className="space-y-4 p-5">
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <LeavePolicySetup
              showUploadSection={showUploadSection}
              setShowUploadSection={setShowUploadSection}
              openManualModal={openManualModal}
              policyInputRef={policyInputRef}
              policyFile={policyFile}
              policyDocument={policyDocument}
              policyUploading={policyUploading}
              isDraggingPolicy={isDraggingPolicy}
              setIsDraggingPolicy={setIsDraggingPolicy}
              selectPolicyFile={selectPolicyFile}
              clearPolicyFile={clearPolicyFile}
              handlePolicyUpload={handlePolicyUpload}
              handleApprovePolicyRules={handleApprovePolicyRules}
            />
            <LeaveAutomationSettings />
          </div>

          <HolidayManagement />

          <LeaveStatsCards stats={stats} loading={loading} />

          <LeaveFilters
            search={search} setSearch={setSearch}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            filterType={filterType} setFilterType={setFilterType}
            setCurrentPage={setCurrentPage}
            typeLabels={typeLabels}
          />

          <LeaveTable
            loading={loading}
            paginated={paginated}
            typeLabels={typeLabels}
            onView={setViewingLeave}
            onApprove={handleApprove}
            onReject={handleReject}
          />

          <LeavePagination
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            filteredCount={filtered.length}
          />
        </div>

        <LeaveDetailModal
          leave={viewingLeave}
          typeLabels={typeLabels}
          onClose={() => setViewingLeave(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />

        <ManualPolicyModal
          open={showManualModal}
          onClose={() => setShowManualModal(false)}
          manualLoading={manualLoading}
          manualRules={manualRules}
          manualSaving={manualSaving}
          typeLabels={typeLabels}
          updateManualRule={updateManualRule}
          toggleManualRuleRole={toggleManualRuleRole}
          addManualRuleBlock={addManualRuleBlock}
          removeManualRuleBlock={removeManualRuleBlock}
          onSave={handleSaveManualRules}
        />
      </main>
    </div>
  );
}
