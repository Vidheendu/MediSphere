"use client";

import React from "react";
import { usePathname } from "next/navigation";
import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";
import AdminNav from "@/components/admin/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Allow unauthenticated access strictly to the dedicated admin login page
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <AdminNav />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </AdminProtectedRoute>
  );
}

