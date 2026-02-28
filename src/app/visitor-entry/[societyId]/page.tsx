"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  addDoc,
  collection,
  serverTimestamp,
  getDoc,
  getDocs,
  query,
  where,
  doc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

export default function VisitorEntryPage() {
  const { societyId } = useParams() as { societyId: string };
  const searchParams = useSearchParams();
  const key = searchParams.get("key");

  const [checkingQR, setCheckingQR] = useState(true);
  const [validQR, setValidQR] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [purpose, setPurpose] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  const [units, setUnits] = useState<any[]>([]);
  const [towers, setTowers] = useState<string[]>([]);
  const [selectedTower, setSelectedTower] = useState("");
  const [selectedNumber, setSelectedNumber] = useState("");
  const [filteredUnits, setFilteredUnits] = useState<any[]>([]);

  const [residentName, setResidentName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  //////////////////////////////////////////////////////
  // QR VALIDATION
  //////////////////////////////////////////////////////

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

  //////////////////////////////////////////////////////
  // LOAD UNITS
  //////////////////////////////////////////////////////

  useEffect(() => {
    const loadUnits = async () => {
      if (!validQR) return;

      const snap = await getDocs(
        collection(db, "societies", societyId, "units")
      );

      const list = snap.docs
        .map((doc) => {
          const d = doc.data();
          const full = d.unitNo; // A-101

          if (!full || !d.residentUid) return null;

          const parts = full.split("-");
          if (parts.length !== 2) return null;

          return {
            id: doc.id,
            fullUnit: full,
            tower: parts[0],
            number: parts[1],
            residentUid: d.residentUid,
          };
        })
        .filter(Boolean);

      const uniqueTowers = [
        ...new Set(list.map((u: any) => u.tower)),
      ];

      setUnits(list as any[]);
      setTowers(uniqueTowers);
    };

    loadUnits();
  }, [validQR, societyId]);

  //////////////////////////////////////////////////////
  // FILTER UNITS BY TOWER
  //////////////////////////////////////////////////////

  useEffect(() => {
    if (!selectedTower) {
      setFilteredUnits([]);
      return;
    }

    const filtered = units.filter(
      (u) => u.tower === selectedTower
    );

    setFilteredUnits(filtered);
  }, [selectedTower, units]);

  //////////////////////////////////////////////////////
  // LOAD RESIDENT NAME
  //////////////////////////////////////////////////////

  useEffect(() => {
    const loadResident = async () => {
      if (!selectedTower || !selectedNumber) return;

      const fullUnit = `${selectedTower}-${selectedNumber}`;
      const unit = units.find(
        (u) => u.fullUnit === fullUnit
      );

      if (!unit) return;

      const snap = await getDoc(
        doc(db, "users", unit.residentUid)
      );

      if (snap.exists()) {
        setResidentName(
          snap.data().name || "Resident"
        );
      }
    };

    loadResident();
  }, [selectedTower, selectedNumber, units]);

  //////////////////////////////////////////////////////
  // SUBMIT
  //////////////////////////////////////////////////////

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (
      !name ||
      !phone ||
      !purpose ||
      !photo ||
      !selectedTower ||
      !selectedNumber
    ) {
      alert("Fill all required fields");
      return;
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      alert("Enter valid 10 digit phone");
      return;
    }

    setLoading(true);

    try {
      const finalUnit = `${selectedTower}-${selectedNumber}`;

      const unit = units.find(
        (u) => u.fullUnit === finalUnit
      );

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
          unitNo: finalUnit,
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

  //////////////////////////////////////////////////////
  // UI
  //////////////////////////////////////////////////////

  if (checkingQR)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Checking QR...
      </div>
    );

  if (!validQR)
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        Invalid or Expired QR
      </div>
    );

  if (success)
    return (
      <div className="min-h-screen flex items-center justify-center text-center">
        <div>
          <h1 className="text-2xl font-bold mb-4">
            Request Submitted
          </h1>
          <p>Please wait for resident approval.</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4">

        <h1 className="text-xl font-bold text-center">
          Add Visitor
        </h1>

        <div className="flex justify-center">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center cursor-pointer"
          >
            📷
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept="image/*"
          capture="environment"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setPhoto(file);
          }}
        />

        <input
          placeholder="Visitor Name"
          className="w-full border p-2 rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="Phone"
          maxLength={10}
          className="w-full border p-2 rounded"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        {/* TOWER */}
        <select
          className="w-full border p-2 rounded"
          value={selectedTower}
          onChange={(e) => {
            setSelectedTower(e.target.value);
            setSelectedNumber("");
          }}
        >
          <option value="">Select Block</option>
          {towers.map((tower) => (
            <option key={tower} value={tower}>
              {tower}
            </option>
          ))}
        </select>

        {/* UNIT NUMBER */}
        <select
          className="w-full border p-2 rounded"
          value={selectedNumber}
          onChange={(e) =>
            setSelectedNumber(e.target.value)
          }
          disabled={!selectedTower}
        >
          <option value="">Select Unit</option>
          {filteredUnits.map((u) => (
            <option key={u.id} value={u.number}>
              {u.number}
            </option>
          ))}
        </select>

        {residentName && (
          <p className="text-blue-600 font-semibold">
            Resident: {residentName}
          </p>
        )}

        <select
          className="w-full border p-2 rounded"
          value={purpose}
          onChange={(e) =>
            setPurpose(e.target.value)
          }
        >
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

        <input
          placeholder="Vehicle Number"
          className="w-full border p-2 rounded"
          value={vehicleNumber}
          onChange={(e) =>
            setVehicleNumber(e.target.value)
          }
        />

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