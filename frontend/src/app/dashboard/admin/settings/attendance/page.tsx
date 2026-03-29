"use client";

import React, { useEffect, useState } from "react";
import SidebarAdmin from "@/src/app/components/sideBar/admin/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import { getOrganizationSettingsApi, updateOrganizationSettingsApi } from "@/src/api/api";
import "./page.scss";

export default function AttendanceSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [settings, setSettings] = useState({
    wifi_ip_ranges: ["192.168.100.0/24"],
    shift_start_time: "10:00:00",
    shift_end_time: "19:00:00",
    late_threshold_minutes: 0,
    grace_period_minutes: 0,
    early_departure_threshold_minutes: 30,
    half_day_hours: 4
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await getOrganizationSettingsApi();
      if (res.data?.data) {
        setSettings(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      
      await updateOrganizationSettingsApi(settings);
      setSuccess("Settings updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-dashboard">
      <SidebarAdmin />
      
      <main className="main-content">
        <div className="header">
          <SearchBox />
        </div>

        <h1>AISE - Attendance Settings</h1>
        <p className="subtitle">Configure WiFi IP ranges and shift timings for attendance tracking</p>
        
        {error && <div className="banner banner-error">{error}</div>}
        {success && <div className="banner banner-success">{success}</div>}

        <form onSubmit={handleSubmit} className="settings-form">
          <div className="form-section">
            <h3>WiFi Configuration</h3>
            <p className="section-desc">Employees must be connected to these IP ranges to mark attendance</p>
            <div className="form-group">
              <label>Allowed IP Ranges (one per line)</label>
              <textarea
                value={settings.wifi_ip_ranges.join("\n")}
                onChange={(e) => setSettings({
                  ...settings,
                  wifi_ip_ranges: e.target.value.split("\n").filter(ip => ip.trim())
                })}
                rows={5}
                placeholder="192.168.100.0/24&#10;127.0.0.1"
              />
              <small>Use CIDR notation (e.g., 192.168.100.0/24) or exact IPs. Localhost (127.0.0.1) is included for testing.</small>
            </div>
          </div>

          <div className="form-section">
            <h3>Shift Timings</h3>
            <p className="section-desc">Define your organization's working hours</p>
            <div className="form-row">
              <div className="form-group">
                <label>Shift Start Time</label>
                <input
                  type="time"
                  value={settings.shift_start_time}
                  onChange={(e) => setSettings({...settings, shift_start_time: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Shift End Time</label>
                <input
                  type="time"
                  value={settings.shift_end_time}
                  onChange={(e) => setSettings({...settings, shift_end_time: e.target.value})}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Attendance Policies</h3>
            <p className="section-desc">Configure grace periods and thresholds</p>
            <div className="form-row">
              <div className="form-group">
                <label>Grace Period (minutes)</label>
                <input
                  type="number"
                  min="0"
                  value={settings.grace_period_minutes}
                  onChange={(e) => setSettings({...settings, grace_period_minutes: parseInt(e.target.value) || 0})}
                />
                <small>Employees can check-in this many minutes late without being marked "Late"</small>
              </div>
              <div className="form-group">
                <label>Half Day Hours</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={settings.half_day_hours}
                  onChange={(e) => setSettings({...settings, half_day_hours: parseInt(e.target.value) || 4})}
                />
                <small>Minimum hours required for a half-day</small>
              </div>
            </div>
          </div>

          <button type="submit" className="btn-save" disabled={loading}>
            {loading ? "Saving..." : "Save Settings"}
          </button>
        </form>
      </main>
    </div>
  );
}
