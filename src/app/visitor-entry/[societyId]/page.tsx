"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  addDoc,
  collection,
  serverTimestamp,
  getDoc,
  getDocs,
  doc,
  query,
  where,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

export default function VisitorEntryPage() {
  const { societyId } = useParams() as { societyId: string };
  const searchParams = useSearchParams();
  const key = searchParams.get("key");

  ////////////////////////////////////////////////////
  // STATE
  ////////////////////////////////////////////////////

  const [checkingQR, setCheckingQR] = useState(true);
  const [validQR, setValidQR] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [unitNo, setUnitNo] = useState("");
  const [purpose, setPurpose] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  const [units, setUnits] = useState<any[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<any[]>([]);
  const [unitTypeFilter, setUnitTypeFilter] = useState("all");
  const [unitSearch, setUnitSearch] = useState("");

  const [residentName, setResidentName] = useState("");
  const [approvalPreview, setApprovalPreview] = useState("");
  const [approvalColor, setApprovalColor] = useState("text-gray-500");

  const fileInputRef = useRef<HTMLInputElement>(null);

  ////////////////////////////////////////////////////
  // QR VALIDATION
  ////////////////////////////////////////////////////

  useEffect(() => {
    const validateQR = async () => {
      if (!societyId || !key) {
        setCheckingQR(false);
        return;
      }

      const snap = await getDoc(doc(db, "societies", societyId));
      if (!snap.exists()) {
        setCheckingQR(false);
        return;
      }

      const data = snap.data();
      const now = new Date();

      const expiry =
        typeof data.qrExpiry?.toDate === "function"
          ? data.qrExpiry.toDate()
          : new Date(data.qrExpiry);

      if (
        data.status !== "active" ||
        data.qrKey !== key ||
        expiry.getTime() <= now.getTime()
      ) {
        setCheckingQR(false);
        return;
      }

      setValidQR(true);
      setCheckingQR(false);
    };

    validateQR();
  }, [societyId, key]);

  ////////////////////////////////////////////////////
  // LOAD UNITS
  ////////////////////////////////////////////////////

  useEffect(() => {
    const loadUnits = async () => {
      if (!societyId) return;

      const snap = await getDocs(
        collection(db, "societies", societyId, "units")
      );

      const list = snap.docs
        .map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            unitNo: d.unitNo,
            residentUid: d.residentUid,
            type: d.type || "flat",
          };
        })
        .filter((u) => u.unitNo && u.residentUid)
        .sort((a, b) => a.unitNo.localeCompare(b.unitNo));

      setUnits(list);
      setFilteredUnits(list);
    };

    if (validQR) loadUnits();
  }, [societyId, validQR]);

  useEffect(() => {
  if (!unitNo) return;

  const selectedUnit = units.find((u) => u.unitNo === unitNo);
  if (!selectedUnit) return;

  // Auto change type dropdown
  setUnitTypeFilter(selectedUnit.type || "flat");

}, [unitNo, units]);

  ////////////////////////////////////////////////////
  // FILTER + SEARCH
  ////////////////////////////////////////////////////

  useEffect(() => {
    let list = [...units];

    if (unitTypeFilter !== "all") {
      list = list.filter((u) => u.type === unitTypeFilter);
    }

    if (unitSearch) {
      list = list.filter((u) =>
        u.unitNo.toLowerCase().includes(unitSearch.toLowerCase())
      );
    }

    setFilteredUnits(list);
  }, [unitTypeFilter, unitSearch, units]);

  ////////////////////////////////////////////////////
  // LOAD RESIDENT NAME + AUTO APPROVAL PREVIEW
  ////////////////////////////////////////////////////

  useEffect(() => {
    const loadResident = async () => {
      if (!unitNo) return;

      const unit = units.find((u) => u.unitNo === unitNo);
      if (!unit) return;

      const userSnap = await getDoc(doc(db, "users", unit.residentUid));
      if (userSnap.exists()) {
        setResidentName(userSnap.data().name || "Resident");
      }

      // Staff auto approval check
      if (phone.length === 10) {
        const staffQuery = await getDocs(
          query(
            collection(db, "societies", societyId, "staff"),
            where("phone", "==", phone),
            where("residentUid", "==", unit.residentUid),
            where("active", "==", true),
            where("autoApprove", "==", true)
          )
        );

        if (!staffQuery.empty) {
          setApprovalPreview("Auto Approved");
          setApprovalColor("text-green-600");
        } else {
          setApprovalPreview("Resident Approval Required");
          setApprovalColor("text-orange-600");
        }
      }
    };

    loadResident();
  }, [unitNo, phone]);

  ////////////////////////////////////////////////////
  // SUBMIT
  ////////////////////////////////////////////////////

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!name || !phone || !unitNo || !purpose || !photo) {
      alert("Fill all required fields");
      return;
    }

    setLoading(true);

    try {
      const unit = units.find((u) => u.unitNo === unitNo);
      if (!unit) throw new Error("Unit not found");

      const photoRef = ref(
        storage,
        `visitor_photos/${Date.now()}_${photo.name}`
      );

      await uploadBytes(photoRef, photo);
      const photoUrl = await getDownloadURL(photoRef);

      await addDoc(
        collection(db, "societies", societyId, "visitors"),
        {
          name,
          phone,
          unitNo,
          purpose,
          vehicleNumber,
          photoUrl,
          residentUid: unit.residentUid,
          status: "pending",
          source: "qr",
          createdAt: serverTimestamp(),
        }
      );

      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }

    setLoading(false);
  };

  ////////////////////////////////////////////////////
  // UI
  ////////////////////////////////////////////////////

  if (checkingQR)
    return <div className="min-h-screen flex items-center justify-center">Checking QR...</div>;

  if (!validQR)
    return <div className="min-h-screen flex items-center justify-center text-red-600">Invalid QR</div>;

  if (success)
    return (
      <div className="min-h-screen flex items-center justify-center text-center">
        <div>
          <h1 className="text-2xl font-bold mb-4">Request Submitted</h1>
          <p>Please wait for resident approval.</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-3">
  <div className="w-full sm:max-w-md max-w-sm bg-white rounded-2xl shadow-xl p-5 space-y-4">

        <h1 className="text-lg font-semibold text-center">Add Visitor</h1>

        {/* Photo */}
        <div className="flex justify-center">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center cursor-pointer"
          >
            {photo ? "📷" : "📸"}
          </div>
        </div>

        <input ref={fileInputRef} type="file" hidden accept="image/*"
          capture="environment"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setPhoto(file);
          }} />

        <input placeholder="Visitor Name"
          className="w-full border p-2 rounded"
          value={name}
          onChange={(e) => setName(e.target.value)} />

        <input placeholder="Phone"
          maxLength={10}
          className="w-full border p-2 rounded"
          value={phone}
          onChange={(e) => setPhone(e.target.value)} />

        {/* Unit Type Filter */}
        <select className="w-full border p-2 rounded"
          value={unitTypeFilter}
          onChange={(e) => setUnitTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          <option value="flat">Flat</option>
          <option value="duplex">Duplex</option>
          <option value="villa">Villa</option>
        </select>

        {/* Search */}
        {/* Unit Dropdown FIRST */}
<select
  className="w-full border p-2 rounded"
  value={unitNo}
  onChange={(e) => setUnitNo(e.target.value)}
>
  <option value="">Select Unit</option>
  {filteredUnits.map((u) => (
    <option key={u.id} value={u.unitNo}>
      {u.unitNo}
    </option>
  ))}
</select>

{/* Search BELOW */}
<input
  placeholder="Search Unit"
  className="w-full border p-2 rounded"
  value={unitSearch}
  onChange={(e) => setUnitSearch(e.target.value)}
/>

        {residentName && (
          <p className="text-blue-600 font-semibold">
            Resident: {residentName}
          </p>
        )}

        {approvalPreview && (
          <p className={`${approvalColor} font-semibold`}>
            {approvalPreview}
          </p>
        )}

        {/* Purpose */}
        <select className="w-full border p-2 rounded"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}>
          <option value="">Select Purpose</option>
          <option>Guest</option>
          <option>Delivery</option>
          <option>Food Delivery</option>
          <option>Cab / Driver</option>
          <option>Maid</option>
          <option>Electrician</option>
          <option>Plumber</option>
          <option>Maintenance</option>
          <option>Courier</option>
          <option>Other</option>
        </select>

        <input placeholder="Vehicle Number"
          className="w-full border p-2 rounded"
          value={vehicleNumber}
          onChange={(e) => setVehicleNumber(e.target.value)} />

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-600 text-white p-3 rounded-xl"
        >
          {loading ? "Submitting..." : "Add Visitor"}
        </button>

      </div>
    </div>
  );
}