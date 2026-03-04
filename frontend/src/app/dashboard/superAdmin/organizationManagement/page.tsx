"use client";

import React, { useEffect, useState, useMemo } from "react";
import SidebarSuperAdmin from "@/src/app/components/sideBar/superAdmin/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import "./page.scss";

import {
  getAllOrganizationsApi,
  updateOrganizationStatusApi,
  renewSubscriptionApi,
  upgradeDowngradeTierApi,
  manageLicensesApi,
} from "@/src/api/api";

type OrganizationRow = {
  id: string;
  name: string;
  email: string;
  subscriptionTier: string;
  subscriptionExpiry: string; // ISO Date
  userCount: number;
  licensesUsed: number;
  activeModules: string[];
  status: "Active" | "Suspended";
};

export default function OrganizationManagementPage() {
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // -----------------------------
  // Fetch all organizations
  // -----------------------------
  const loadOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await getAllOrganizationsApi();
      setOrganizations(res.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load organizations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------
  // Filter organizations based on search query
  // -----------------------------
  const filteredOrganizations = useMemo(() => {
    return organizations.filter((org) =>
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [organizations, searchQuery]);

  // -----------------------------
  // Admin actions
  // -----------------------------
  const handleRenewSubscription = async (orgId: string) => {
    try {
      setLoading(true);
      setError(null);

      await renewSubscriptionApi(orgId);
      loadOrganizations();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to renew subscription.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeDowngradeTier = async (orgId: string, tier: string) => {
    try {
      setLoading(true);
      setError(null);

      await upgradeDowngradeTierApi(orgId, { tier });
      loadOrganizations();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to update tier.");
    } finally {
      setLoading(false);
    }
  };

  const handleManageLicenses = async (orgId: string, action: "add" | "remove", licenses: number) => {
    try {
      setLoading(true);
      setError(null);

      await manageLicensesApi(orgId, { action, licenses });
      loadOrganizations();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to manage licenses.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (orgId: string, status: "Active" | "Suspended") => {
    try {
      setLoading(true);
      setError(null);

      await updateOrganizationStatusApi(orgId, { status });
      loadOrganizations();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to update status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="organization-management-dashboard">
      <SidebarSuperAdmin />

      <main className="main-content">
        <div className="header">
          <SearchBox   />
        </div>

        {error && <div className="banner banner-error">{error}</div>}
        {loading && <div className="banner banner-loading">Working...</div>}

        {/* Organization Table */}
        <section className="organization-grid">
          <div className="table-section">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3>All Organizations</h3>
              <button className="btn-refresh" onClick={loadOrganizations} disabled={loading}>
                Refresh
              </button>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Subscription Tier</th>
                  <th>Subscription Expiry</th>
                  <th>User Count</th>
                  <th>Licenses Used</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {!loading && filteredOrganizations.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 20, textAlign: "center" }}>
                      No organizations found.
                    </td>
                  </tr>
                ) : (
                  filteredOrganizations.map((org) => {
                    return (
                      <tr key={org.id}>
                        <td>{org.name}</td>
                        <td>{org.email}</td>
                        <td>{org.subscriptionTier}</td>
                        <td>{new Date(org.subscriptionExpiry).toLocaleDateString()}</td>
                        <td>{org.userCount}</td>
                        <td>{org.licensesUsed}</td>
                        <td>{org.status}</td>
                        <td>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button
                              className="btn-approve"
                              disabled={loading}
                              onClick={() => handleRenewSubscription(org.id)}
                            >
                              Renew Subscription
                            </button>
                            <button
                              className="btn-upgrade"
                              disabled={loading}
                              onClick={() => handleUpgradeDowngradeTier(org.id, "Premium")}
                            >
                              Upgrade Tier
                            </button>
                            <button
                              className="btn-downgrade"
                              disabled={loading}
                              onClick={() => handleUpgradeDowngradeTier(org.id, "Basic")}
                            >
                              Downgrade Tier
                            </button>
                            <button
                              className="btn-manage"
                              disabled={loading}
                              onClick={() => handleManageLicenses(org.id, "add", 5)}
                            >
                              Add Licenses
                            </button>
                            <button
                              className="btn-manage"
                              disabled={loading}
                              onClick={() => handleManageLicenses(org.id, "remove", 5)}
                            >
                              Remove Licenses
                            </button>
                            <button
                              className="btn-suspend"
                              disabled={loading}
                              onClick={() => handleToggleStatus(org.id, "Suspended")}
                            >
                              Suspend
                            </button>
                            <button
                              className="btn-activate"
                              disabled={loading}
                              onClick={() => handleToggleStatus(org.id, "Active")}
                            >
                              Activate
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}