"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAuth } from "firebase/auth";

export default function PaymentDetailsPage() {
  const [amount, setAmount] = useState<number>(0);

  useEffect(() => {
    const fetchAmount = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const userSnap = await getDoc(doc(db, "users", user.uid));
      const societyId = userSnap.data()?.societyId;
      if (!societyId) return;

      const societySnap = await getDoc(
        doc(db, "societies", societyId)
      );

      setAmount(Number(societySnap.data()?.planPrice) || 0);
    };

    fetchAmount();
  }, []);

  return (
    <div className="p-8 bg-gray-50 min-h-screen">

      <h2 className="text-3xl font-bold mb-8 text-gray-800">
        Tokko Society Subscription Payment
      </h2>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">

        {/* Subscription Amount */}
        <div className="bg-yellow-100 border border-yellow-300 p-4 rounded-xl mb-8">
          <p className="text-lg font-semibold text-gray-800">
            Total Subscription Amount: ₹ {amount}
          </p>
        </div>

        <p className="text-gray-600 mb-6">
          Please use the below details to complete your subscription payment.
        </p>

        <div className="grid md:grid-cols-2 gap-12 items-center">

          {/* LEFT SIDE – BANK + UPI DETAILS */}
          <div className="space-y-6">

            <div className="border rounded-xl p-6 bg-gray-50 space-y-3">
              <p><strong>Account Name:</strong> PEDICIVE HYGIENE CARE</p>
              <p><strong>Bank Name:</strong> KARNATAKA BANK</p>
              <p><strong>Account Number:</strong> 1272000100063501</p>
              <p><strong>IFSC Code:</strong> KARB0000127</p>
            </div>

            <div className="border rounded-xl p-6 bg-blue-50">
              <p className="font-semibold text-blue-700 mb-2">
                UPI Payment
              </p>
              <p>
                <strong>UPI ID:</strong> n.malviya@superyes
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Scan the QR code or pay using any UPI app (Google Pay, PhonePe, Paytm, etc.)
              </p>
            </div>

          </div>

          {/* RIGHT SIDE – QR IMAGE */}
          <div className="flex flex-col items-center">

            <div className="bg-white border rounded-2xl shadow-md p-6">
              <img
                src="/supermoney-qr.png"
                alt="UPI QR Code"
                className="w-80 object-contain"
              />
            </div>

            <p className="mt-4 text-sm text-gray-500 text-center">
              Scan QR code to complete your payment instantly.
            </p>

          </div>

        </div>

        {/* Professional Confirmation Message */}
        <div className="mt-10 pt-6 border-t text-sm text-gray-600">
          Once your payment is successfully reflected in our company account,
          your subscription services will be activated within 2 hours.
        </div>

        <div className="mt-4 text-sm text-gray-500">
          After completing the payment, please share the transaction reference
          with our support team for faster processing.
        </div>

      </div>
    </div>
  );
}