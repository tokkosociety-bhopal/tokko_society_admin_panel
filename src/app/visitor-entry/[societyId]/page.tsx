"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import {
  addDoc,
  collection,
  serverTimestamp,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

export default function VisitorEntryPage() {
  const params = useParams();
  const societyId = params.societyId as string;

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

  // 🔹 Start Camera
  const startCamera = async () => {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {
    alert("Camera not supported on this device or connection.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }

    setCameraOpen(true);
  } catch (error) {
    console.error(error);
    alert("Unable to access camera.");
  }
};

  // 🔹 Capture Photo
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
      const file = new File([blob], "live-photo.jpg", {
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

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!name || !phone || !unitNo || !purpose) {
      alert("Please fill all required fields");
      return;
    }

    if (!photo) {
      alert("Please capture visitor photo");
      return;
    }

    try {
      setLoading(true);

      // 🔹 1️⃣ Validate Unit
      const unitQuery = query(
        collection(db, "societies", societyId, "units"),
        where("unitNo", "==", unitNo.toUpperCase())
      );

      const unitSnapshot = await getDocs(unitQuery);

      if (unitSnapshot.empty) {
        alert("Unit not found");
        setLoading(false);
        return;
      }

      const unitData = unitSnapshot.docs[0].data();
      const residentUid = unitData.residentUid;

      if (!residentUid) {
        alert("No resident assigned to this unit");
        setLoading(false);
        return;
      }

      // 🔹 2️⃣ Upload Photo
      const photoRef = ref(
        storage,
        `visitor_photos/${Date.now()}_${photo.name}`
      );

      await uploadBytes(photoRef, photo);
      const photoUrl = await getDownloadURL(photoRef);

      // 🔹 3️⃣ Save Visitor Request
      await addDoc(
        collection(db, "societies", societyId, "visitorRequests"),
        {
          name,
          phone,
          unitNo: unitNo.toUpperCase(),
          purpose,
          vehicleNumber,
          photoUrl,
          residentUid,
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
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">
            Visitor Request Submitted
          </h1>
          <p>Please wait for resident approval.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-6">
        <h1 className="text-xl font-bold mb-6 text-center">
          Visitor Entry Form
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
            placeholder="Unit Number (e.g. C-102)"
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

          {/* CAMERA SECTION */}
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
            disabled={loading}
            className="w-full bg-black text-white p-2 rounded"
          >
            {loading ? "Submitting..." : "Submit"}
          </button>
        </form>
      </div>
    </div>
  );
}