"use client";

import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="flex">
        <Sidebar />

        <div className="flex-1">
          <Header />
          <div className="p-6 bg-gray-100 min-h-screen">
            {children}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}