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

  const [checkingQR, setCheckingQR] = useState(true);
  const [validQR, setValidQR] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [unitNo, setUnitNo] = useState("");
  const [purpose, setPurpose] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  // ✅ NEW STATES
  const [units, setUnits] = useState<any[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<any[]>([]);
  const [unitTypeFilter, setUnitTypeFilter] = useState<string>("all");

  const fileInputRef = useRef<HTMLInputElement>(null);

  //////////////////////////////////////////////////////
  // QR VALIDATION (UNTOUCHED)
  //////////////////////////////////////////////////////

  useEffect(() => {
    const validateQR = async () => {
      try {
        if (!societyId || !key) {
          setCheckingQR(false);
          return;
        }

        const docSnap = await getDoc(doc(db, "societies", societyId));
        if (!docSnap.exists()) {
          setCheckingQR(false);
          return;
        }

        const data = docSnap.data();
        const now = new Date();

        if (
          data.status !== "active" ||
          String(data.qrKey || "").trim() !== String(key).trim()
        ) {
          setCheckingQR(false);
          return;
        }

        const expiry =
          typeof data.qrExpiry?.toDate === "function"
            ? data.qrExpiry.toDate()
            : new Date(data.qrExpiry);

        if (!expiry || expiry.getTime() <= now.getTime()) {
          setCheckingQR(false);
          return;
        }

        setValidQR(true);
      } catch (e) {
        console.error(e);
      } finally {
        setCheckingQR(false);
      }
    };

    validateQR();
  }, [societyId, key]);

  //////////////////////////////////////////////////////
  // ✅ LOAD UNITS (Resident Assigned Only)
  //////////////////////////////////////////////////////

  useEffect(() => {
    const loadUnits = async () => {
      if (!societyId) return;

      const snap = await getDocs(
        collection(db, "societies", societyId, "units")
      );

      const list = snap.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            unitNo: data.unitNo,
            residentUid: data.residentUid,
            type: data.type || "flat",
          };
        })
        .filter(
          (u) =>
            u.unitNo &&
            u.residentUid &&
            u.residentUid !== ""
        )
        .sort((a, b) => a.unitNo.localeCompare(b.unitNo));

      setUnits(list);
      setFilteredUnits(list);
    };

    loadUnits();
  }, [societyId]);

  //////////////////////////////////////////////////////
  // ✅ UNIT TYPE FILTER
  //////////////////////////////////////////////////////

  useEffect(() => {
    if (unitTypeFilter === "all") {
      setFilteredUnits(units);
    } else {
      setFilteredUnits(
        units.filter((u) => u.type === unitTypeFilter)
      );
    }
  }, [unitTypeFilter, units]);

  //////////////////////////////////////////////////////
  // SUBMIT (ONLY UNIT VALIDATION CHANGED)
  //////////////////////////////////////////////////////

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (submitting) return;

    if (!name.trim() || !phone.trim() || !unitNo.trim() || !purpose.trim()) {
      alert("All fields are required");
      return;
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      alert("Enter valid 10 digit phone number");
      return;
    }

    if (!photo) {
      alert("Photo is required");
      return;
    }

    try {
      setSubmitting(true);
      setLoading(true);

      const upperUnit = unitNo.trim().toUpperCase();

      // ✅ UPDATED UNIT VALIDATION
      const unitQuery = await getDocs(
        query(
          collection(db, "societies", societyId, "units"),
          where("unitNo", "==", upperUnit)
        )
      );

      if (unitQuery.empty) {
        alert("Unit not found");
        return;
      }

      const unitData = unitQuery.docs[0].data();

      if (!unitData.residentUid) {
        alert("No resident assigned");
        return;
      }

      // Duplicate pending check (UNTOUCHED)
      const duplicateQuery = query(
        collection(db, "societies", societyId, "visitors"),
        where("phone", "==", phone),
        where("unitNo", "==", upperUnit),
        where("status", "==", "pending")
      );

      const duplicateSnap = await getDocs(duplicateQuery);

      if (!duplicateSnap.empty) {
        alert("Request already pending");
        return;
      }

      // Upload photo (UNTOUCHED)
      const photoRef = ref(
        storage,
        `visitor_photos/${Date.now()}_${photo.name}`
      );

      await uploadBytes(photoRef, photo);
      const photoUrl = await getDownloadURL(photoRef);

      // Save visitor (UNTOUCHED)
      await addDoc(
        collection(db, "societies", societyId, "visitors"),
        {
          name: name.trim(),
          phone,
          unitNo: upperUnit,
          purpose: purpose.trim(),
          vehicleNumber: vehicleNumber.trim(),
          photoUrl,
          residentUid: unitData.residentUid,
          status: "pending",
          source: "qr",
          entryTime: null,
          exitTime: null,
          createdAt: serverTimestamp(),
        }
      );

      setSuccess(true);
      setName("");
      setPhone("");
      setUnitNo("");
      setPurpose("");
      setVehicleNumber("");
      setPhoto(null);
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  //////////////////////////////////////////////////////
  // UI
  //////////////////////////////////////////////////////

  if (checkingQR)
    return <div className="min-h-screen flex items-center justify-center">Checking QR...</div>;

  if (!validQR)
    return <div className="min-h-screen flex items-center justify-center text-red-600 text-xl">Invalid or Expired QR</div>;

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-6">
        <h1 className="text-xl font-bold mb-6 text-center">Visitor Entry</h1>

        <form onSubmit={handleSubmit} className="space-y-4">

          <input type="text" placeholder="Visitor Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border p-2 rounded" />

          <input type="tel" placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border p-2 rounded" />

          {/* UNIT TYPE FILTER */}
          <select
            value={unitTypeFilter}
            onChange={(e) => setUnitTypeFilter(e.target.value)}
            className="w-full border p-2 rounded"
          >
            <option value="all">All Types</option>
            <option value="flat">Flat</option>
            <option value="duplex">Duplex</option>
            <option value="villa">Villa</option>
          </select>

          {/* UNIT DROPDOWN */}
          <select
            value={unitNo}
            onChange={(e) => setUnitNo(e.target.value)}
            className="w-full border p-2 rounded"
          >
            <option value="">Select Unit</option>
            {filteredUnits.map((unit) => (
              <option key={unit.id} value={unit.unitNo}>
                {unit.unitNo}
              </option>
            ))}
          </select>

          {/* PURPOSE DROPDOWN */}
          <select
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="w-full border p-2 rounded"
          >
            <option value="">Select Purpose</option>
            <option value="Guest">Guest</option>
            <option value="Delivery">Delivery</option>
            <option value="Food Delivery">Food Delivery</option>
            <option value="Cab / Driver">Cab / Driver</option>
            <option value="Maid">Maid</option>
            <option value="Electrician">Electrician</option>
            <option value="Plumber">Plumber</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Courier">Courier</option>
            <option value="Other">Other</option>
          </select>

          <input type="text" placeholder="Vehicle Number (Optional)"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value)}
            className="w-full border p-2 rounded" />

          {!photo && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setPhoto(file);
                }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-blue-600 text-white p-2 rounded"
              >
                Take Live Photo
              </button>
            </>
          )}

          {photo && (
            <>
              <p className="text-green-600 text-sm">Photo captured successfully</p>
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="w-full bg-gray-300 text-black p-2 rounded"
              >
                Retake Photo
              </button>
            </>
          )}

          <button
            type="submit"
            disabled={loading || submitting}
            className="w-full bg-black text-white p-2 rounded"
          >
            {loading ? "Submitting..." : "Submit"}
          </button>

        </form>
      </div>
    </div>
  );
}