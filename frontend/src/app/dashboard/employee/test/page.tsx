"use client";

import React from "react";
import SidebarEmployee from "@/src/app/components/sideBar/employee/sidebar";

export default function EmployeeTest() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa' }}>
      <SidebarEmployee />
      
      <main style={{ 
        flex: 1, 
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <h1 style={{ fontSize: '2rem', color: '#2d3436', marginBottom: '1rem' }}>
          Employee Dashboard Test
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#6b7280' }}>
          If you can see this page, the dashboard is working!
        </p>
        <div style={{
          padding: '2rem',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ color: '#6c5ce7', marginBottom: '1rem' }}>Test Components</h2>
          <p>✅ Sidebar loads</p>
          <p>✅ Layout works</p>
          <p>✅ Styles applied</p>
        </div>
      </main>
    </div>
  );
}
