"use client";

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  type: string;
  createdAt?: any;
}

export default function MaintenancePage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Maintenance");
  const [type, setType] = useState("daily");

  ////////////////////////////////////////////////////////////
  // FETCH EXPENSES
  ////////////////////////////////////////////////////////////

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) return;

    const societyId = userDoc.data().societyId;

    const q = query(
      collection(db, "societies", societyId, "expenses"),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);

    const list = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Expense[];

    setExpenses(list);
  };

  ////////////////////////////////////////////////////////////
  // ADD EXPENSE
  ////////////////////////////////////////////////////////////

  const addExpense = async () => {
    if (!title || !amount) return;

    const user = auth.currentUser;
    if (!user) return;

    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) return;

    const societyId = userDoc.data().societyId;

    await addDoc(
      collection(db, "societies", societyId, "expenses"),
      {
        title,
        amount: Number(amount),
        category,
        type,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      }
    );

    setTitle("");
    setAmount("");
    fetchExpenses();
  };

  ////////////////////////////////////////////////////////////
  // TOTAL CALC
  ////////////////////////////////////////////////////////////

  const total = expenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-semibold mb-8">
        Maintenance & Expenses
      </h1>

      {/* ADD EXPENSE CARD */}
      <div className="bg-white p-6 rounded-2xl shadow border mb-8">
        <h2 className="text-lg font-semibold mb-4">
          Add Expense
        </h2>

        <div className="grid grid-cols-4 gap-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Expense Title"
            className="border p-2 rounded-lg"
          />

          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            type="number"
            className="border p-2 rounded-lg"
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border p-2 rounded-lg"
          >
            <option>Maintenance</option>
            <option>Electricity</option>
            <option>Water</option>
            <option>Salary</option>
            <option>Other</option>
          </select>

          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="border p-2 rounded-lg"
          >
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <button
          onClick={addExpense}
          className="mt-4 px-5 py-2 bg-gray-800 text-white rounded-lg"
        >
          Add Expense
        </button>
      </div>

      {/* SUMMARY */}
      <div className="bg-white p-6 rounded-2xl shadow border mb-6">
        <h2 className="text-lg font-semibold">
          Total Expenses
        </h2>
        <p className="text-2xl font-bold mt-2">
          ₹ {total}
        </p>
      </div>

      {/* LIST */}
      <div className="bg-white rounded-2xl shadow border divide-y">
        {expenses.map((e) => (
          <div
            key={e.id}
            className="p-5 flex justify-between"
          >
            <div>
              <p className="font-semibold">
                {e.title}
              </p>
              <p className="text-sm text-gray-500">
                {e.category} • {e.type}
              </p>
            </div>

            <div className="font-semibold">
              ₹ {e.amount}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}