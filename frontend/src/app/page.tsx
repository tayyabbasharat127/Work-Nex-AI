import Image from "next/image";
import Login from "./auth/login/page";
import Register from "./auth/register/page";
import ResetPassword from "./auth/reset-password/page";
import VerifyOTP from "./auth/verify-otp/page";
import ForgotPassword from "./auth/forgot-password/page";
import { AdminDashboard } from "./dashboard/admin/main/page";
import EmployeeDashboard from "./dashboard/employee/main/page";
import EmployeeAnalyticsPage from "./dashboard/employee/analytics/page";
import EmployeeAttendancePage from "./dashboard/employee/attendance/page";
import EmployeeLeavesPage from "./dashboard/employee/leaves/page";
import HomePage from "./homepage/page";
import ManagerDashboardPage from "./dashboard/manager/main/page";

export const metadata = {
  title: "WorkNext AI - The Future is here!",
  description: "Next-generation AI platform for modern work.",
};

export default function Home() {
  return (
    <>
      < HomePage />
    </>
  );
}
