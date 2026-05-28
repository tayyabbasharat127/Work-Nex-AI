import React from "react";
import "./statsCard.scss";

interface Stat {
  title?: string;
  subtitle?: string;
  value?: number | string;
  trend?: "up" | "down" | "flat";
  change?: string;
  label?: string;
}

interface Props {
  stats: Stat[];
}

export const StatsCard: React.FC<Props> = ({ stats }) => {
  return (
    <div className="stats-container">
      {stats.map((stat, idx) => (
        <div key={idx} className="stat-card">
          <div className="stat-header">
            <span className="stat-label">{stat.title || "Overview"}</span>
            {stat.subtitle && (
              <span className="stat-period">{stat.subtitle}</span>
            )}
          </div>
          <div className="stat-value">{stat.value ?? "—"}</div>
          <div className="stat-footer">
            {stat.change ? (
              <span className={`trend ${stat.trend ?? "flat"}`}>
                {stat.trend === "down"
                  ? "↓"
                  : stat.trend === "up"
                  ? "↑"
                  : "•"}{" "}
                {stat.change}
              </span>
            ) : (
              <span className="trend flat">•</span>
            )}
            {stat.label && (
              <span className="stat-description">{stat.label}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
