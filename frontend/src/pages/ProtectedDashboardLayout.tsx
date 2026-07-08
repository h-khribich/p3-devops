import { Navigate } from "react-router";
import DashboardLayout from "../layouts/DashboardLayout.tsx";
import { isAuthenticated } from "../auth.ts";

export default function ProtectedDashboardLayout() {
  return isAuthenticated() ? (
    <DashboardLayout />
  ) : (
    <Navigate to="/login" replace />
  );
}
