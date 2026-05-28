'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import RoleGate from '@/components/RoleGate';
import { aiAPI, performanceAPI } from '@/lib/api';
import { AlertTriangle, Brain, Calendar, RefreshCw, TrendingUp } from 'lucide-react';

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.records)) return value.records;
  if (Array.isArray(value?.forecast)) return value.forecast;
  if (Array.isArray(value?.predictions)) return value.predictions;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

export default function EmployeeForecastPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [performance, setPerformance] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [leaveForecast, setLeaveForecast] = useState(null);
  const [anomaly, setAnomaly] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [perfRes, predRes, leaveRes, anomalyRes] = await Promise.allSettled([
        performanceAPI.getMy(),
        aiAPI.predictPerformance(),
        aiAPI.leaveForecast(),
        aiAPI.attendanceAnomaly(),
      ]);
      if (perfRes.status === 'fulfilled') setPerformance(toArray(perfRes.value));
      if (predRes.status === 'fulfilled') setPrediction(predRes.value);
      if (leaveRes.status === 'fulfilled') setLeaveForecast(leaveRes.value);
      if (anomalyRes.status === 'fulfilled') setAnomaly(anomalyRes.value);
      const rejected = [perfRes, predRes].find((item) => item.status === 'rejected');
      if (rejected) setError(rejected.reason?.message || 'Some forecast data could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const latest = performance[0] || {};
  const forecastRows = toArray(leaveForecast).slice(0, 6);
  const anomalyRows = toArray(anomaly?.anomalies || anomaly).slice(0, 5);

  return (
    <RoleGate allow={['EMPLOYEE']}>
      <div className="flex h-screen bg-background">
        <Sidebar role="employee" />
        <main className="flex-1 overflow-auto md:ml-64">
          <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card p-6">
            <div>
              <h1 className="text-3xl font-bold">Forecast</h1>
              <p className="text-muted-foreground mt-1">Personal prediction signals from real WorkNex APIs.</p>
            </div>
            <button onClick={loadData} disabled={loading} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 hover:bg-muted disabled:opacity-50">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          <div className="p-6 space-y-6">
            {error && <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingUp size={18} /> Latest Score</div>
                <p className="mt-3 text-3xl font-bold">{loading ? '...' : Number(latest.overallScore || 0).toFixed(1)}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Brain size={18} /> Predicted Score</div>
                <p className="mt-3 text-3xl font-bold">{loading ? '...' : prediction?.predictedScore ?? '-'}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle size={18} /> Risk Level</div>
                <p className="mt-3 text-3xl font-bold">{loading ? '...' : prediction?.riskLevel ?? '-'}</p>
              </div>
            </div>

            <section className="rounded-lg border border-border bg-card p-5">
              <h2 className="font-semibold mb-3">Prediction Reasons</h2>
              {prediction ? (
                <>
                  <p className="mb-4 text-xs text-muted-foreground">{prediction.fallback ? 'Deterministic fallback response' : 'AI service model response'} {prediction.modelVersion ? `- ${prediction.modelVersion}` : ''}</p>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                    {(prediction.reasons || []).map((reason, index) => <li key={index}>{reason}</li>)}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{loading ? 'Loading prediction...' : 'No prediction returned.'}</p>
              )}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="rounded-lg border border-border bg-card p-5">
                <div className="mb-4 flex items-center gap-2"><Calendar size={18} className="text-primary" /><h2 className="font-semibold">Leave Forecast</h2></div>
                {forecastRows.length ? (
                  <div className="space-y-2">
                    {forecastRows.map((row, index) => (
                      <div key={index} className="flex items-center justify-between rounded-lg bg-muted/40 p-3 text-sm">
                        <span>{row.date || row.period || row.month || `Window ${index + 1}`}</span>
                        <b>{row.predicted ?? row.value ?? row.count ?? '-'}</b>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{loading ? 'Loading leave forecast...' : 'No leave forecast rows returned.'}</p>
                )}
              </section>

              <section className="rounded-lg border border-border bg-card p-5">
                <div className="mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-400" /><h2 className="font-semibold">Attendance Signals</h2></div>
                {anomalyRows.length ? (
                  <div className="space-y-2">
                    {anomalyRows.map((row, index) => (
                      <div key={index} className="rounded-lg bg-muted/40 p-3 text-sm">
                        <p className="font-medium">{row.type || row.employeeName || `Signal ${index + 1}`}</p>
                        <p className="text-muted-foreground">{row.description || row.reason || row.date || 'Pattern returned by anomaly endpoint.'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{loading ? 'Checking anomaly endpoint...' : 'No anomaly rows returned.'}</p>
                )}
              </section>
            </div>
          </div>
        </main>
      </div>
    </RoleGate>
  );
}
