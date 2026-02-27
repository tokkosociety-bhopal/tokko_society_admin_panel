"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";  // ← router add

const menuItems = [
  { name: "Dashboard", path: "/dashboard" },
  { name: "Residents", path: "/residents" },
  { name: "Guards & Staff", path: "/guards" },
  { name: "Visitors", path: "/visitors" },
  { name: "Maintenance", path: "/maintenance" },
  { name: "Notices", path: "/notices" },
  { name: "Reports", path: "/reports" },
  { name: "Units", path: "/units" },

  // NEW
  { name: "Payment Details", path: "/payment-details" },
  { name: "Contact Us", path: "/contact-us" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();  // ← add

  return (
    <div className="w-64 bg-black text-white min-h-screen p-6">
      <h2
        onClick={() => router.push("/dashboard")}   // ← add
        className="text-xl font-bold mb-8 cursor-pointer hover:opacity-80 transition"
      >
        Society Admin
      </h2>

      <nav className="space-y-4">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`block p-2 rounded ${
              pathname === item.path
                ? "bg-gray-800"
                : "hover:bg-gray-900"
            }`}
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}