# WorkNexAI - Smart Workforce Intelligence Platform

A comprehensive, AI-powered Workforce Management and Attendance Tracking System built with Next.js, JavaScript/JSX, and Tailwind CSS for your FYP project.

## Features

### Landing Page & Marketing
- Professional landing page with features showcase
- 3-tier pricing plans (Basic, Pro, Enterprise)
- Responsive design with mobile support
- Call-to-action sections

### Authentication System
- **Login** - User authentication with role-based routing
- **Register** - New account creation with validation
- **Forgot Password** - Email recovery flow
- **Reset Password** - Secure password reset with requirements
- **OTP Verification** - Two-factor authentication

### Admin Dashboard
Access: `admin@worknexai.com / password`

**Pages:**
- **Dashboard** - Overview with stats and recent activities
- **Users** - Manage all employees with role assignment
- **Attendance** - View and manage attendance records
- **Leaves** - Approve/reject leave requests
- **Departments** - Organize and manage departments
- **Analytics** - Detailed analytics and insights
- **Reports** - Generate and download reports
- **Notifications** - System notifications
- **Logs** - Activity logs and audit trail
- **Roles & Permissions** - User roles management
- **Data Management (ETL)** - Data synchronization jobs
- **Forecasts** - Predictive analytics
- **Settings** - System configuration

### Employee Dashboard
Access: `employee@worknexai.com / password`

**Pages:**
- **Dashboard** - Personal attendance overview
- **My Attendance** - Detailed attendance records
- **My Leaves** - Leave requests and balance
- **Analytics** - Personal performance analytics
- **Performance** - Performance reviews and ratings
- **Settings** - Account preferences

### Manager Dashboard
Access: `manager@worknexai.com / password`

**Pages:**
- **Dashboard** - Team overview and pending approvals
- **Team** - Team member management
- **Attendance** - Team attendance tracking
- **Leaves** - Team leave requests to approve
- **Performance** - Team performance metrics
- **Settings** - Department preferences

## Demo Credentials

```
Admin:
Email: admin@worknexai.com
Password: password

Manager:
Email: manager@worknexai.com
Password: password

Employee:
Email: employee@worknexai.com
Password: password

OTP Verification:
Code: 123456
```

## Color Scheme

- **Primary Color**: Blue (Charcoal + Blue contrast)
- **Background**: Dark Charcoal (#2d2d3d)
- **Cards**: Slightly lighter charcoal
- **Accents**: Professional blue for buttons and borders
- **Text**: Light gray for optimal readability

## Project Structure

```
/app
  /login - Login page
  /register - Registration page
  /forgot-password - Password recovery
  /reset-password - Reset password form
  /verify-otp - OTP verification
  /dashboard
    /admin - Admin dashboard and pages
    /employee - Employee dashboard and pages
    /manager - Manager dashboard and pages
  page.jsx - Landing page
  layout.jsx - Root layout

/components
  Sidebar.jsx - Navigation sidebar (role-based)

/app/globals.css - Theme and global styles
```

## Key Features

### Role-Based Access Control
- Automatic redirection based on user role
- Different navigation menus for each role
- Protected dashboard routes

### Professional UI
- Dark theme with blue accents
- Responsive design (mobile, tablet, desktop)
- Smooth transitions and hover effects
- Accessible components

### Data Management
- Attendance tracking
- Leave management with approval workflow
- Performance metrics
- Analytics and reporting
- User management

## Technology Stack

- **Framework**: Next.js 15
- **Language**: JavaScript/JSX
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **State Management**: React Hooks
- **Storage**: localStorage (for demo)

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```

3. **Open in Browser**
   Visit `http://localhost:3000`

4. **Test the Application**
   - Go to `/login` and use demo credentials
   - Navigate different dashboards based on role
   - Test leave management and approvals
   - Explore analytics and reports

## Customization

### Changing Colors
Edit `/app/globals.css` to modify the theme colors using CSS variables:
- `--primary` - Main blue color
- `--background` - Dark background
- `--card` - Card backgrounds
- `--border` - Border colors

### Adding New Pages
1. Create page in appropriate dashboard folder
2. Import Sidebar component with correct role
3. Follow existing page structure for consistency

### Modifying Navigation
Edit `/components/Sidebar.jsx` to add/remove menu items

## Future Enhancements

- Database integration (Supabase/Neon)
- Real attendance tracking with geolocation
- Mobile app with check-in/check-out
- Email notifications
- Advanced reporting with PDF export
- Biometric attendance integration
- Payroll integration

## Notes

- This is a frontend-focused demo with localStorage for data persistence
- For production, integrate with a backend API and database
- All data is stored in browser localStorage (clears on cache)
- Dates are simulated for demo purposes

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

---

**Created for FYP Project - WorkNexAI Smart Workforce Intelligence Platform**
