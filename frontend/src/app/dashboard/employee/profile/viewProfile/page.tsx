import React from 'react';
import './page.scss';

const AdminProfile = () => {
  return (
    <div className="employee-profile-page">
      <div className="profile-header">
        <div className="avatar">
          {/* Custom Image */}
          <img src="https://www.w3schools.com/w3images/avatar2.png" alt="Employee Avatar" />
        </div>
        <div className="profile-info">
          <h1 className="name">Employee Name</h1>
          <p className="email">employee@responder.com</p>
          <div className="actions">
            <button className="btn">Edit Profile</button>
            <button className="btn logout-btn">Logout</button>
          </div>
        </div>
      </div>

      <div className="roles-section">
        <h2>Assigned Roles</h2>
        <div className="role-list">
          <div className="role">
            <span className="role-name">Administrator</span>
            <span className="role-permission">Full access to system & settings</span>
          </div>
          <div className="role">
            <span className="role-name">Manager</span>
            <span className="role-permission">Manage teams, view analytics, approve leave</span>
          </div>
        </div>
      </div>

      <div className="account-settings">
        <h2>Account Settings</h2>
        <ul>
          <li><strong>Role:</strong> Admin</li>
          <li><strong>Last Login:</strong> 10 minutes ago</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminProfile;
