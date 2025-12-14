import React from "react";
import "./statsCard.scss";

interface Stat {
  value?: number | string;
  trend?: string;
  change?: string;
  label: string;
}

interface PROPS {
  stats: Stat[];
}

export const StatsCard: React.FC<PROPS> = ({ stats }) => {
  return (
    <div className="stats-container">
      {stats.map((stat, idx) => (
        <div key={idx} className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Admin</span>
            <span className="stat-period">Weekly Attendance</span>
          </div>
          <div className="stat-value">{stat.value}</div>
          <div className="stat-footer">
            <span className={`trend ${stat.trend}`}>
              {stat.trend === "down" ? "↓" : "↑"} {stat.change || ""}
            </span>
            <span className="stat-description">{stat.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
