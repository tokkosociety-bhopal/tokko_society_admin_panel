"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "@/lib/firebase";

export default function DashboardPage() {
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [societyName, setSocietyName] = useState("");
  const [stats, setStats] = useState({
    residents: 0,
    guards: 0,
    staff: 0,
    visitors: 0,
    occupiedUnits: 0,
    vacantUnits: 0,
    unpaidMaintenance: 0,
    notices: 0,
  });

  ////////////////////////////////////////////////////////////
  // GET LOGGED IN USER SOCIETY
  ////////////////////////////////////////////////////////////

  useEffect(() => {
    const fetchUserSociety = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const userSnap = await getDoc(
        doc(db, "users", user.uid)
      );

      if (userSnap.exists()) {
        setSocietyId(userSnap.data().societyId);
      }
    };

    fetchUserSociety();
  }, []);

  ////////////////////////////////////////////////////////////
  // FETCH SOCIETY NAME
  ////////////////////////////////////////////////////////////

  useEffect(() => {
    const fetchSocietyName = async () => {
      if (!societyId) return;

      const snap = await getDoc(
        doc(db, "societies", societyId)
      );

      if (snap.exists()) {
        setSocietyName(snap.data().name || "Society");
      }
    };

    fetchSocietyName();
  }, [societyId]);

  ////////////////////////////////////////////////////////////
  // FETCH STATS
  ////////////////////////////////////////////////////////////

  useEffect(() => {
    const fetchStats = async () => {
      if (!societyId) return;

      const residentsSnap = await getDocs(
        collection(db, "societies", societyId, "residents")
      );

      const guardsSnap = await getDocs(
        collection(db, "societies", societyId, "guards")
      );

      const staffSnap = await getDocs(
        collection(db, "societies", societyId, "societyStaff")
      );

      const visitorsSnap = await getDocs(
        collection(db, "societies", societyId, "visitors")
      );

      const unitsSnap = await getDocs(
        collection(db, "societies", societyId, "units")
      );

      const noticesSnap = await getDocs(
        collection(db, "societies", societyId, "announcements")
      );

      let occupied = 0;
      let vacant = 0;

      unitsSnap.forEach((doc) => {
        const data = doc.data();
        if (data.isOccupied) occupied++;
        else vacant++;
      });

      setStats({
        residents: residentsSnap.size,
        guards: guardsSnap.size,
        staff: staffSnap.size,
        visitors: visitorsSnap.size,
        occupiedUnits: occupied,
        vacantUnits: vacant,
        unpaidMaintenance: 0,
        notices: noticesSnap.size,
      });
    };

    fetchStats();
  }, [societyId]);

  ////////////////////////////////////////////////////////////
  // UI
  ////////////////////////////////////////////////////////////

  return (
    <div>
      {/* HEADER */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold">
          {societyName}
        </h1>
        <p className="text-gray-500 mt-1">
          Society Overview Dashboard
        </p>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-4 gap-6">
        {[
          { label: "Residents", value: stats.residents },
          { label: "Guards", value: stats.guards },
          { label: "Admin Staff", value: stats.staff },
          { label: "Visitors", value: stats.visitors },
          { label: "Occupied Units", value: stats.occupiedUnits },
          { label: "Vacant Units", value: stats.vacantUnits },
          { label: "Unpaid Maintenance", value: stats.unpaidMaintenance },
          { label: "Active Notices", value: stats.notices },
        ].map((card, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition"
          >
            <p className="text-gray-500 text-sm">
              {card.label}
            </p>
            <h2 className="text-3xl font-bold mt-2">
              {card.value}
            </h2>
          </div>
        ))}
      </div>
    </div>
  );
}