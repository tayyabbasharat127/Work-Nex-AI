'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { biometricAPI, WEBHOOK_BASE_URL } from '@/lib/api';
import { toast } from 'sonner';
import {
  Fingerprint, Plug, Cpu, ArrowLeftRight, RefreshCw,
  CheckCircle2, XCircle, Loader2, Plus, Trash2,
} from 'lucide-react';

const TABS = [
  { id: 'connection', label: 'Connection', icon: Plug },
  { id: 'devices', label: 'Devices', icon: Cpu },
  { id: 'mapping', label: 'Mapping', icon: ArrowLeftRight },
  { id: 'sync', label: 'Sync & Logs', icon: RefreshCw },
];

const DEFAULT_FIELD_MAPPING = { employeeId: 'USERID', checkIn: 'CHECKTIME', checkOut: 'CHECKTIME', status: 'CHECKTYPE' };

const emptyForm = {
  integrationType: 'DATABASE',
  enabled: false,
  syncIntervalMinutes: 60,
  fieldMapping: DEFAULT_FIELD_MAPPING,
  dbType: 'POSTGRES',
  dbHost: '', dbPort: '', dbName: '', dbUsername: '', dbPassword: '', dbTableName: '',
  apiBaseUrl: '', apiKey: '',
  admsCommunicationKey: '',
};

export default function BiometricIntegrationPage() {
  const [activeTab, setActiveTab] = useState('connection');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [devices, setDevices] = useState([]);
  const [syncLogs, setSyncLogs] = useState([]);
  const [newDevice, setNewDevice] = useState({ name: '', deviceSerial: '', hmacSecret: '', ipAddress: '', port: '', location: '' });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [integration, deviceList, logs] = await Promise.all([
        biometricAPI.getIntegration(),
        biometricAPI.getDevices(),
        biometricAPI.getSyncLogs(),
      ]);
      if (integration) {
        setForm((prev) => ({
          ...prev,
          ...integration,
          fieldMapping: integration.fieldMapping && Object.keys(integration.fieldMapping).length
            ? integration.fieldMapping
            : DEFAULT_FIELD_MAPPING,
          dbPassword: '', apiKey: '', admsCommunicationKey: '', // credentials never come back from the API
        }));
        if (integration.lastTestResult) setTestResult(integration.lastTestResult);
      }
      setDevices(Array.isArray(deviceList) ? deviceList : []);
      setSyncLogs(Array.isArray(logs) ? logs : []);
    } catch (err) {
      toast.error(err.message || 'Failed to load biometric integration settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadAll, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await biometricAPI.updateIntegration(form);
      toast.success('Integration settings saved');
      await loadAll();
    } catch (err) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await biometricAPI.testConnection();
      setTestResult(result);
      if (result.success) toast.success('Connected successfully');
      else toast.error(result.error || 'Connection test failed — check the details below');
    } catch (err) {
      toast.error(err.message || 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleAddDevice = async () => {
    if (!newDevice.name.trim() || !newDevice.deviceSerial.trim() || newDevice.hmacSecret.length < 32) {
      toast.error('Name, unique serial, and an HMAC secret of at least 32 characters are required');
      return;
    }
    try {
      await biometricAPI.createDevice(newDevice);
      toast.success('Device added');
      setNewDevice({ name: '', deviceSerial: '', hmacSecret: '', ipAddress: '', port: '', location: '' });
      await loadAll();
    } catch (err) {
      toast.error(err.message || 'Failed to add device');
    }
  };

  const handleDeleteDevice = async (id) => {
    try {
      await biometricAPI.deleteDevice(id);
      toast.success('Device removed');
      await loadAll();
    } catch (err) {
      toast.error(err.message || 'Failed to remove device');
    }
  };

  const stepLabel = (value) => {
    if (value === null) return { text: 'N/A', className: 'text-muted-foreground' };
    if (value === true) return { text: 'Pass', className: 'text-success' };
    return { text: 'Fail', className: 'text-destructive' };
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card/80 backdrop-blur-xl border-b border-border p-6 z-20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20">
              <Fingerprint className="text-primary" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Biometric Integration</h1>
              <p className="text-muted-foreground mt-1">
                Connect a real attendance device (ZKTeco / BioTime) — no code changes, just configuration.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex gap-2 border-b border-border">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : (
            <>
              {activeTab === 'connection' && (
                <div className="space-y-6 max-w-2xl">
                  <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Integration Enabled</h3>
                        <p className="text-sm text-muted-foreground">When off, attendance sync uses demo/fallback data.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.enabled}
                          onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary transition-colors" />
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Integration Type</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['DATABASE', 'API', 'ADMS'].map((type) => (
                          <button
                            key={type}
                            onClick={() => setForm({ ...form, integrationType: type })}
                            className={`px-4 py-3 rounded-xl border text-sm font-medium transition ${form.integrationType === type ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {form.integrationType === 'DATABASE' && (
                    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                      <h3 className="font-semibold">Database Connection</h3>
                      <p className="text-xs text-muted-foreground">Request a read-only account from whoever manages BioTime — WorkNex only ever needs to read attendance logs.</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Database Type</label>
                          <select value={form.dbType} onChange={(e) => setForm({ ...form, dbType: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-border bg-input">
                            <option value="POSTGRES">PostgreSQL</option>
                            <option value="MYSQL">MySQL</option>
                            <option value="SQLSERVER">SQL Server</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Port</label>
                          <input type="number" value={form.dbPort} onChange={(e) => setForm({ ...form, dbPort: e.target.value })} placeholder="5432 / 3306 / 1433" className="w-full px-4 py-3 rounded-xl border border-border bg-input" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Server / IP</label>
                        <input value={form.dbHost} onChange={(e) => setForm({ ...form, dbHost: e.target.value })} placeholder="192.168.1.50" className="w-full px-4 py-3 rounded-xl border border-border bg-input" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Database Name</label>
                          <input value={form.dbName} onChange={(e) => setForm({ ...form, dbName: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-border bg-input" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Table Name</label>
                          <input value={form.dbTableName} onChange={(e) => setForm({ ...form, dbTableName: e.target.value })} placeholder="iclock_transaction" className="w-full px-4 py-3 rounded-xl border border-border bg-input" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Username</label>
                          <input value={form.dbUsername} onChange={(e) => setForm({ ...form, dbUsername: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-border bg-input" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Password</label>
                          <input type="password" value={form.dbPassword} onChange={(e) => setForm({ ...form, dbPassword: e.target.value })} placeholder="Leave blank to keep current" className="w-full px-4 py-3 rounded-xl border border-border bg-input" />
                        </div>
                      </div>
                    </div>
                  )}

                  {form.integrationType === 'API' && (
                    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                      <h3 className="font-semibold">API Connection</h3>
                      <div>
                        <label className="block text-sm font-medium mb-2">Base URL</label>
                        <input value={form.apiBaseUrl} onChange={(e) => setForm({ ...form, apiBaseUrl: e.target.value })} placeholder="https://biotime.example.edu/api" className="w-full px-4 py-3 rounded-xl border border-border bg-input" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">API Key</label>
                        <input type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="Leave blank to keep current" className="w-full px-4 py-3 rounded-xl border border-border bg-input" />
                      </div>
                    </div>
                  )}

                  {form.integrationType === 'ADMS' && (
                    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                      <h3 className="font-semibold">ADMS (Device Push)</h3>
                      <p className="text-sm text-muted-foreground">
                        The device calls WorkNex directly — configure this URL on the device itself (menu: Comm → Cloud Server Setting).
                      </p>
                      <div className="bg-muted rounded-lg px-4 py-3 font-mono text-sm break-all">
                        {WEBHOOK_BASE_URL}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Legacy Communication Key</label>
                        <input type="password" value={form.admsCommunicationKey} onChange={(e) => setForm({ ...form, admsCommunicationKey: e.target.value })} placeholder="Leave blank to keep current" className="w-full px-4 py-3 rounded-xl border border-border bg-input" />
                      </div>
                      <p className="text-xs text-muted-foreground">Note: the device&apos;s IP need not be static for ADMS. Every request must use the per-device HMAC secret configured on the Devices tab.</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition disabled:opacity-50">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={handleTestConnection} disabled={testing} className="flex-1 px-4 py-3 rounded-xl border border-border font-medium hover:bg-muted transition disabled:opacity-50 inline-flex items-center justify-center gap-2">
                      {testing ? <Loader2 size={16} className="animate-spin" /> : <Plug size={16} />}
                      {testing ? 'Testing...' : 'Test Connection'}
                    </button>
                  </div>

                  {testResult && (
                    <div className={`rounded-xl border p-5 ${testResult.success ? 'border-success/40 bg-success/10' : 'border-destructive/40 bg-destructive/10'}`}>
                      <div className="flex items-center gap-2 font-semibold mb-3">
                        {testResult.success ? <CheckCircle2 className="text-success" size={20} /> : <XCircle className="text-destructive" size={20} />}
                        {testResult.success ? 'Connected Successfully' : 'Connection Failed'}
                      </div>
                      <div className="grid grid-cols-4 gap-3 text-sm">
                        {['reachable', 'portOpen', 'authenticated', 'testRead'].map((step) => {
                          const { text, className } = stepLabel(testResult.steps?.[step]);
                          const labels = { reachable: 'Reachable', portOpen: 'Port Open', authenticated: 'Authenticated', testRead: 'Test Read' };
                          return (
                            <div key={step}>
                              <p className="text-xs text-muted-foreground">{labels[step]}</p>
                              <p className={`font-medium ${className}`}>{text}</p>
                            </div>
                          );
                        })}
                      </div>
                      {testResult.error && <p className="text-sm text-destructive mt-3">{testResult.error}</p>}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'devices' && (
                <div className="space-y-6 max-w-3xl">
                  <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                    <h3 className="font-semibold">Add Device</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <input value={newDevice.name} onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })} placeholder="Device Name (e.g. CS Building Main Gate)" className="px-4 py-3 rounded-xl border border-border bg-input" />
                      <input value={newDevice.deviceSerial} onChange={(e) => setNewDevice({ ...newDevice, deviceSerial: e.target.value })} placeholder="Device Serial" className="px-4 py-3 rounded-xl border border-border bg-input" />
                      <input type="password" autoComplete="new-password" value={newDevice.hmacSecret} onChange={(e) => setNewDevice({ ...newDevice, hmacSecret: e.target.value })} placeholder="HMAC Secret (32+ characters)" className="px-4 py-3 rounded-xl border border-border bg-input" />
                      <input value={newDevice.ipAddress} onChange={(e) => setNewDevice({ ...newDevice, ipAddress: e.target.value })} placeholder="IP Address" className="px-4 py-3 rounded-xl border border-border bg-input" />
                      <input value={newDevice.location} onChange={(e) => setNewDevice({ ...newDevice, location: e.target.value })} placeholder="Location" className="px-4 py-3 rounded-xl border border-border bg-input" />
                    </div>
                    <button onClick={handleAddDevice} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition font-medium">
                      <Plus size={18} /> Add Device
                    </button>
                  </div>

                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 border-b border-border">
                        <tr>
                          <th className="text-left py-3 px-4 font-semibold">Name</th>
                          <th className="text-left py-3 px-4 font-semibold">IP</th>
                          <th className="text-left py-3 px-4 font-semibold">Location</th>
                          <th className="text-center py-3 px-4 font-semibold">Status</th>
                          <th className="text-left py-3 px-4 font-semibold"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {devices.length === 0 && (
                          <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No devices added yet</td></tr>
                        )}
                        {devices.map((device) => (
                          <tr key={device.id}>
                            <td className="py-3 px-4">{device.name}</td>
                            <td className="py-3 px-4 text-muted-foreground">{device.ipAddress || '—'}</td>
                            <td className="py-3 px-4 text-muted-foreground">{device.location || '—'}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${device.status === 'ONLINE' ? 'bg-success/20 text-success' : device.status === 'OFFLINE' ? 'bg-destructive/20 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                                {device.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <button onClick={() => handleDeleteDevice(device.id)} className="p-2 hover:bg-destructive/10 rounded-lg transition">
                                <Trash2 size={16} className="text-destructive" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'mapping' && (
                <div className="bg-card border border-border rounded-xl p-6 max-w-2xl space-y-4">
                  <h3 className="font-semibold">Field Mapping</h3>
                  <p className="text-sm text-muted-foreground">If the device/database uses different column names, map them here. Employees are auto-matched by employee code — no mapping needed for that.</p>
                  {Object.entries(form.fieldMapping).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-2 gap-4 items-center">
                      <label className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                      <input
                        value={value}
                        onChange={(e) => setForm({ ...form, fieldMapping: { ...form.fieldMapping, [key]: e.target.value } })}
                        className="px-4 py-3 rounded-xl border border-border bg-input"
                      />
                    </div>
                  ))}
                  <button onClick={handleSave} disabled={saving} className="px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Mapping'}
                  </button>
                </div>
              )}

              {activeTab === 'sync' && (
                <div className="space-y-6">
                  <div className="bg-card border border-border rounded-xl p-6 max-w-xl space-y-4">
                    <h3 className="font-semibold">Sync Settings</h3>
                    <div>
                      <label className="block text-sm font-medium mb-2">Sync Interval (minutes)</label>
                      <input type="number" value={form.syncIntervalMinutes} onChange={(e) => setForm({ ...form, syncIntervalMinutes: Number(e.target.value) })} className="w-full px-4 py-3 rounded-xl border border-border bg-input" />
                    </div>
                    <button onClick={handleSave} disabled={saving} className="px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition disabled:opacity-50">
                      Save
                    </button>
                  </div>

                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-border font-semibold">Sync Logs</div>
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 border-b border-border">
                        <tr>
                          <th className="text-left py-3 px-4 font-semibold">Status</th>
                          <th className="text-left py-3 px-4 font-semibold">Records In / Out</th>
                          <th className="text-left py-3 px-4 font-semibold">Errors</th>
                          <th className="text-left py-3 px-4 font-semibold">When</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {syncLogs.length === 0 && (
                          <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No sync history yet</td></tr>
                        )}
                        {syncLogs.map((log) => (
                          <tr key={log.id}>
                            <td className="py-3 px-4">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${log.status === 'SUCCESS' ? 'bg-success/20 text-success' : log.status === 'FAILED' ? 'bg-destructive/20 text-destructive' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">{log.recordsIn} / {log.recordsOut}</td>
                            <td className="py-3 px-4 text-muted-foreground text-xs max-w-xs truncate">{log.errorLog || '—'}</td>
                            <td className="py-3 px-4 text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
