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
  const [planExpiry, setPlanExpiry] = useState<string | null>(null);
  const [daysLeft, setDaysLeft] = useState<number>(0);
  const [todayVisitors, setTodayVisitors] = useState(0);
  const [qrEntries, setQrEntries] = useState(0);

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
  // GET USER SOCIETY
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
  // FETCH SOCIETY INFO
  ////////////////////////////////////////////////////////////

  useEffect(() => {
    const fetchSociety = async () => {
      if (!societyId) return;

      const snap = await getDoc(
        doc(db, "societies", societyId)
      );

      if (snap.exists()) {
        const data = snap.data();
        setSocietyName(data.name || "Society");

        if (data.planExpiry) {
          const expiryDate = new Date(data.planExpiry);
          const today = new Date();
          const diff =
            (expiryDate.getTime() - today.getTime()) /
            (1000 * 60 * 60 * 24);
          setDaysLeft(Math.max(0, Math.floor(diff)));
          setPlanExpiry(expiryDate.toDateString());
        }
      }
    };

    fetchSociety();
  }, [societyId]);

  ////////////////////////////////////////////////////////////
  // FETCH ALL STATS (FINAL SYNC LOGIC)
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

      ////////////////////////////////////////////////////
      // OCCUPANCY CALCULATION (CORRECT METHOD)
      ////////////////////////////////////////////////////

      let occupied = 0;
      let vacant = 0;

      const occupiedUnitIds = new Set<string>();

      residentsSnap.forEach((doc) => {
        const data = doc.data();
        if (data.unitId) {
          occupiedUnitIds.add(data.unitId);
        }
      });

      unitsSnap.forEach((doc) => {
        if (occupiedUnitIds.has(doc.id)) {
          occupied++;
        } else {
          vacant++;
        }
      });

      ////////////////////////////////////////////////////
      // TODAY VISITORS + QR ENTRIES (FIXED)
      ////////////////////////////////////////////////////

      let todayCount = 0;
      let qrCount = 0;
      const today = new Date().toDateString();

      visitorsSnap.forEach((doc) => {
        const data = doc.data();

        if (data.createdAt) {
          const d = data.createdAt.toDate();
          if (d.toDateString() === today) {
            todayCount++;
          }
        }

        if (data.entryType === "qr") {
          qrCount++;
        }
      });

      setTodayVisitors(todayCount);
      setQrEntries(qrCount);

      ////////////////////////////////////////////////////

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

  const StatCard = ({
    label,
    value,
    color,
  }: any) => (
    <div
      className={`rounded-2xl p-6 text-white shadow-lg ${color}`}
    >
      <p className="text-sm opacity-80">{label}</p>
      <h2 className="text-3xl font-bold mt-2">{value}</h2>
    </div>
  );

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {societyName}
          </h1>
          <p className="text-gray-500">
            Professional Society Dashboard
          </p>
        </div>

        {planExpiry && (
          <div className="bg-white border rounded-xl px-5 py-3 shadow">
            <p className="text-sm text-gray-500">
              Plan Expiry
            </p>
            <p className="font-semibold">
              {planExpiry}
            </p>
            <span
              className={`text-sm font-semibold ${
                daysLeft < 7
                  ? "text-red-600"
                  : "text-green-600"
              }`}
            >
              {daysLeft} days left
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-6 mb-10">
        <StatCard
          label="Residents"
          value={stats.residents}
          color="bg-gradient-to-r from-blue-500 to-blue-600"
        />
        <StatCard
          label="Guards"
          value={stats.guards}
          color="bg-gradient-to-r from-purple-500 to-purple-600"
        />
        <StatCard
          label="Visitors"
          value={stats.visitors}
          color="bg-gradient-to-r from-green-500 to-green-600"
        />
        <StatCard
          label="Notices"
          value={stats.notices}
          color="bg-gradient-to-r from-orange-500 to-orange-600"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow border">
          <p className="text-sm text-gray-500 mb-3">
            Unit Occupancy
          </p>
          <div className="flex justify-between mb-2">
            <span>Occupied</span>
            <span>{stats.occupiedUnits}</span>
          </div>
          <div className="flex justify-between">
            <span>Vacant</span>
            <span>{stats.vacantUnits}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow border">
          <p className="text-sm text-gray-500 mb-2">
            Today's Visitors
          </p>
          <h2 className="text-3xl font-bold text-green-600">
            {todayVisitors}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow border">
          <p className="text-sm text-gray-500 mb-4">
            Guard Performance (QR Entries)
          </p>
          <div className="w-full bg-gray-200 h-3 rounded-full">
            <div
              className="bg-blue-600 h-3 rounded-full"
              style={{
                width: `${Math.min(
                  100,
                  (qrEntries /
                    (stats.visitors || 1)) *
                    100
                )}%`,
              }}
            />
          </div>
          <p className="text-sm mt-3 text-gray-600">
            {qrEntries} QR Entries
          </p>
        </div>
      </div>
    </div>
  );
}