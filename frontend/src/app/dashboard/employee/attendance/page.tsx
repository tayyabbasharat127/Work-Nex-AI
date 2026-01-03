"use client";

import React, { useEffect, useState } from "react";
import SidebarEmployee from "@/src/app/components/sideBar/employee/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import { Download } from "lucide-react";

import {
  todayStatusApi,
  historyApi,
  pingApi,
  api,
} from "@/src/api/api";

import "./page.scss";

export default function EmployeeAttendancePage() {
  const [today, setToday] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  /* ------------------ AUTO PING + WIFI DISCONNECT LOGIC ------------------ */
  useEffect(() => {
    let isOnline = navigator.onLine;
    let lastSuccessfulPing = Date.now();
    let checkoutTimeout: NodeJS.Timeout | null = null;

    const pingOffice = async () => {
      try {
        await pingApi();
        lastSuccessfulPing = Date.now();
        console.log("✅ Office ping successful - Attendance marked automatically");
        
        // Clear any pending checkout timeout
        if (checkoutTimeout) {
          clearTimeout(checkoutTimeout);
        }
        
      } catch (err: any) {
        console.log("❌ Network error or not in office:", err.message);
        
        // Check if it's a network error (WiFi disconnected)
        if (err.code === 'NETWORK_ERROR' || 
            err.code === 'ECONNREFUSED' || 
            err.message?.includes('Network Error') ||
            err.message?.includes('fetch') ||
            !navigator.onLine) {
          console.log("📶 Network disconnected - Immediate checkout");
          handleImmediateCheckout();
        }
      }
    };

    const handleImmediateCheckout = async () => {
      try {
        console.log("🚪 WiFi disconnected - Immediate checkout triggered");
        
        // Call checkout API immediately
        await api.post("/api/attendance/auto-checkout");
        console.log("🚪 Immediate checkout successful");
        
        // Refresh status
        fetchTodayStatus();
        fetchHistory();
        
      } catch (err) {
        console.log("Immediate checkout failed:", err);
      }
    };

    // Listen for online/offline events
    const handleOnline = () => {
      if (!isOnline) {
        console.log("📶 WiFi reconnected - Resuming ping");
        isOnline = true;
        pingOffice(); // Ping immediately when back online
      }
    };

    const handleOffline = () => {
      if (isOnline) {
        console.log("📶 WiFi disconnected - Immediate checkout");
        isOnline = false;
        handleImmediateCheckout(); // Checkout immediately when disconnected
      }
    };

    // Add event listeners for WiFi connect/disconnect
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for custom network disconnect event from API interceptor
    const handleNetworkDisconnect = () => {
      console.log("📶 Network disconnect detected from API");
      handleImmediateCheckout();
    };
    window.addEventListener('network-disconnect', handleNetworkDisconnect);

    // Fallback: If no ping success for 2 minutes, assume disconnected
    const fallbackTimeout = setTimeout(() => {
      if (Date.now() - lastSuccessfulPing > 2 * 60 * 1000) {
        console.log("⏰ 2 minutes no ping - Fallback checkout");
        handleImmediateCheckout();
      }
    }, 2 * 60 * 1000); // 2 minutes

    // Ping immediately when page loads
    pingOffice();

    // Ping every 5 minutes to maintain presence
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

  /* ------------------ FETCH TODAY STATUS ------------------ */
  const fetchTodayStatus = async () => {
    try {
      const res = await todayStatusApi();
      setToday(res.data.attendance || { status: "absent" });
    } catch (err) {
      console.error(err);
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

  /* ------------------ INIT LOAD ------------------ */
  useEffect(() => {
    fetchTodayStatus();
    fetchHistory();
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

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "present":
        return "#4caf50";
      case "late":
        return "#ff9800";
      case "early_leave":
        return "#2196f3";
      case "absent":
        return "#f44336";
      default:
        return "#9e9e9e";
    }
  };

  return (
    <div className="employee-attendance">
      <SidebarEmployee />

      <main className="main-content">
        <div className="header">
          <SearchBox />
        </div>

        <div className="page-heading">
          <h1>Attendance</h1>
          <p>Your attendance is marked automatically when you're in office.</p>
        </div>

        {/* TODAY'S STATUS CARD */}
        <div className="attendance-grid">
          <div className="column">
            <div className="card-box status-card">
              <h3>Today's Status</h3>
              
              <div className="status-display">
                <div className="status-icon" style={{ color: getStatusColor(today?.status) }}>
                  {getStatusIcon(today?.status)}
                </div>
                
                <div className="status-details">
                  <h4>{today?.status || "Absent"}</h4>
                  <p>
                    {today?.status?.toLowerCase() === "absent" 
                      ? "No attendance recorded today" 
                      : "Attendance marked automatically"}
                  </p>
                </div>
              </div>

              <div className="datetime">
                <p>
                  <strong>Check In:</strong>{" "}
                  {today?.check_in
                    ? new Date(today.check_in).toLocaleTimeString()
                    : "—"}
                </p>
                <p>
                  <strong>Check Out:</strong>{" "}
                  {today?.check_out
                    ? new Date(today.check_out).toLocaleTimeString()
                    : "—"}
                </p>
              </div>

              <div className="info-box">
                <p>
                  <strong>📍 Automatic Attendance</strong><br/>
                  Your attendance is marked automatically when you connect to office Wi-Fi.
                  No manual check-in required.
                </p>
              </div>
            </div>
          </div>

          {/* ATTENDANCE HISTORY */}
          <div className="column">
            <div className="card-box table-card">
              <div className="table-header">
                <h3>Attendance History</h3>
                <button className="export-btn">
                  <Download size={16} />
                  Export
                </button>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Check-In</th>
                    <th>Check-Out</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {history.map((row, i) => (
                    <tr key={i}>
                      <td>
                        {new Date(row.check_in).toLocaleDateString()}
                      </td>
                      <td>
                        {row.check_in
                          ? new Date(row.check_in).toLocaleTimeString()
                          : "—"}
                      </td>
                      <td>
                        {row.check_out
                          ? new Date(row.check_out).toLocaleTimeString()
                          : "—"}
                      </td>
                      <td>
                        <span className={`status ${row.status}`}>
                          {getStatusIcon(row.status)} {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {history.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", padding: "40px" }}>
                        <div>
                          <p style={{ opacity: 0.6 }}>No attendance records found</p>
                          <small>Connect to office Wi-Fi to mark attendance automatically</small>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
