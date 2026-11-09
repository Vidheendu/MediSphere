"use client";

import React from "react";
import ProtectedRoute from "./ProtectedRoute";

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Dedicated route protection component for administrative areas.
 * Strictly verifies role === 'admin' before rendering child administrative views.
 * If unauthenticated, safely redirects to /admin/login.
 * If logged in with non-admin role (patient or doctor), denies access.
 */
export default function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  return (
    <ProtectedRoute allowedRoles={["admin"]} redirectPath="/admin/login">
      {children}
    </ProtectedRoute>
  );
}

