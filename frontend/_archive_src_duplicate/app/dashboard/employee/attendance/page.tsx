"use client";

import React, { useEffect, useState } from "react";
import SidebarEmployee from "@/src/app/components/sideBar/employee/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import { Download, Wifi, WifiOff, LogIn, LogOut, Calendar, Clock, TrendingUp } from "lucide-react";

import {
  todayStatusApi,
  historyApi,
  pingApi,
  checkInApi,
  checkOutApi,
  getDeviceId,
  api,
} from "@/src/api/api";

import "./page.scss";

export default function EmployeeAttendancePage() {
  const [today, setToday] = useState<{ status: string; check_in?: string; check_out?: string } | null>(null);
  const [history, setHistory] = useState<{ check_in: string; check_out?: string; status: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [canMarkAttendance, setCanMarkAttendance] = useState(false);
  const [canCheckout, setCanCheckout] = useState(false);
  const [isOnNetwork, setIsOnNetwork] = useState(true);

  /* ------------------ FETCH TODAY STATUS ------------------ */
  const fetchTodayStatus = async () => {
    try {
      const res = await todayStatusApi();
      const attendance = res.data.attendance;
      setToday(attendance || { status: "absent" });
      
      // Update button states
      if (attendance) {
        setCanMarkAttendance(false);
        setCanCheckout(attendance.check_in && !attendance.check_out);
      } else {
        setCanMarkAttendance(true);
        setCanCheckout(false);
      }
    } catch (err) {
      console.error(err);
      setCanMarkAttendance(true);
      setCanCheckout(false);
    }
  };

  /* ------------------ FETCH HISTORY ------------------ */
  const fetchHistory = async () => {
    try {
      const res = await historyApi();
      setHistory(res.data.history || []);
    } catch (err) {
      console.error(err);
    }
  };

  /* ------------------ HANDLE CHECK IN ------------------ */
  const handleCheckIn = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      
      const res = await checkInApi({ deviceId: getDeviceId() });
      
      if (res.data.success) {
        setSuccess(`✓ Checked in successfully! Status: ${res.data.status}`);
        setTimeout(() => setSuccess(""), 5000);
        await fetchTodayStatus();
        await fetchHistory();
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to mark attendance";
      setError(errorMsg);
      
      if (errorMsg.includes("WiFi") || errorMsg.includes("office network")) {
        setIsOnNetwork(false);
      }
    } finally {
      setLoading(false);
    }
  };

  /* ------------------ HANDLE CHECK OUT ------------------ */
  const handleCheckOut = async () => {
    try {
      setCheckoutLoading(true);
      setError("");
      setSuccess("");
      
      const res = await checkOutApi();
      
      if (res.data.success) {
        setSuccess(`✓ Checked out successfully!`);
        setTimeout(() => setSuccess(""), 5000);
        await fetchTodayStatus();
        await fetchHistory();
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to checkout";
      setError(errorMsg);
    } finally {
      setCheckoutLoading(false);
    }
  };

  /* ------------------ AUTO PING + WIFI DISCONNECT LOGIC ------------------ */
  useEffect(() => {
    let isOnline = navigator.onLine;
    let lastSuccessfulPing = Date.now();
    const checkoutTimeout: NodeJS.Timeout | null = null;

    const pingOffice = async () => {
      try {
        await pingApi();
        lastSuccessfulPing = Date.now();
        setIsOnNetwork(true);
        console.log("✅ Office ping successful");

        // Refresh status after ping
        await fetchTodayStatus();

        if (checkoutTimeout) {
          clearTimeout(checkoutTimeout);
        }

      } catch (err: unknown) {
        const error = err as { message?: string; code?: string };
        console.log("❌ Network error or not in office:", error.message);
        setIsOnNetwork(false);

        if (error.code === 'NETWORK_ERROR' ||
          error.code === 'ECONNREFUSED' ||
          error.message?.includes('Network Error') ||
          error.message?.includes('fetch') ||
          !navigator.onLine) {
          console.log("📶 Network disconnected - Immediate checkout");
          handleImmediateCheckout();
        }
      }
    };

    const handleImmediateCheckout = async () => {
      try {
        console.log("🚪 WiFi disconnected - Immediate checkout triggered");
        await api.post("/api/attendance/auto-checkout");
        console.log("🚪 Immediate checkout successful");
        fetchTodayStatus();
        fetchHistory();
      } catch (err) {
        console.log("Immediate checkout failed:", err);
      }
    };

    const handleOnline = () => {
      if (!isOnline) {
        console.log("📶 WiFi reconnected - Resuming ping");
        isOnline = true;
        setIsOnNetwork(true);
        pingOffice();
      }
    };

    const handleOffline = () => {
      if (isOnline) {
        console.log("📶 WiFi disconnected - Immediate checkout");
        isOnline = false;
        setIsOnNetwork(false);
        handleImmediateCheckout();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleNetworkDisconnect = () => {
      console.log("📶 Network disconnect detected from API");
      setIsOnNetwork(false);
      handleImmediateCheckout();
    };
    window.addEventListener('network-disconnect', handleNetworkDisconnect);

    const fallbackTimeout = setTimeout(() => {
      if (Date.now() - lastSuccessfulPing > 2 * 60 * 1000) {
        console.log("⏰ 2 minutes no ping - Fallback checkout");
        handleImmediateCheckout();
      }
    }, 2 * 60 * 1000);

    pingOffice();
    const interval = setInterval(pingOffice, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      if (checkoutTimeout) {
        clearTimeout(checkoutTimeout);
      }
      clearTimeout(fallbackTimeout);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('network-disconnect', handleNetworkDisconnect);
    };
  }, []);

  /* ------------------ INIT LOAD ------------------ */
  useEffect(() => {
    const load = async () => {
      await fetchTodayStatus();
      await fetchHistory();
    };
    load();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "present":
        return "✅";
      case "late":
        return "⏰";
      case "early_leave":
        return "🚪";
      case "absent":
        return "❌";
      default:
        return "❓";
    }
  };

  const formatTime = (timestamp: string) => {
    if (!timestamp) return "—";
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    if (!timestamp) return "—";
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const calculateWorkHours = () => {
    if (!today?.check_in) return "—";
    const checkIn = new Date(today.check_in);
    const checkOut = today.check_out ? new Date(today.check_out) : new Date();
    const diff = checkOut.getTime() - checkIn.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="employee-attendance">
      <SidebarEmployee />

      <main className="main-content">
        <div className="header">
          <SearchBox />
        </div>

        <div className="page-heading">
          <h1>AISE - Attendance Intelligence</h1>
          <p>Smart attendance tracking with automatic check-in and real-time monitoring</p>
        </div>

        {/* AISE CONTROL PANEL */}
        <div className="aise-control-panel">
          <div className="network-status-bar">
            <div className={`network-indicator ${isOnNetwork ? 'online' : 'offline'}`}>
              {isOnNetwork ? <Wifi size={20} /> : <WifiOff size={20} />}
              <span>{isOnNetwork ? 'Connected to Office Network' : 'Not on Office Network'}</span>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {/* TODAY'S STATUS CARDS */}
          <div className="status-cards-grid">
            <div className="status-card status-badge-card">
              <div className="card-icon">
                <Calendar size={24} />
              </div>
              <div className="card-content">
                <span className="card-label">Status</span>
                <span className={`status-badge ${today?.status?.toLowerCase() || 'absent'}`}>
                  {getStatusIcon(today?.status || "absent")} {today?.status || "Not Checked In"}
                </span>
              </div>
            </div>

            <div className="status-card">
              <div className="card-icon check-in">
                <LogIn size={24} />
              </div>
              <div className="card-content">
                <span className="card-label">Check In</span>
                <span className="card-value">{formatTime(today?.check_in || "")}</span>
              </div>
            </div>

            <div className="status-card">
              <div className="card-icon check-out">
                <LogOut size={24} />
              </div>
              <div className="card-content">
                <span className="card-label">Check Out</span>
                <span className="card-value">{formatTime(today?.check_out || "")}</span>
              </div>
            </div>

            <div className="status-card">
              <div className="card-icon hours">
                <Clock size={24} />
              </div>
              <div className="card-content">
                <span className="card-label">Hours Worked</span>
                <span className="card-value">{calculateWorkHours()}</span>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="action-buttons">
            <button 
              onClick={handleCheckIn} 
              disabled={!canMarkAttendance || loading || !isOnNetwork}
              className="btn-action btn-check-in"
            >
              <LogIn size={22} />
              <span>{loading ? "Marking..." : canMarkAttendance ? "Mark Attendance" : "Already Checked In"}</span>
            </button>

            <button 
              onClick={handleCheckOut} 
              disabled={!canCheckout || checkoutLoading}
              className="btn-action btn-check-out"
            >
              <LogOut size={22} />
              <span>{checkoutLoading ? "Checking Out..." : canCheckout ? "Check Out" : "Not Available"}</span>
            </button>
          </div>

          {!isOnNetwork && (
            <div className="network-warning">
              <WifiOff size={18} />
              <span>You must be connected to the office WiFi to mark attendance</span>
            </div>
          )}

          <div className="info-banner">
            <TrendingUp size={20} />
            <div>
              <strong>Automatic Attendance Tracking</strong>
              <p>Your attendance is automatically marked when you connect to office WiFi. Periodic pings every 5 minutes ensure continuous tracking.</p>
            </div>
          </div>
        </div>

        {/* ATTENDANCE HISTORY */}
        <div className="history-section">
          <div className="section-header">
            <h2>Attendance History</h2>
            <button className="export-btn">
              <Download size={18} />
              Export
            </button>
          </div>

          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Check-In</th>
                  <th>Check-Out</th>
                  <th>Hours</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {history.map((row, i) => {
                  const checkIn = new Date(row.check_in);
                  const checkOut = row.check_out ? new Date(row.check_out) : null;
                  const hours = checkOut 
                    ? `${Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60))}h ${Math.floor(((checkOut.getTime() - checkIn.getTime()) % (1000 * 60 * 60)) / (1000 * 60))}m`
                    : "—";

                  return (
                    <tr key={i}>
                      <td className="date-cell">{formatDate(row.check_in)}</td>
                      <td>{formatTime(row.check_in)}</td>
                      <td>{formatTime(row.check_out || "")}</td>
                      <td>{hours}</td>
                      <td>
                        <span className={`status-badge ${row.status?.toLowerCase()}`}>
                          {getStatusIcon(row.status)} {row.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {history.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-state">
                      <div>
                        <Calendar size={48} />
                        <p>No attendance records found</p>
                        <small>Connect to office WiFi to mark attendance automatically</small>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
