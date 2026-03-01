"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useParams } from "next/navigation";

export default function UnitMembersPage() {
  const { unitId } = useParams();
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [unitNo, setUnitNo] = useState("");
  const [unitStatus, setUnitStatus] =
    useState<"active" | "inactive">("active");

  //////////////////////////////////////////////////////
  // INIT
  //////////////////////////////////////////////////////

  useEffect(() => {
    const init = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) return;

      const sId = userDoc.data().societyId;
      setSocietyId(sId);

      const unitRef = doc(
        db,
        "societies",
        sId,
        "units",
        unitId as string
      );

      const unitDoc = await getDoc(unitRef);

      if (unitDoc.exists()) {
        setUnitNo(unitDoc.data().unitNo);
        setUnitStatus(unitDoc.data().status || "active");
      }

      fetchMembers(sId);
    };

    init();
  }, [unitId]);

  //////////////////////////////////////////////////////
  // FETCH MEMBERS
  //////////////////////////////////////////////////////

  const fetchMembers = async (sId: string) => {
    const snapshot = await getDocs(
      collection(db, "societies", sId, "residents")
    );

    const filtered = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((r: any) => r.unitId === unitId);

    setMembers(filtered);
  };

  //////////////////////////////////////////////////////
  // DELETE RESIDENT
  //////////////////////////////////////////////////////

  const handleDelete = async (uid: string) => {
  if (!societyId) return;

  if (unitStatus === "inactive") {
    alert("Unit inactive. Cannot delete resident.");
    return;
  }

  try {
    // 1️⃣ Delete resident from society
    await deleteDoc(
      doc(db, "societies", societyId, "residents", uid)
    );

    // 2️⃣ Update user profile
    await updateDoc(doc(db, "users", uid), {
      role: "ex-resident",
      isActive: false,
      unitId: null,
      updatedAt: new Date(),
    });

    // 3️⃣ IMPORTANT — Update unit document
    await updateDoc(
      doc(db, "societies", societyId, "units", unitId as string),
      {
        residentUid: null,
        status: "vacant",
      }
    );

    alert("Resident removed successfully");
    fetchMembers(societyId);
  } catch (err) {
    console.error(err);
    alert("Error deleting resident");
  }
};

  //////////////////////////////////////////////////////
  // TOGGLE UNIT STATUS
  //////////////////////////////////////////////////////

  const toggleUnitStatus = async () => {
    if (!societyId) return;

    const unitRef = doc(
      db,
      "societies",
      societyId,
      "units",
      unitId as string
    );

    const newStatus =
      unitStatus === "active" ? "inactive" : "active";

    await updateDoc(unitRef, {
      status: newStatus,
    });

    setUnitStatus(newStatus);
  };

  //////////////////////////////////////////////////////
  // UI
  //////////////////////////////////////////////////////

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">
          Unit {unitNo} Residents
        </h2>

        <button
          onClick={toggleUnitStatus}
          className={`px-4 py-2 rounded text-white ${
            unitStatus === "active"
              ? "bg-red-600"
              : "bg-green-600"
          }`}
        >
          {unitStatus === "active"
            ? "Disable Unit"
            : "Enable Unit"}
        </button>
      </div>

      {unitStatus === "inactive" && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          This unit is currently inactive. Visitors and
          actions are blocked.
        </div>
      )}

      <div className="bg-white rounded shadow">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {members.map((m: any) => (
              <tr key={m.id} className="border-t">
                <td className="p-3">{m.name}</td>
                <td className="p-3">{m.email}</td>
                <td className="p-3">
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {members.length === 0 && (
              <tr>
                <td colSpan={3} className="p-4 text-center">
                  No residents found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}