"use client";

import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  getDocs,
  query,
  orderBy,
  updateDoc,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db, auth } from "@/lib/firebase";
import Papa from "papaparse";

interface UnitRow {
  unitNo: string;
  type: string;
  familyLimit: number;
}

export default function UnitsPage() {
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [totalUnits, setTotalUnits] = useState(0);
  const [unitsUsed, setUnitsUsed] = useState(0);

  const [units, setUnits] = useState<UnitRow[]>([]);
  const [approvedUnits, setApprovedUnits] = useState<any[]>([]);

  const [search, setSearch] = useState("");
  const [approvedSearch, setApprovedSearch] = useState("");

  const [singleUnitNo, setSingleUnitNo] = useState("");
  const [singleType, setSingleType] = useState("flat");
  const [singleFamilyLimit, setSingleFamilyLimit] = useState(4);

  const functions = getFunctions();
  const requestDeletion = httpsCallable(functions, "requestUnitDeletion");

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) return;

    const sId = userDoc.data().societyId;
    setSocietyId(sId);

    const societyDoc = await getDoc(doc(db, "societies", sId));
if (societyDoc.exists()) {

  // 🔥 Get real units collection
  const unitsSnap = await getDocs(
    collection(db, "societies", sId, "units")
  );

  // 🔥 Real total units
  setTotalUnits(unitsSnap.size);

  // 🔥 Real occupied count
  const occupiedCount = unitsSnap.docs.filter(
    (doc) => doc.data().status === "occupied"
  ).length;

  setUnitsUsed(occupiedCount);
}

    fetchApprovedUnits(sId);
  };

  const fetchApprovedUnits = async (sId: string) => {
    const q = query(
      collection(db, "societies", sId, "units"),
      orderBy("unitNo")
    );

    const snap = await getDocs(q);

    setApprovedUnits(
      snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    );
  };

  // ================= CSV UPLOAD =================

  const handleFileUpload = (event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed: UnitRow[] = results.data.map((row: any) => ({
          unitNo: row.unitNo,
          type: row.type?.toLowerCase() || "flat",
          familyLimit: Number(row.familyLimit || 4),
        }));

        setUnits(parsed);
      },
    });
  };

  const handleSubmit = async () => {
    if (!societyId || units.length === 0) {
      alert("Upload CSV first");
      return;
    }

    await addDoc(collection(db, "unitCreationRequests"), {
      societyId,
      totalUnits: units.length,
      units: units.map((u) => ({
        unitNo: u.unitNo,
        type: u.type,
        familyLimit: u.familyLimit,
        status: "vacant",
      })),
      status: "pending",
      createdAt: new Date(),
    });

    alert("Bulk Unit Request Sent");
    setUnits([]);
  };

  const filteredUnits = units.filter((u) =>
    u.unitNo?.toLowerCase().includes(search.toLowerCase())
  );

  const downloadTemplate = () => {
    const csv =
      "unitNo,type,familyLimit\nA-101,flat,4\nA-102,duplex,6\nB-201,villa,8";

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "unit_template.csv";
    a.click();
  };

  // ================= SINGLE UNIT REQUEST =================

  const handleSingleUnitRequest = async () => {
    if (!societyId || !singleUnitNo) {
      alert("Enter unit number");
      return;
    }

    await addDoc(collection(db, "unitCreationRequests"), {
      societyId,
      totalUnits: 1,
      units: [
        {
          unitNo: singleUnitNo,
          type: singleType,
          familyLimit: singleFamilyLimit,
          status: "vacant",
        },
      ],
      status: "pending",
      createdAt: new Date(),
    });

    alert("Single Unit Request Sent");
    setSingleUnitNo("");
  };

  // ================= EDIT UNIT =================

const handleEdit = async (unit: any) => {
  if (!societyId) return;

  const newUnitNo = prompt("Enter Unit No", unit.unitNo);
  if (!newUnitNo) return;

  const newType = prompt(
    "Enter Type (flat / duplex / villa)",
    unit.type
  );
  if (!newType) return;

  const newFamilyLimit = prompt(
    "Enter Family Limit",
    unit.familyLimit
  );
  if (!newFamilyLimit) return;

  await updateDoc(
    doc(db, "societies", societyId, "units", unit.id),
    {
      unitNo: newUnitNo,
      type: newType.toLowerCase(),
      familyLimit: Number(newFamilyLimit),
    }
  );

  alert("Unit Updated Successfully");

  fetchApprovedUnits(societyId);
};

  // ================= DELETE REQUEST =================

  const handleDeleteRequest = async (unit: any) => {
    if (!societyId) return;

    await requestDeletion({
      societyId,
      unitId: unit.id,
      unitNo: unit.unitNo,
    });

    alert("Deletion request sent to Super Admin");
  };

  const filteredApprovedUnits = approvedUnits.filter((u) =>
    u.unitNo?.toLowerCase().includes(approvedSearch.toLowerCase())
  );

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Unit Management</h2>

      {/* SUMMARY */}
      <div className="bg-white p-6 rounded shadow mb-6 grid grid-cols-2 gap-6">
        <div>
          <p className="text-gray-500">Total Units Allowed</p>
          <p className="text-xl font-bold">{totalUnits}</p>
        </div>
        <div>
          <p className="text-gray-500">Units Used</p>
          <p className="text-xl font-bold">{unitsUsed}</p>
        </div>
      </div>

      {/* SINGLE UNIT ADD */}
      <div className="bg-white p-6 rounded shadow mb-6">
        <h3 className="font-semibold mb-4">Add Single Unit</h3>

        <div className="flex gap-4 items-center">
          <input
            placeholder="Unit No"
            value={singleUnitNo}
            onChange={(e) => setSingleUnitNo(e.target.value)}
            className="border p-2 rounded"
          />

          <select
            value={singleType}
            onChange={(e) => setSingleType(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="flat">Flat</option>
            <option value="duplex">Duplex</option>
            <option value="villa">Villa</option>
          </select>

          <input
            type="number"
            value={singleFamilyLimit}
            onChange={(e) =>
              setSingleFamilyLimit(Number(e.target.value))
            }
            className="border p-2 rounded w-24"
          />

          <button
            onClick={handleSingleUnitRequest}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Send Request
          </button>
        </div>
      </div>

      {/* CSV UPLOAD */}
      <div className="bg-white p-6 rounded shadow mb-6">
        <h3 className="font-semibold mb-4">
          Bulk Upload Units (CSV)
        </h3>

        <div className="flex gap-4 mb-4">
          <input type="file" accept=".csv" onChange={handleFileUpload} />

          <button
            onClick={downloadTemplate}
            className="bg-gray-800 text-white px-4 py-2 rounded"
          >
            Download Template
          </button>
        </div>

        {units.length > 0 && (
          <>
            <div className="flex justify-between mb-3">
              <p className="font-semibold">
                Total Uploaded Units: {units.length}
              </p>

              <input
                placeholder="Search Unit No"
                className="border p-2 rounded"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="max-h-60 overflow-auto border">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">Unit No</th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Family Limit</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUnits.map((u, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{u.unitNo}</td>
                      <td className="p-2 capitalize">{u.type}</td>
                      <td className="p-2">{u.familyLimit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={handleSubmit}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded"
            >
              Send Bulk Request
            </button>
          </>
        )}
      </div>

      {/* APPROVED UNITS */}
      <div className="bg-white p-6 rounded shadow">
        <h3 className="font-semibold mb-4">Approved Units</h3>

        <input
          placeholder="Search Approved Units"
          className="border p-2 rounded mb-4"
          value={approvedSearch}
          onChange={(e) => setApprovedSearch(e.target.value)}
        />

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Unit No</th>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApprovedUnits.map((unit) => (
                <tr key={unit.id} className="border-t">
                  <td className="p-2">{unit.unitNo}</td>
                  <td className="p-2 capitalize">{unit.type}</td>
                  <td className="p-2 capitalize">{unit.status}</td>
                  <td className="p-2 flex gap-3">
                    <button
                      onClick={() => handleEdit(unit)}
                      className="bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDeleteRequest(unit)}
                      className="bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200"
                    >
                      Delete Request
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}