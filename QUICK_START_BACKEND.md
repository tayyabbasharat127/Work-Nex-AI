# Quick Start - Backend Server

## ✅ CORS Issue Fixed!

The CORS error preventing frontend signup has been resolved.

## Start the Backend Server

### Option 1: Development Mode (with auto-reload)
```bash
cd worknex-backend
npm run dev
```

### Option 2: Production Mode
```bash
cd worknex-backend
npm start
```

## Verify Backend is Running

### Check Health Endpoint
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "WorkNex AI Backend",
  "timestamp": "2026-04-23T..."
}
```

### Test CORS Configuration
```bash
cd worknex-backend
./test-cors.sh
```

All tests should pass with ✅ marks.

## What Was Fixed

**File Modified:** `worknex-backend/src/app.js`

**Changes:**
- Enhanced CORS configuration with explicit options
- Added support for preflight OPTIONS requests
- Specified allowed methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
- Specified allowed headers: Content-Type, Authorization, X-Requested-With
- Enabled credentials support
- Added origin validation function

## Common Commands

### Check if backend is running
```bash
lsof -ti:5000
```

### Stop backend
```bash
kill -9 $(lsof -ti:5000)
```

### View backend logs
```bash
cd worknex-backend
npm run dev
# Logs will appear in terminal
```

### Database commands
```bash
# Generate Prisma client
npm run generate

# Run migrations
npm run migrate

# Seed database
npm run seed

# Full setup (migrate + generate + seed)
npm run setup
```

## Ports

- **Backend:** http://localhost:5000
- **Frontend:** http://localhost:3000
- **AI Service:** http://localhost:8000

## Environment Variables

Make sure `worknex-backend/.env` has:
```env
PORT=5000
FRONTEND_URL=http://localhost:3000
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
NODE_ENV=development
```

## Troubleshooting

### Backend won't start
1. Check if port 5000 is already in use: `lsof -ti:5000`
2. Kill existing process: `kill -9 $(lsof -ti:5000)`
3. Check database connection in `.env`
4. Run `npm install` to ensure dependencies are installed

### CORS errors persist
1. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)
2. Clear browser cache
3. Restart backend server
4. Check browser console for exact error message

### Database errors
1. Ensure PostgreSQL is running
2. Check DATABASE_URL in `.env`
3. Run migrations: `npm run migrate`
4. Regenerate Prisma client: `npm run generate`

## Next Steps

1. ✅ Backend is running on port 5000
2. ✅ CORS is configured correctly
3. ✅ Database is connected
4. 🎯 Start frontend: `cd frontend && npm run dev`
5. 🎯 Start AI service: `cd ai-service && python3 run.py`
6. 🎯 Test signup from frontend

## API Documentation

Once backend is running, visit:
- **Swagger/OpenAPI:** http://localhost:5000/api-docs (if configured)
- **Health Check:** http://localhost:5000/health

## Support

If you encounter issues:
1. Check the logs in the terminal where backend is running
2. Review `CORS_FIX_GUIDE.md` for detailed troubleshooting
3. Ensure all three services are running (backend, frontend, ai-service)
