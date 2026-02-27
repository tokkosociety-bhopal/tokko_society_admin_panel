"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { sendPasswordResetEmail } from "firebase/auth";
import Link from "next/link";

interface Unit {
  id: string;
  unitNo: string;
  type?: string;   // 👈 ADD THIS
  status?: string;
  currentMembers?: number;
  familyLimit?: number;
}

export default function ResidentsPage() {
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [unitId, setUnitId] = useState("");

  //////////////////////////////////////////////////////

  useEffect(() => {
    const init = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) return;

      const sId = userDoc.data().societyId;
      setSocietyId(sId);

      const snapshot = await getDocs(
        collection(db, "societies", sId, "units")
      );

      const data: Unit[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        unitNo: doc.data().unitNo,
        type: doc.data().type || "flat",   // 👈 ADD THIS
        status: doc.data().status || "vacant",
        currentMembers: doc.data().currentMembers || 0,
        familyLimit: doc.data().familyLimit || 4,
      }));

      setUnits(data);
      setFilteredUnits(data);
      setLoading(false);
    };

    init();
  }, []);

  //////////////////////////////////////////////////////
  // SEARCH
  //////////////////////////////////////////////////////

  useEffect(() => {
    const filtered = units.filter((u) =>
      u.unitNo.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredUnits(filtered);
  }, [search, units]);

  //////////////////////////////////////////////////////
  // CREATE RESIDENT
  //////////////////////////////////////////////////////

  const handleCreateResident = async () => {
    if (!name || !email || !unitId) {
      alert("All fields required");
      return;
    }

    try {
      const functions = getFunctions();
      const createUser = httpsCallable(
        functions,
        "createSocietyUser"
      );

      await createUser({
        name,
        email,
        role: "resident",
        unitId,
      });

      await sendPasswordResetEmail(auth, email);

      alert("Resident created & email sent");

      setShowModal(false);
      setName("");
      setEmail("");
      setUnitId("");

      window.location.reload();
    } catch (error: any) {
      alert(error.message);
    }
  };

  //////////////////////////////////////////////////////
  // CSV UPLOAD
  //////////////////////////////////////////////////////

  const handleCSVUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const text = await file.text();
    const rows = text.split("\n").slice(1);

    const functions = getFunctions();
    const createUser = httpsCallable(
      functions,
      "createSocietyUser"
    );

    for (let row of rows) {
      const [unitNo, name, email] = row.split(",");

      const unit = units.find(
        (u) => u.unitNo.trim() === unitNo.trim()
      );

      if (!unit) continue;

      await createUser({
        name,
        email,
        role: "resident",
        unitId: unit.id,
      });
    }

    alert("Bulk upload completed");
    window.location.reload();
  };

  //////////////////////////////////////////////////////
  // TEMPLATE DOWNLOAD
  //////////////////////////////////////////////////////

  const downloadTemplate = () => {
    const csv =
      "unitNo,name,email\nE-101,Rahul,rahul@email.com\nC-102,Neha,neha@email.com";

    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "resident_template.csv";
    link.click();
  };

  //////////////////////////////////////////////////////

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">
        Resident Management
      </h2>

      <div className="flex justify-between mb-6">
        <input
          placeholder="Search by unit number..."
          className="border px-4 py-2 rounded w-72"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="flex gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Add Resident
          </button>

          <button
            onClick={downloadTemplate}
            className="bg-gray-600 text-white px-4 py-2 rounded"
          >
            Download Template
          </button>

          <label className="bg-blue-600 text-white px-4 py-2 rounded cursor-pointer">
            Upload CSV
            <input
              type="file"
              hidden
              accept=".csv"
              onChange={handleCSVUpload}
            />
          </label>
        </div>
      </div>

      <div className="bg-white rounded shadow">
        {loading ? (
          <p className="p-4">Loading...</p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-100">
  <tr>{[
    <th key="unit" className="p-3 text-left w-1/5">Unit</th>,
    <th key="type" className="p-3 text-left w-1/5">Type</th>,
    <th key="status" className="p-3 text-left w-1/5">Status</th>,
    <th key="members" className="p-3 text-center w-1/5">Members</th>,
    <th key="action" className="p-3 text-center w-1/5">Action</th>,
  ]}</tr>
</thead>

            <tbody>
  {filteredUnits.map((unit) => (
    <tr key={unit.id} className="border-t hover:bg-gray-50">
      <td className="p-3 font-medium">
        {unit.unitNo}
      </td>

      {/* TYPE COLUMN */}
      <td className="p-3 capitalize">
        {unit.type}
      </td>

      <td className="p-3">
        <span
          className={`px-3 py-1 rounded text-sm font-medium ${
            unit.status === "occupied"
              ? "bg-green-100 text-green-700"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          {unit.status}
        </span>
      </td>

      <td className="p-3 text-center">
        {unit.currentMembers}/{unit.familyLimit}
      </td>

      <td className="p-3 text-center">
        <Link
          href={`/residents/${unit.id}`}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
        >
          Manage
        </Link>
      </td>
    </tr>
  ))}
</tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded w-96">
            <h3 className="font-semibold mb-4">
              Add Resident
            </h3>

            <input
              placeholder="Full Name"
              className="border p-2 w-full mb-3 rounded"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              placeholder="Email"
              className="border p-2 w-full mb-3 rounded"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <select
              className="border p-2 w-full mb-4 rounded"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
            >
              <option value="">Select Unit</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.unitNo}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="border px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleCreateResident}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

