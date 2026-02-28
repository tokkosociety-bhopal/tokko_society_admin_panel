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
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [purpose, setPurpose] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  const [units, setUnits] = useState<any[]>([]);
  const [unitTypeFilter, setUnitTypeFilter] = useState("all");

  const [blocks, setBlocks] = useState<string[]>([]);
  const [selectedBlock, setSelectedBlock] = useState("");
  const [selectedUnitNumber, setSelectedUnitNumber] = useState("");

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
      if (!validQR) return;

      const snap = await getDocs(
        collection(db, "societies", societyId, "units")
      );

      const list = snap.docs
        .map((doc) => {
          const d = doc.data();
          const full = d.unitNo;

          if (!full || !d.residentUid) return null;

          const parts = full.split("-");
          if (parts.length !== 2) return null;

          return {
            id: doc.id,
            fullUnit: full,
            block: parts[0],
            number: parts[1],
            residentUid: d.residentUid,
            type: d.type || "flat",
          };
        })
        .filter(Boolean);

      setUnits(list as any[]);
    };

    loadUnits();
  }, [validQR, societyId]);

  ////////////////////////////////////////////////////
  // FILTER BLOCKS BY TYPE
  ////////////////////////////////////////////////////

  useEffect(() => {
    const filteredByType =
      unitTypeFilter === "all"
        ? units
        : units.filter((u) => u.type === unitTypeFilter);

    const uniqueBlocks = [
      ...new Set(filteredByType.map((u) => u.block)),
    ];

    setBlocks(uniqueBlocks);
    setSelectedBlock("");
    setSelectedUnitNumber("");
  }, [unitTypeFilter, units]);

  ////////////////////////////////////////////////////
  // RESIDENT + AUTO APPROVE
  ////////////////////////////////////////////////////

  useEffect(() => {
    const loadResident = async () => {
      if (!selectedBlock || !selectedUnitNumber) return;

      const finalUnit = `${selectedBlock}-${selectedUnitNumber}`;
      const unit = units.find(
        (u) => u.fullUnit === finalUnit
      );
      if (!unit) return;

      const userSnap = await getDoc(
        doc(db, "users", unit.residentUid)
      );

      if (userSnap.exists()) {
        setResidentName(userSnap.data().name || "Resident");
      }

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
  }, [selectedBlock, selectedUnitNumber, phone]);

  ////////////////////////////////////////////////////
  // SUBMIT
  ////////////////////////////////////////////////////

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (
      !name ||
      !phone ||
      !purpose ||
      !photo ||
      !selectedBlock ||
      !selectedUnitNumber
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
      const finalUnit = `${selectedBlock}-${selectedUnitNumber}`;
      const unit = units.find(
        (u) => u.fullUnit === finalUnit
      );

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
          residentUid: unit?.residentUid,
          status: "pending",
          source: "qr",
          createdAt: serverTimestamp(),
        }
      );

      setSuccess(true);
    } catch (err) {
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

  const unitsForBlock = units.filter(
    (u) =>
      u.block === selectedBlock &&
      (unitTypeFilter === "all" ||
        u.type === unitTypeFilter)
  );

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-3">
      <div className="w-full sm:max-w-md max-w-sm bg-white rounded-2xl shadow-xl p-5 space-y-4">

        <h1 className="text-lg font-semibold text-center">Add Visitor</h1>

        <div className="flex justify-center">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center cursor-pointer"
          >
            📷
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

        {/* TYPE */}
        <select
          className="w-full border p-2 rounded"
          value={unitTypeFilter}
          onChange={(e) => setUnitTypeFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="flat">Flat</option>
          <option value="duplex">Duplex</option>
          <option value="villa">Villa</option>
        </select>

        {/* BLOCK */}
        <select
          className="w-full border p-2 rounded"
          value={selectedBlock}
          onChange={(e) => {
            setSelectedBlock(e.target.value);
            setSelectedUnitNumber("");
          }}
        >
          <option value="">Select Block</option>
          {blocks.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        {/* UNIT NUMBER */}
        <select
          className="w-full border p-2 rounded"
          value={selectedUnitNumber}
          onChange={(e) =>
            setSelectedUnitNumber(e.target.value)
          }
          disabled={!selectedBlock}
        >
          <option value="">Select Unit</option>
          {unitsForBlock.map((u) => (
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

        {approvalPreview && (
          <p className={`${approvalColor} font-semibold`}>
            {approvalPreview}
          </p>
        )}

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