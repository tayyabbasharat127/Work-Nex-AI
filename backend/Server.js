const express = require('express');
const cors = require('cors');
const pool = require('./config/db'); // Correct import
const userroutes = require('./routes/userroutes');
const leaveroutes = require('./routes/attendanceroute');
const authroutes = require('./routes/authroutes');
const dotenv = require('dotenv');
const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
dotenv.config();

// Test route
app.get('/', (req, res) => {
  res.send("✅ API is working correctly");
});
app.use("/api/user", userroutes);
app.use("/api/leave", leaveroutes);
app.use("/api/auth",authroutes)

// Example route to test DB
app.get('/time', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ time: result.rows[0].now });
  } catch (error) {
    console.error(error);
    res.status(500).send('Database error');
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Server started on port ${PORT}`);
});
