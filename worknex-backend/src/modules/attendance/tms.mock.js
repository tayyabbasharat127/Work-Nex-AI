/**
 * WorkNex AI — Mock TMS (Time Management System) Server
 *
 * This simulates a real biometric/card attendance machine API.
 * Used for development and demo when no physical TMS is available.
 *
 * In production: replace TMS_API_URL with your real machine's API endpoint.
 *
 * Mount this as a separate Express router at /tms-mock
 */

const express = require('express');
const router  = express.Router();
const prisma  = require('../../config/db');

// Simulate the TMS API endpoint that the real machine would expose
// GET /tms-mock/attendance?date=YYYY-MM-DD
router.get('/attendance', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== 'mock-tms-key-2025') {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const dateStr = req.query.date || new Date().toISOString().split('T')[0];
  const date    = new Date(dateStr);
  date.setHours(0, 0, 0, 0);

  // Fetch all active employees and generate realistic mock records
  const employees = await prisma.user.findMany({
    where: { isActive: true },
    select: { employeeId: true, firstName: true },
  });

  const records = employees.map((emp) => {
    // Simulate realistic check-in times (8:30 AM – 10:30 AM PKT = 3:30–5:30 UTC)
    const rand        = Math.random();
    const isAbsent    = rand < 0.08;  // 8% absent
    const isLate      = !isAbsent && rand < 0.20; // 12% late

    if (isAbsent) {
      return { employeeId: emp.employeeId, date: dateStr, checkIn: null, checkOut: null, status: 'ABSENT' };
    }

    // Check-in: 8:30–9:30 AM PKT (3:30–4:30 UTC) for on-time, 9:31–10:30 for late
    const baseHourUTC = isLate ? 4 : 3;
    const checkInMin  = Math.floor(Math.random() * 60);
    const checkInHour = baseHourUTC + (isLate ? 1 : 0);

    const checkInDate  = new Date(date);
    checkInDate.setUTCHours(checkInHour, checkInMin, 0, 0);

    // Check-out: 12:00–13:30 UTC (5–6:30 PM PKT)
    const checkOutDate = new Date(date);
    checkOutDate.setUTCHours(12 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);

    return {
      employeeId: emp.employeeId,
      date:       dateStr,
      checkIn:    checkInDate.toISOString(),
      checkOut:   checkOutDate.toISOString(),
      status:     isLate ? 'LATE' : 'PRESENT',
    };
  });

  res.json({ date: dateStr, total: records.length, records });
});

module.exports = router;
