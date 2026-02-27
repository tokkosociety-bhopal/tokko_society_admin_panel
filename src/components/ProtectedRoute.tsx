"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth"; // onAuthStateChanged add kiya
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();

    // currentUser direct check karne ke bajaye listener use karein
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Agar login page par pehle se hain toh redirect na karein (loop se bachne ke liye)
        if (pathname !== "/login") {
          router.push("/login");
        }
        setLoading(false);
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (!userSnap.exists()) {
          router.push("/login");
          setLoading(false);
          return;
        }

        const societyId = userSnap.data().societyId;
        const societySnap = await getDoc(doc(db, "societies", societyId));
        
        if (!societySnap.exists()) {
          router.push("/login");
          setLoading(false);
          return;
        }

        const societyData = societySnap.data();
        const isExpired = societyData.planExpiryDate && societyData.planExpiryDate.toDate() < new Date();
        const isInactive = societyData.status === "inactive" || isExpired;

        if (isInactive && pathname !== "/payment-details") {
          router.push("/payment-details");
          setLoading(false);
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error("Auth Error:", error);
        setLoading(false);
      }
    });

    return () => unsubscribe(); // Cleanup listener
  }, [pathname, router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}