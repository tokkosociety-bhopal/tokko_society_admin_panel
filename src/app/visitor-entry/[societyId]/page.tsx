"use client";

import { useState, useRef, useEffect } from "react";
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

  //////////////////////////////////////////////////////
  // STATES
  //////////////////////////////////////////////////////

  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [unitNo, setUnitNo] = useState("");
  const [purpose, setPurpose] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");

  const [photo, setPhoto] = useState<File | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  //////////////////////////////////////////////////////
  // 🔐 QR VALIDATION
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

      if (!data) {
        setCheckingQR(false);
        return;
      }

      // 1️⃣ Status check
      if (data.status !== "active") {
        setCheckingQR(false);
        return;
      }

      // 2️⃣ Safe key comparison (trimmed)
      const dbKey = String(data.qrKey || "").trim();
      const urlKey = String(key || "").trim();

      if (!dbKey || dbKey !== urlKey) {
        setCheckingQR(false);
        return;
      }

      // 3️⃣ Expiry exists check
      if (!data.qrExpiry) {
        setCheckingQR(false);
        return;
      }

      // 4️⃣ Convert Firestore Timestamp safely
      const expiryDate =
        typeof data.qrExpiry.toDate === "function"
          ? data.qrExpiry.toDate()
          : new Date(data.qrExpiry);

      // 5️⃣ Expiry validation
      if (expiryDate.getTime() <= now.getTime()) {
        setCheckingQR(false);
        return;
      }

      // ✅ Everything valid
      setValidQR(true);

    } catch (error) {
      console.error("QR validation error:", error);
    } finally {
      setCheckingQR(false);
    }
  };

  validateQR();
}, [societyId, key]);

  //////////////////////////////////////////////////////
  // 📷 CAMERA
  //////////////////////////////////////////////////////

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraOpen(true);
    } catch (error) {
      alert("Camera not accessible");
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx?.drawImage(video, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.8)
    );

    if (blob) {
      const file = new File([blob], "visitor.jpg", {
        type: "image/jpeg",
      });
      setPhoto(file);
    }

    const stream = video.srcObject as MediaStream | null;
    if (stream) {
    stream.getTracks().forEach((track) => track.stop());
}

    setCameraOpen(false);
  };

  //////////////////////////////////////////////////////
  // 📝 SUBMIT
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

      //////////////////////////////////////////////////////
      // UNIT VALIDATION
      //////////////////////////////////////////////////////

      const unitRef = doc(
        db,
        "societies",
        societyId,
        "units",
        upperUnit
      );

      const unitSnap = await getDoc(unitRef);

      if (!unitSnap.exists()) {
        alert("Unit not found");
        return;
      }

      const unitData = unitSnap.data();

      if (!unitData.residentUid) {
        alert("No resident assigned to this unit");
        return;
      }

      //////////////////////////////////////////////////////
      // DUPLICATE CHECK
      //////////////////////////////////////////////////////

      const duplicateQuery = query(
        collection(db, "societies", societyId, "visitorRequests"),
        where("phone", "==", phone),
        where("unitNo", "==", upperUnit),
        where("status", "==", "pending")
      );

      const duplicateSnap = await getDocs(duplicateQuery);

      if (!duplicateSnap.empty) {
        alert("Request already pending for this unit");
        return;
      }

      //////////////////////////////////////////////////////
      // PHOTO UPLOAD
      //////////////////////////////////////////////////////

      const photoRef = ref(
        storage,
        `visitor_photos/${Date.now()}_${photo.name}`
      );

      await uploadBytes(photoRef, photo);
      const photoUrl = await getDownloadURL(photoRef);

      //////////////////////////////////////////////////////
      // SAVE REQUEST
      //////////////////////////////////////////////////////

      await addDoc(
        collection(db, "societies", societyId, "visitorRequests"),
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
  // UI STATES
  //////////////////////////////////////////////////////

  if (checkingQR) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Checking QR...
      </div>
    );
  }

  if (!validQR) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600 text-xl">
        Invalid or Expired QR Code
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">
            Request Submitted
          </h1>
          <p>Please wait for resident approval.</p>
        </div>
      </div>
    );
  }

  //////////////////////////////////////////////////////
  // FORM UI
  //////////////////////////////////////////////////////

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-6">

        <h1 className="text-xl font-bold mb-6 text-center">
          Visitor Entry
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">

          <input
            type="text"
            placeholder="Visitor Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border p-2 rounded"
          />

          <input
            type="tel"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border p-2 rounded"
          />

          <input
            type="text"
            placeholder="Unit Number"
            value={unitNo}
            onChange={(e) => setUnitNo(e.target.value)}
            className="w-full border p-2 rounded"
          />

          <input
            type="text"
            placeholder="Purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="w-full border p-2 rounded"
          />

          <input
            type="text"
            placeholder="Vehicle Number (Optional)"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value)}
            className="w-full border p-2 rounded"
          />

          {!cameraOpen && !photo && (
            <button
              type="button"
              onClick={startCamera}
              className="w-full bg-blue-600 text-white p-2 rounded"
            >
              Take Live Photo
            </button>
          )}

          {cameraOpen && (
            <div className="space-y-2">
              <video ref={videoRef} autoPlay className="w-full rounded" />
              <button
                type="button"
                onClick={capturePhoto}
                className="w-full bg-green-600 text-white p-2 rounded"
              >
                Capture Photo
              </button>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />

          {photo && (
            <p className="text-green-600 text-sm">
              Photo captured successfully
            </p>
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