'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { aiAPI } from '@/lib/api';
import { toast } from 'sonner';
import { AlertTriangle, Brain, RefreshCw, Users, Calendar } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';

export default function AdminForecast() {
  const [leaveForecast, setLeaveForecast] = useState(null);
  const [anomalies, setAnomalies] = useState(null);
  const [attritionRisk, setAttritionRisk] = useState(null);
  const [performancePrediction, setPerformancePrediction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadForecasts();
  }, []);

  const loadForecasts = async () => {
    setLoading(true);
    try {
      const [leaveRes, anomalyRes, attritionRes] = await Promise.allSettled([
        aiAPI.leaveForecast(),
        aiAPI.attendanceAnomaly(),
        aiAPI.attritionRisk(),
      ]);

      if (leaveRes.status === 'fulfilled') setLeaveForecast(leaveRes.value);
      if (anomalyRes.status === 'fulfilled') setAnomalies(anomalyRes.value);
      if (attritionRes.status === 'fulfilled') setAttritionRisk(attritionRes.value);
      try {
        const prediction = await aiAPI.predictPerformance();
        setPerformancePrediction(prediction);
      } catch {
        setPerformancePrediction(null);
      }
    } catch (err) {
      toast.error('Failed to load forecasts');
    } finally {
      setLoading(false);
    }
  };

  // Build forecast chart data
  const forecastChartData = leaveForecast?.forecast || leaveForecast?.predictions || [];
  const attritionData = attritionRisk?.employees || attritionRisk?.risks || [];
  const anomalyData = anomalies?.anomalies || anomalies?.data || [];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />
      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">AI Forecasts & Predictions</h1>
            <p className="text-muted-foreground mt-1">Predictive analytics powered by AI.</p>
          </div>
          <button onClick={loadForecasts} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-blue-500/20"><Calendar size={20} className="text-blue-400" /></div>
                <p className="font-semibold">Leave Forecast</p>
              </div>
              <p className="text-3xl font-bold">{loading ? '...' : (leaveForecast?.totalPredicted ?? leaveForecast?.total ?? '—')}</p>
              <p className="text-sm text-muted-foreground mt-1">Predicted leave days next month</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-yellow-500/20"><AlertTriangle size={20} className="text-yellow-400" /></div>
                <p className="font-semibold">Attendance Anomalies</p>
              </div>
              <p className="text-3xl font-bold">{loading ? '...' : (anomalies?.count ?? anomalyData.length ?? '—')}</p>
              <p className="text-sm text-muted-foreground mt-1">Unusual patterns detected</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-red-500/20"><Users size={20} className="text-red-400" /></div>
                <p className="font-semibold">Attrition Risk</p>
              </div>
              <p className="text-3xl font-bold">{loading ? '...' : (attritionRisk?.highRiskCount ?? attritionData.length ?? '—')}</p>
              <p className="text-sm text-muted-foreground mt-1">Employees at high risk</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Brain size={20} className="text-purple-400" />
              Performance Prediction
            </h2>
            {performancePrediction ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">Predicted Score</p>
                  <p className="text-3xl font-bold">{performancePrediction.predictedScore}</p>
                </div>
                <div className="rounded-lg bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">Risk Level</p>
                  <p className="text-3xl font-bold">{performancePrediction.riskLevel}</p>
                </div>
                <div className="rounded-lg bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">Model</p>
                  <p className="text-sm font-medium break-words">{performancePrediction.modelVersion}</p>
                  <p className="text-xs text-muted-foreground mt-1">{performancePrediction.fallback ? 'Deterministic fallback' : 'AI service model'}</p>
                </div>
                <div className="md:col-span-3 rounded-lg border border-border p-4">
                  <p className="font-medium mb-2">Reasons</p>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    {(performancePrediction.reasons || []).map((reason, index) => <li key={index}>{reason}</li>)}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                {loading ? 'Loading performance prediction...' : 'No performance prediction available.'}
              </div>
            )}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Leave Forecast Chart */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Brain size={20} className="text-blue-400" />
                Leave Forecast (Next 30 Days)
              </h2>
              {forecastChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={forecastChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                    <Bar dataKey="predicted" fill="#3b82f6" name="Predicted Leaves" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-60 flex items-center justify-center border border-dashed border-border rounded-lg">
                  <div className="text-center">
                    <Brain size={40} className="mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground text-sm">{loading ? 'Loading forecast...' : 'No forecast data available'}</p>
                    {!loading && leaveForecast && (
                      <pre className="text-xs text-muted-foreground mt-2 max-w-xs overflow-auto">
                        {JSON.stringify(leaveForecast, null, 2).slice(0, 200)}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Attrition Risk */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-400" />
                Attrition Risk Analysis
              </h2>
              {attritionData.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {attritionData.slice(0, 8).map((emp, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <p className="font-medium text-sm">{emp.name || emp.firstName || `Employee ${i + 1}`}</p>
                        <p className="text-xs text-muted-foreground">{emp.department || emp.role || ''}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${emp.riskScore || emp.risk || 50}%`,
                            backgroundColor: (emp.riskScore || emp.risk || 50) > 70 ? '#ef4444' : (emp.riskScore || emp.risk || 50) > 40 ? '#f59e0b' : '#10b981'
                          }} />
                        </div>
                        <span className="text-xs font-mono">{emp.riskScore || emp.risk || '—'}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-60 flex items-center justify-center border border-dashed border-border rounded-lg">
                  <p className="text-muted-foreground text-sm">{loading ? 'Analyzing...' : 'No attrition risk data'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Anomalies */}
          {anomalyData.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <AlertTriangle size={20} className="text-yellow-400" />
                Attendance Anomalies Detected
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {anomalyData.slice(0, 6).map((a, i) => (
                  <div key={i} className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
                    <p className="font-medium text-sm">{a.employeeName || a.name || `Employee ${i + 1}`}</p>
                    <p className="text-xs text-muted-foreground mt-1">{a.description || a.reason || a.type || 'Unusual pattern'}</p>
                    <p className="text-xs text-yellow-400 mt-2">{a.date || a.detectedAt || ''}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
