"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  getDocs,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { serverTimestamp } from "firebase/firestore";

interface Visitor {
  id: string;
  name: string;
  phone: string;
  unitNo: string;
  purpose?: string;
  vehicleNumber?: string;
  status: string;
  photoUrl?: string;
  entryTime?: any;
  exitTime?: any;
}

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [filtered, setFiltered] = useState<Visitor[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  ////////////////////////////////////////////////////////////
  // FETCH
  ////////////////////////////////////////////////////////////

  useEffect(() => {
    const fetchVisitors = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) return;

      const societyId = userDoc.data().societyId;
      if (!societyId) return;

      const q = query(
        collection(db, "societies", societyId, "visitors"),
        orderBy("entryTime", "desc")
      );

      const snap = await getDocs(q);

      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Visitor[];

      setVisitors(list);
      setFiltered(list);
      setLoading(false);
    };

    fetchVisitors();
  }, []);

  ////////////////////////////////////////////////////////////
  // FILTER
  ////////////////////////////////////////////////////////////

  useEffect(() => {
    if (filter === "all") {
      setFiltered(visitors);
    } else {
      setFiltered(
        visitors.filter(
          (v) => v.status?.toLowerCase() === filter
        )
      );
    }
  }, [filter, visitors]);

  ////////////////////////////////////////////////////////////
  // MARK EXIT
  ////////////////////////////////////////////////////////////

  const markExit = async (visitorId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) return;

    const societyId = userDoc.data().societyId;

    await updateDoc(
  doc(db, "societies", societyId, "visitors", visitorId),
  {
    status: "exited",
    exitTime: serverTimestamp(),
  }
);

    setVisitors((prev) =>
      prev.map((v) =>
        v.id === visitorId
          ? { ...v, status: "exited", exitTime: new Date() }
          : v
      )
    );
  };

  ////////////////////////////////////////////////////////////
  // STATUS COLOR
  ////////////////////////////////////////////////////////////

  const statusColor = (status: string) => {
  switch (status) {
    case "approved":
      return "bg-green-50 text-green-700 border border-green-200";
    case "rejected":
      return "bg-red-50 text-red-700 border border-red-200";
    case "pending":
      return "bg-yellow-50 text-yellow-700 border border-yellow-200";
    case "hold":
      return "bg-gray-100 text-gray-700 border border-gray-300";
    case "exited":
      return "bg-blue-50 text-blue-700 border border-blue-200";
    default:
      return "bg-gray-100 text-gray-600 border border-gray-200";
  }
};

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto">

      <h1 className="text-3xl font-semibold mb-8">
        Visitor Logs
      </h1>

      {/* FILTER BUTTONS */}
      <div className="flex gap-3 mb-8">
        {["all", "pending", "approved", "rejected", "hold", "exited"].map(
          (f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm capitalize border transition
              ${
                filter === f
                  ? "bg-gray-800 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {f}
            </button>
          )
        )}
      </div>

      {/* VISITOR LIST */}
      <div className="bg-white rounded-2xl shadow border divide-y">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            No visitors found
          </div>
        ) : (
          filtered.map((v) => (
            <div
              key={v.id}
              className="p-6 flex justify-between items-center"
            >
              <div className="flex gap-5 items-start">

                {v.photoUrl ? (
                  <img
                    src={v.photoUrl}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded-lg" />
                )}

                <div className="space-y-1">
                  <p className="text-lg font-semibold">
                    {v.name}
                  </p>

                  <p className="text-sm text-gray-600">
                    📞 {v.phone}
                  </p>

                  <p className="text-sm text-gray-600">
                    🏠 Unit: {v.unitNo}
                  </p>

                  <p className="text-sm text-gray-600">
                    🎯 {v.purpose || "-"}
                  </p>

                  {v.vehicleNumber && (
                    <p className="text-sm text-gray-600">
                      🚗 {v.vehicleNumber}
                    </p>
                  )}

                  <p className="text-xs text-gray-400 pt-1">
                    Entry:{" "}
                    {v.entryTime?.toDate?.()
                      ?.toLocaleString() || "-"}
                  </p>

                  {v.exitTime && (
  <p className="text-xs text-gray-400">
    Exit:{" "}
    {v.exitTime.toDate
      ? v.exitTime.toDate().toLocaleString()
      : new Date(v.exitTime).toLocaleString()}
  </p>
)}
                </div>
              </div>

              <div className="flex flex-col items-end gap-4 min-w-[130px]">
                <span
  className={`px-4 py-1.5 text-sm font-semibold tracking-wide rounded-full ${statusColor(
    v.status
  )}`}
>
  {v.status.toUpperCase()}
</span>

                {v.status !== "exited" && (
                  <button
                    onClick={() => markExit(v.id)}
                    className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-black transition"
                  >
                    Mark Exit
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}