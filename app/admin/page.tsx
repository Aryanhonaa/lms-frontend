"use client";

import { AdminDashboard } from "@/features/admin/admin-dashboard";
import { SuperAdminDashboard } from "@/features/admin/super-admin-dashboard";
import { useAuth } from "@/providers/auth-provider";

export default function AdminPage() {
  const { user } = useAuth();

  if (user?.role === "ADMIN") {
    return <AdminDashboard />;
  }

  return <SuperAdminDashboard />;
}
