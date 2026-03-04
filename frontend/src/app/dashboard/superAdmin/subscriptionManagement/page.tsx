"use client";

import React, { useEffect, useState } from "react";
import SidebarSuperAdmin from "@/src/app/components/sideBar/superAdmin/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import { getAllOrganizationsApi, updateOrganizationSubscriptionApi } from "@/src/api/api"; // Importing necessary APIs
import "./page.scss";

// Define types for the Organization and Subscription Tier
interface Organization {
  id: string;
  name: string;
  subscriptionTier: string; // Example: "Basic", "Standard", "Premium"
}

interface TierDetails {
  name: string;
  userLimit: number | string;
  modules: string[];
  features: string[];
  storage: string;
}

const SubscriptionPage = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]); // Organization state with correct types
  const [loading, setLoading] = useState(false); 
  const [error, setError] = useState<string | null>(null);

  // Subscription Tier details (Static Data)
  const tiers: TierDetails[] = [
    {
      name: "Basic Tier",
      userLimit: 10,
      modules: ["Attendance", "Basic Reports"],
      features: ["Check-in/out", "Basic Analytics"],
      storage: "1GB",
    },
    {
      name: "Standard Tier",
      userLimit: 50,
      modules: ["Attendance", "Basic Reports", "Leave Management", "Departments"],
      features: ["Advanced Analytics", "Email Notifications"],
      storage: "10GB",
    },
    {
      name: "Premium Tier",
      userLimit: "Unlimited",
      modules: [
        "Attendance",
        "Basic Reports",
        "Leave Management",
        "Departments",
        "Advanced Reports",
        "API Access",
      ],
      features: ["Custom Workflows", "Priority Support"],
      storage: "100GB",
    },
  ];

  // Fetch organizations and their current subscription
  const loadOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await getAllOrganizationsApi(); // Fetch data from API
      setOrganizations(res.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load organizations.");
    } finally {
      setLoading(false);
    }
  };

  // Update subscription tier for the organization
  const handleSubscriptionChange = async (orgId: string, tier: string) => {
    try {
      setLoading(true);
      setError(null);

      await updateOrganizationSubscriptionApi(orgId, { tier }); // Update subscription using the API
      loadOrganizations(); // Reload organizations after the update
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to update subscription.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  return (
    <div className="subscription-dashboard">
      <SidebarSuperAdmin />
      <main className="main-content">
        <div className="header">
          <SearchBox /> {/* Placeholder for future search implementation */}
        </div>

        {error && <div className="banner banner-error">{error}</div>}
        {loading && <div className="banner banner-loading">Loading...</div>}

        {/* Subscription Tiers */}
        <section className="subscription-tiers">
          <h3>Subscription Tiers & Feature Gating</h3>
          <div className="tier-cards">
            {tiers.map((tier, index) => (
              <div key={index} className="tier-card">
                <h4>{tier.name}</h4>
                <ul>
                  <li><strong>User Limit:</strong> {tier.userLimit}</li>
                  <li><strong>Modules:</strong> {tier.modules.join(", ")}</li>
                  <li><strong>Features:</strong> {tier.features.join(", ")}</li>
                  <li><strong>Storage:</strong> {tier.storage}</li>
                </ul>
                <div className="actions">
                  <button
                    className="btn-upgrade"
                    onClick={() => handleSubscriptionChange("someOrgId", tier.name)} // Replace "someOrgId" with actual organization ID
                  >
                    Upgrade/Downgrade to {tier.name}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Organizations using specific tiers */}
        <section className="organizations-tier">
          <h3>Organizations</h3>
          <table>
            <thead>
              <tr>
                <th>Organization Name</th>
                <th>Current Subscription</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr key={org.id}>
                  <td>{org.name}</td>
                  <td>{org.subscriptionTier}</td>
                  <td>
                    <button
                      className="btn-upgrade"
                      onClick={() => handleSubscriptionChange(org.id, "Premium Tier")}
                    >
                      Upgrade to Premium
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
};

export default SubscriptionPage;