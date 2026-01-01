const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const pool = require('./config/db');
const authroutes = require("./routes/authroutes");
const attendanceroutes = require('./routes/attendanceRoutes');
const leaveroutes = require('./routes/leaveroutes');
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


// Test Sequelize DB connection
/*
db.sequelize.authenticate()
  .then(() => console.log('✅ PostgreSQL connected via Sequelize'))
  .catch(err => console.error('❌ Sequelize connection error:', err));
  */ 
  app.get("/test-org", async (req, res) => {
  try {
    const r = await pool.query("SELECT COUNT(*) FROM public.organization");
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
