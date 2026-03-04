"use client";

import React, { useEffect, useState, useMemo } from "react";
import SidebarSuperAdmin from "@/src/app/components/sideBar/superAdmin/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import "./page.scss";

import {
  getOrganizationGrowthApi,
  getRevenueByTierApi,
  getFeatureUsageStatsApi,
  getLicenseUtilizationApi,
  getExpiryTrackingApi,
} from "@/src/api/api";

import axios from "axios";

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Define types for the data
interface GrowthMetric {
  label: string;
  value: number | string;
}

interface RevenueData {
  tier: string;
  revenue: number;
}

interface FeatureUsageStat {
  feature: string;
  usage: number;
}

interface LicenseUtilization {
  organization: string;
  usedLicenses: number;
  totalLicenses: number;
}

interface ExpiryTracking {
  organization: string;
  expiryDate: string;
  status: "Active" | "Expired";
}

const AnalyticsPage = () => {
  const [growthMetrics, setGrowthMetrics] = useState<GrowthMetric[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [featureUsageStats, setFeatureUsageStats] = useState<FeatureUsageStat[]>([]);
  const [licenseUtilization, setLicenseUtilization] = useState<LicenseUtilization[]>([]);
  const [expiryTracking, setExpiryTracking] = useState<ExpiryTracking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch analytics data
  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [growthRes, revenueRes, featureRes, licenseRes, expiryRes] = await Promise.all([
        getOrganizationGrowthApi(),
        getRevenueByTierApi(),
        getFeatureUsageStatsApi(),
        getLicenseUtilizationApi(),
        getExpiryTrackingApi(),
      ]);

      setGrowthMetrics(growthRes.data || []);
      setRevenueData(revenueRes.data || []);
      setFeatureUsageStats(featureRes.data || []);
      setLicenseUtilization(licenseRes.data || []);
      setExpiryTracking(expiryRes.data || []);
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const data = e.response?.data as { message?: string } | undefined;
        setError(data?.message ?? e.message ?? "Failed to load analytics data.");
      } else if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Failed to load analytics data.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  // ChartJS data for revenue by tier
  const revenueChartData = useMemo(
    () => ({
      labels: revenueData.map((item) => item.tier),
      datasets: [
        {
          label: "Revenue",
          data: revenueData.map((item) => item.revenue),
          backgroundColor: "#6c5ce7",
          borderColor: "#6c5ce7",
          borderWidth: 1,
        },
      ],
    }),
    [revenueData]
  );

  return (
    <div className="analytics-dashboard">
      <SidebarSuperAdmin />
      <main className="main-content">
        <div className="header">
          <SearchBox />
        </div>

        {error && <div className="banner banner-error">{error}</div>}
        {loading && <div className="banner banner-loading">Loading...</div>}

        {/* KPI Summary */}
        <section className="kpi-summary">
          <h3>Key Performance Indicators</h3>
          <div className="kpi-grid">
            {growthMetrics.map((metric) => (
              <div key={metric.label} className="kpi-card">
                <h4>{metric.label}</h4>
                <div className="kpi-value">{metric.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Revenue by Subscription Tier Chart */}
        <section className="analytics-section">
          <h3>Revenue by Subscription Tier</h3>
          <div className="chart-container">
            <Bar data={revenueChartData} options={{ responsive: true }} />
          </div>
        </section>

        {/* Feature Usage Stats */}
        <section className="analytics-section">
          <h3>Feature Usage Statistics</h3>
          <div className="feature-usage">
            <div className="chart-container">
              <Bar
                data={{
                  labels: featureUsageStats.map((item) => item.feature),
                  datasets: [
                    {
                      label: "Usage",
                      data: featureUsageStats.map((item) => item.usage),
                      backgroundColor: "#ff8c42",
                      borderColor: "#ff8c42",
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{ responsive: true }}
              />
            </div>
          </div>
        </section>

        {/* License Utilization Reports */}
        <section className="analytics-section">
          <h3>License Utilization</h3>
          <div className="table-section">
            <table>
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Used Licenses</th>
                  <th>Total Licenses</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {licenseUtilization.map((item) => (
                  <tr key={item.organization}>
                    <td>{item.organization}</td>
                    <td>{item.usedLicenses}</td>
                    <td>{item.totalLicenses}</td>
                    <td>
                      <button className="btn-manage">Manage</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Expiry Tracking */}
        <section className="analytics-section">
          <h3>Expiry Tracking</h3>
          <div className="expiry-tracking">
            <table>
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Subscription Expiry</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {expiryTracking.map((item) => (
                  <tr key={item.organization}>
                    <td>{item.organization}</td>
                    <td>{new Date(item.expiryDate).toLocaleDateString()}</td>
                    <td>{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AnalyticsPage;