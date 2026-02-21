const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const pool = require('./config/db');
const authroutes = require("./routes/authroutes");
const attendanceroutes = require('./routes/attendanceRoutes');
const leaveroutes = require('./routes/leaveroutes');
const departmentroutes = require('./routes/departmentroutes');
const notificationroutes = require('./routes/notificationroutes');
const analyticsroutes = require('./routes/analyticsroutes');
const reportsRoutes = require('./routes/reportsroutes');
const userRoutes = require('./routes/userroutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const organizationSettingsRoutes = require('./routes/organizationSettingsRoutes');

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.send("✅ API is working correctly");
});

// Use auth routes
app.use("/api/auth", authroutes);
app.use("/api/attendance", attendanceroutes);
app.use("/api/leaves", leaveroutes);
app.use('/api/departments', departmentroutes);
app.use('/api/notifications', notificationroutes);
app.use('/api/analytics', analyticsroutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings/organization', organizationSettingsRoutes);

// Super admin routes
app.use('/api/superadmin', superAdminRoutes);

// Test route
app.get("/test-org", async (req, res) => {
  try {
    const r = await pool.query("SELECT COUNT(*) FROM public.organization");
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api`);
});

module.exports = app;
