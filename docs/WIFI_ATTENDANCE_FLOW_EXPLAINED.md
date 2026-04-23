# WiFi-Based Attendance System - Complete Flow Explanation

## 📋 Table of Contents
1. [Current System (Before Changes)](#current-system)
2. [Enhanced System (After Changes)](#enhanced-system)
3. [Detailed Flow Diagrams](#detailed-flow-diagrams)
4. [Technical Architecture](#technical-architecture)
5. [Security & Validation](#security--validation)

---

## 🔵 Current System (Before Changes)

### What Exists Now:

```
┌─────────────────────────────────────────────────────────────┐
│              CURRENT ATTENDANCE SYSTEM                       │
└─────────────────────────────────────────────────────────────┘

Employee Action:
1. Employee arrives at office
2. Opens WorkNex dashboard
3. Clicks "Check In" button manually
4. System records: checkIn time, status (PRESENT/LATE)
5. Employee leaves office
6. Clicks "Check Out" button manually
7. System records: checkOut time, working hours

✅ What Works:
- Manual check-in/check-out
- Status calculation (PRESENT/LATE/HALF_DAY)
- Working hours calculation
- Attendance history tracking

❌ What's Missing:
- No IP address logging
- No automatic check-in
- No WiFi verification (disabled by default)
- No location tracking beyond lat/long
```

### Current Check-In Flow:

```
┌──────────────┐
│   Employee   │
│   Arrives    │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ Opens Dashboard      │
│ Clicks "Check In"    │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Frontend sends POST request:         │
│ POST /attendance/check-in            │
│ Body: { latitude, longitude }        │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Backend: attendance.service.js       │
│                                      │
│ 1. Call verifyOfficeNetwork(req)    │
│    └─> Currently DISABLED           │
│    └─> Always returns allowed=true  │
│                                      │
│ 2. Check if already checked in      │
│    └─> Query database for today     │
│                                      │
│ 3. Calculate status (LATE/PRESENT)  │
│    └─> Compare time with 9:30 AM    │
│                                      │
│ 4. Save to database:                │
│    - userId                          │
│    - date (today)                    │
│    - checkIn (current time)          │
│    - status (PRESENT/LATE)           │
│    - latitude, longitude             │
│    - source: "MANUAL"                │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────┐
│ Return success       │
│ Show "Checked in!"   │
└──────────────────────┘
```

---

## 🟢 Enhanced System (After Changes)

### What Will Be Added:

```
┌─────────────────────────────────────────────────────────────┐
│           ENHANCED WIFI-BASED ATTENDANCE SYSTEM              │
└─────────────────────────────────────────────────────────────┘

New Features:

1. ✅ IP ADDRESS LOGGING
   - Captures employee's IP on every check-in
   - Stores in database for audit trail
   - Displays in attendance tables

2. ✅ AUTO CHECK-IN (Ping Mechanism)
   - Dashboard pings backend every 60 seconds
   - Automatically checks in when on office WiFi
   - No manual button click needed

3. ✅ WIFI VERIFICATION
   - Validates IP against allowed office ranges
   - Blocks check-in from non-office locations
   - Configurable via environment variables

4. ✅ IP DISPLAY
   - Shows IP in employee attendance table
   - Shows IP in manager attendance table
   - Helps identify location issues
```

---

## 📊 Detailed Flow Diagrams

### Flow 1: Manual Check-In with WiFi Verification

```
┌─────────────────────────────────────────────────────────────────┐
│                    MANUAL CHECK-IN FLOW                          │
│                  (With WiFi Verification)                        │
└─────────────────────────────────────────────────────────────────┘

Step 1: Employee Arrives
┌──────────────┐
│   Employee   │──▶ Connects to Office WiFi (192.168.1.x)
│   Arrives    │──▶ Gets IP: 192.168.1.45
└──────┬───────┘
       │
       ▼

Step 2: Opens Dashboard & Clicks Check In
┌──────────────────────┐
│ Frontend             │
│ - User clicks button │
│ - Sends POST request │
└──────┬───────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ POST /attendance/check-in           │
│ Headers:                            │
│   Authorization: Bearer <token>     │
│   X-Forwarded-For: 192.168.1.45    │
│ Body:                               │
│   { latitude: 31.5, longitude: 74 }│
└──────┬──────────────────────────────┘
       │
       ▼

Step 3: Backend Receives Request
┌─────────────────────────────────────────────────────┐
│ Backend: attendance.controller.js                   │
│                                                      │
│ const checkIn = async (req, res) => {              │
│   const { latitude, longitude } = req.body;        │
│   const record = await attendanceService.checkIn(  │
│     req.user.id,                                    │
│     latitude,                                       │
│     longitude,                                      │
│     req  // ← Pass request for IP extraction       │
│   );                                                │
│ }                                                    │
└──────┬──────────────────────────────────────────────┘
       │
       ▼

Step 4: WiFi Verification
┌─────────────────────────────────────────────────────┐
│ Backend: attendance.service.js                      │
│                                                      │
│ const checkIn = async (userId, lat, lng, req) => { │
│                                                      │
│   // STEP 4A: Verify Office Network                │
│   const networkCheck = verifyOfficeNetwork(req);   │
│   └─> Calls wifiVerification.js                    │
│                                                      │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│ Backend: wifiVerification.js                        │
│                                                      │
│ const verifyOfficeNetwork = (req) => {             │
│                                                      │
│   // Extract IP from request                        │
│   const clientIP = getClientIP(req);               │
│   └─> Checks X-Forwarded-For header                │
│   └─> Falls back to req.socket.remoteAddress       │
│   └─> Result: "192.168.1.45"                       │
│                                                      │
│   // Check if verification is enabled               │
│   if (WIFI_VERIFICATION_ENABLED !== 'true') {      │
│     return { allowed: true, reason: 'Disabled' };  │
│   }                                                  │
│                                                      │
│   // Get allowed IP ranges from .env               │
│   const allowedRanges = OFFICE_IP_RANGES.split(',');│
│   └─> Example: ["192.168.1.0/24", "10.0.0.0/8"]   │
│                                                      │
│   // Check if client IP matches any range          │
│   const isAllowed = allowedRanges.some(range =>    │
│     ipInRange(clientIP, range)                     │
│   );                                                 │
│                                                      │
│   return {                                          │
│     allowed: isAllowed,                            │
│     ip: clientIP,                                   │
│     reason: isAllowed                              │
│       ? 'IP verified'                              │
│       : `IP ${clientIP} not in allowed ranges`     │
│   };                                                 │
│ }                                                    │
└──────┬──────────────────────────────────────────────┘
       │
       ▼

Step 5: Decision Point - IP Allowed?
       │
       ├─────────────────┬─────────────────┐
       │                 │                 │
    ✅ YES            ❌ NO              
       │                 │
       ▼                 ▼
┌──────────────┐   ┌──────────────────────┐
│ Continue     │   │ Throw Error 403      │
│ Check-In     │   │ "Check-in requires   │
│              │   │  office network"     │
└──────┬───────┘   └──────────────────────┘
       │                 │
       ▼                 ▼
                   ┌──────────────────────┐
                   │ Return error to      │
                   │ frontend             │
                   │ Show error message   │
                   └──────────────────────┘

Step 6: Check for Duplicate
┌─────────────────────────────────────────────────────┐
│ Query database:                                      │
│                                                      │
│ SELECT * FROM Attendance                            │
│ WHERE userId = ? AND date = TODAY                   │
│                                                      │
│ If record exists AND checkIn is not null:          │
│   └─> Throw Error 409 "Already checked in"         │
│                                                      │
│ Otherwise: Continue                                 │
└──────┬──────────────────────────────────────────────┘
       │
       ▼

Step 7: Calculate Status (LATE or PRESENT)
┌─────────────────────────────────────────────────────┐
│ Get current time in local timezone (UTC+5 for PKT)  │
│                                                      │
│ Current time: 9:45 AM                               │
│ Late threshold: 9:30 AM (from .env)                │
│                                                      │
│ if (currentTime > lateThreshold) {                  │
│   status = 'LATE'                                   │
│ } else {                                             │
│   status = 'PRESENT'                                │
│ }                                                    │
│                                                      │
│ Result: status = 'LATE' (because 9:45 > 9:30)      │
└──────┬──────────────────────────────────────────────┘
       │
       ▼

Step 8: Save to Database
┌─────────────────────────────────────────────────────┐
│ INSERT INTO Attendance:                             │
│                                                      │
│ {                                                    │
│   userId: "abc-123",                                │
│   date: "2026-04-12",                               │
│   checkIn: "2026-04-12 09:45:00",                  │
│   status: "LATE",                                   │
│   latitude: 31.5,                                   │
│   longitude: 74.3,                                  │
│   ipAddress: "192.168.1.45",  ← NEW!               │
│   source: "MANUAL"                                  │
│ }                                                    │
└──────┬──────────────────────────────────────────────┘
       │
       ▼

Step 9: Return Success
┌─────────────────────────────────────────────────────┐
│ Response to Frontend:                               │
│                                                      │
│ {                                                    │
│   success: true,                                    │
│   message: "Checked in successfully",               │
│   data: {                                           │
│     id: "xyz-789",                                  │
│     checkIn: "2026-04-12 09:45:00",                │
│     status: "LATE",                                 │
│     ipAddress: "192.168.1.45"                       │
│   }                                                  │
│ }                                                    │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────┐
│ Frontend shows:      │
│ ✅ "Checked in!"     │
│ Status: Late         │
└──────────────────────┘
```

---

### Flow 2: Auto Check-In (Ping Mechanism)

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTO CHECK-IN FLOW                            │
│                    (Ping Mechanism)                              │
└─────────────────────────────────────────────────────────────────┘

Step 1: Employee Opens Dashboard
┌──────────────────────┐
│ Employee arrives     │──▶ Connects to Office WiFi
│ Opens dashboard      │──▶ IP: 192.168.1.45
└──────┬───────────────┘
       │
       ▼

Step 2: Dashboard Layout Mounts
┌─────────────────────────────────────────────────────┐
│ Frontend: dashboard/layout.jsx                      │
│                                                      │
│ useEffect(() => {                                   │
│   console.log('Starting attendance ping');         │
│   attendancePing.start();  ← Starts ping service   │
│                                                      │
│   return () => {                                    │
│     attendancePing.stop();  ← Cleanup on unmount   │
│   };                                                 │
│ }, []);                                              │
└──────┬──────────────────────────────────────────────┘
       │
       ▼

Step 3: Ping Service Starts
┌─────────────────────────────────────────────────────┐
│ Frontend: services/attendancePing.js                │
│                                                      │
│ class AttendancePingService {                       │
│   start() {                                         │
│     // Ping immediately                             │
│     this.ping();                                    │
│                                                      │
│     // Then ping every 60 seconds                   │
│     this.intervalId = setInterval(() => {          │
│       this.ping();                                  │
│     }, 60000);                                       │
│   }                                                  │
│                                                      │
│   async ping() {                                    │
│     const result = await attendanceAPI.ping();     │
│     console.log('Ping result:', result);           │
│   }                                                  │
│ }                                                    │
└──────┬──────────────────────────────────────────────┘
       │
       ▼

Step 4: Ping Request Sent (Every 60 seconds)
┌─────────────────────────────────────────┐
│ POST /attendance/ping                   │
│ Headers:                                │
│   Authorization: Bearer <token>         │
│   X-Forwarded-For: 192.168.1.45        │
│ Body: (empty)                           │
└──────┬──────────────────────────────────┘
       │
       ▼

Step 5: Backend Processes Ping
┌─────────────────────────────────────────────────────┐
│ Backend: attendance.service.js                      │
│                                                      │
│ const autoPing = async (userId, req) => {          │
│                                                      │
│   // STEP 5A: Verify Office Network                │
│   const networkCheck = verifyOfficeNetwork(req);   │
│                                                      │
│   if (!networkCheck.allowed) {                     │
│     return {                                        │
│       action: 'ignored',                           │
│       reason: 'Not on office network',             │
│       ip: networkCheck.ip                          │
│     };                                              │
│   }                                                  │
│                                                      │
│   // STEP 5B: Check if already checked in          │
│   const existing = await findTodayAttendance();    │
│                                                      │
│   if (existing?.checkIn) {                         │
│     return {                                        │
│       action: 'already_checked_in',                │
│       ip: networkCheck.ip                          │
│     };                                              │
│   }                                                  │
│                                                      │
│   // STEP 5C: Auto Check-In!                       │
│   await createAttendance({                         │
│     userId,                                         │
│     checkIn: now,                                   │
│     status: calculateStatus(),                     │
│     ipAddress: networkCheck.ip,                    │
│     source: 'AUTO_PING'  ← Different from MANUAL   │
│   });                                                │
│                                                      │
│   return {                                          │
│     action: 'auto_checked_in',                     │
│     status: 'PRESENT',                             │
│     ip: networkCheck.ip                            │
│   };                                                 │
│ }                                                    │
└──────┬──────────────────────────────────────────────┘
       │
       ▼

Step 6: Response Scenarios

Scenario A: First Ping (Not Checked In Yet)
┌─────────────────────────────────────────┐
│ Response:                               │
│ {                                       │
│   action: 'auto_checked_in',           │
│   status: 'PRESENT',                   │
│   ip: '192.168.1.45'                   │
│ }                                       │
│                                         │
│ Frontend Console:                       │
│ ✅ "Auto checked-in successfully!"     │
└─────────────────────────────────────────┘

Scenario B: Subsequent Pings (Already Checked In)
┌─────────────────────────────────────────┐
│ Response:                               │
│ {                                       │
│   action: 'already_checked_in',        │
│   ip: '192.168.1.45'                   │
│ }                                       │
│                                         │
│ Frontend Console:                       │
│ "Attendance ping: already_checked_in"  │
└─────────────────────────────────────────┘

Scenario C: Not on Office WiFi
┌─────────────────────────────────────────┐
│ Response:                               │
│ {                                       │
│   action: 'ignored',                   │
│   reason: 'Not on office network',     │
│   ip: '203.0.113.45'                   │
│ }                                       │
│                                         │
│ Frontend Console:                       │
│ "Attendance ping: ignored"             │
└─────────────────────────────────────────┘

Step 7: Timeline Example
┌─────────────────────────────────────────────────────┐
│ 9:00 AM - Employee opens dashboard                  │
│           └─> Ping #1: auto_checked_in ✅           │
│                                                      │
│ 9:01 AM - Ping #2: already_checked_in              │
│ 9:02 AM - Ping #3: already_checked_in              │
│ 9:03 AM - Ping #4: already_checked_in              │
│ ...                                                  │
│ 5:00 PM - Employee closes dashboard                │
│           └─> Ping service stops                    │
└─────────────────────────────────────────────────────┘
```

---

### Flow 3: IP Verification Logic

```
┌─────────────────────────────────────────────────────────────────┐
│                    IP VERIFICATION LOGIC                         │
└─────────────────────────────────────────────────────────────────┘

Input: HTTP Request from Employee

Step 1: Extract IP Address
┌─────────────────────────────────────────────────────┐
│ const getClientIP = (req) => {                      │
│                                                      │
│   // Check X-Forwarded-For header (for proxies)    │
│   const forwarded = req.headers['x-forwarded-for'];│
│   if (forwarded) {                                  │
│     // Take first IP (original client)             │
│     return forwarded.split(',')[0].trim();         │
│   }                                                  │
│                                                      │
│   // Fallback to direct connection IP              │
│   return req.socket?.remoteAddress || req.ip;      │
│ }                                                    │
│                                                      │
│ Result: "192.168.1.45"                              │
└──────┬──────────────────────────────────────────────┘
       │
       ▼

Step 2: Check if Verification Enabled
┌─────────────────────────────────────────────────────┐
│ if (WIFI_VERIFICATION_ENABLED !== 'true') {        │
│   return {                                          │
│     allowed: true,                                  │
│     ip: clientIP,                                   │
│     reason: 'Verification disabled'                │
│   };                                                 │
│ }                                                    │
└──────┬──────────────────────────────────────────────┘
       │
       ▼

Step 3: Load Allowed IP Ranges
┌─────────────────────────────────────────────────────┐
│ From .env:                                          │
│ OFFICE_IP_RANGES=192.168.1.0/24,10.0.0.0/8        │
│                                                      │
│ Parse into array:                                   │
│ allowedRanges = [                                   │
│   "192.168.1.0/24",  ← Office WiFi                 │
│   "10.0.0.0/8"       ← VPN Range                   │
│ ]                                                    │
└──────┬──────────────────────────────────────────────┘
       │
       ▼

Step 4: Check Each Range
┌─────────────────────────────────────────────────────┐
│ For each range in allowedRanges:                   │
│                                                      │
│ Range 1: "192.168.1.0/24"                          │
│ ├─> Parse CIDR: network=192.168.1.0, bits=24      │
│ ├─> Calculate mask: 255.255.255.0                  │
│ ├─> Check if 192.168.1.45 is in range             │
│ └─> YES! ✅                                         │
│                                                      │
│ Result: isAllowed = true                           │
└──────┬──────────────────────────────────────────────┘
       │
       ▼

Step 5: Return Result
┌─────────────────────────────────────────────────────┐
│ return {                                            │
│   allowed: true,                                    │
│   ip: "192.168.1.45",                              │
│   reason: "IP within office network range"         │
│ };                                                   │
└─────────────────────────────────────────────────────┘

Example Scenarios:

Scenario A: Office WiFi (Allowed)
┌─────────────────────────────────────────┐
│ Client IP: 192.168.1.45                 │
│ Allowed: 192.168.1.0/24                 │
│ Result: ✅ ALLOWED                      │
└─────────────────────────────────────────┘

Scenario B: Home WiFi (Blocked)
┌─────────────────────────────────────────┐
│ Client IP: 203.0.113.45                 │
│ Allowed: 192.168.1.0/24                 │
│ Result: ❌ BLOCKED                      │
│ Error: "IP not in allowed ranges"       │
└─────────────────────────────────────────┘

Scenario C: VPN (Allowed)
┌─────────────────────────────────────────┐
│ Client IP: 10.5.10.20                   │
│ Allowed: 10.0.0.0/8                     │
│ Result: ✅ ALLOWED                      │
└─────────────────────────────────────────┘
```

---

## 🏗️ Technical Architecture

### System Components:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SYSTEM ARCHITECTURE                           │
└─────────────────────────────────────────────────────────────────┘

Frontend Layer:
┌──────────────────────────────────────────────────────────┐
│ 1. Dashboard Layout (dashboard/layout.jsx)              │
│    └─> Starts/stops ping service                        │
│                                                          │
│ 2. Attendance Ping Service (services/attendancePing.js) │
│    └─> Pings backend every 60 seconds                   │
│                                                          │
│ 3. Attendance Pages                                     │
│    ├─> Employee: View own attendance + IP              │
│    └─> Manager: View team attendance + IPs             │
│                                                          │
│ 4. API Client (lib/api.js)                             │
│    ├─> checkIn()                                        │
│    ├─> checkOut()                                       │
│    └─> ping()  ← NEW                                    │
└──────────────────────────────────────────────────────────┘
                           │
                           │ HTTP/HTTPS
                           │
                           ▼
Backend Layer:
┌──────────────────────────────────────────────────────────┐
│ 1. Routes (attendance.routes.js)                        │
│    ├─> POST /attendance/check-in                        │
│    ├─> POST /attendance/check-out                       │
│    └─> POST /attendance/ping  ← NEW                     │
│                                                          │
│ 2. Controller (attendance.controller.js)                │
│    ├─> checkIn(req, res)                                │
│    ├─> checkOut(req, res)                               │
│    └─> autoPing(req, res)  ← NEW                        │
│                                                          │
│ 3. Service (attendance.service.js)                      │
│    ├─> checkIn(userId, lat, lng, req)                   │
│    ├─> checkOut(userId)                                 │
│    └─> autoPing(userId, req)  ← NEW                     │
│                                                          │
│ 4. WiFi Verification (utils/wifiVerification.js)        │
│    ├─> verifyOfficeNetwork(req)                         │
│    ├─> getClientIP(req)                                 │
│    └─> ipInRange(ip, cidr)                              │
└──────────────────────────────────────────────────────────┘
                           │
                           │ Prisma ORM
                           │
                           ▼
Database Layer:
┌──────────────────────────────────────────────────────────┐
│ Attendance Table:                                        │
│ ┌────────────────────────────────────────────────────┐  │
│ │ id           UUID                                   │  │
│ │ userId       UUID                                   │  │
│ │ date         DATE                                   │  │
│ │ checkIn      TIMESTAMP                              │  │
│ │ checkOut     TIMESTAMP                              │  │
│ │ status       ENUM (PRESENT/LATE/HALF_DAY)          │  │
│ │ workingHours FLOAT                                  │  │
│ │ latitude     FLOAT                                  │  │
│ │ longitude    FLOAT                                  │  │
│ │ ipAddress    TEXT  ← NEW                            │  │
│ │ source       TEXT (MANUAL/AUTO_PING)               │  │
│ │ createdAt    TIMESTAMP                              │  │
│ │ updatedAt    TIMESTAMP                              │  │
│ └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘

Configuration:
┌──────────────────────────────────────────────────────────┐
│ .env File:                                               │
│ ┌────────────────────────────────────────────────────┐  │
│ │ WIFI_VERIFICATION_ENABLED=true                     │  │
│ │ OFFICE_IP_RANGES=192.168.1.0/24,10.0.0.0/8        │  │
│ │ LATE_THRESHOLD_HOUR=9                              │  │
│ │ LATE_THRESHOLD_MIN=30                              │  │
│ │ HALF_DAY_HOURS=4                                   │  │
│ │ TZ_OFFSET_HOURS=5                                  │  │
│ └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## 🔒 Security & Validation

### Security Layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                               │
└─────────────────────────────────────────────────────────────────┘

Layer 1: Authentication
┌──────────────────────────────────────────┐
│ JWT Token Validation                     │
│ ├─> Every request requires valid token   │
│ ├─> Token contains userId                │
│ └─> Expired tokens rejected              │
└──────────────────────────────────────────┘

Layer 2: IP Verification
┌──────────────────────────────────────────┐
│ Office Network Validation                │
│ ├─> Extract real client IP               │
│ ├─> Check against allowed ranges         │
│ ├─> Block non-office IPs                 │
│ └─> Log all attempts                      │
└──────────────────────────────────────────┘

Layer 3: Duplicate Prevention
┌──────────────────────────────────────────┐
│ Database Constraints                     │
│ ├