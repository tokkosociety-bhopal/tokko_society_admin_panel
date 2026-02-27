"use client";

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export default function ReportsPage() {
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("maintenance");

  const [monthlyStats, setMonthlyStats] = useState({
    total: 0,
    resolved: 0,
    pending: 0,
    high: 0,
  });

  ////////////////////////////////////////////////////////
  // INIT
  ////////////////////////////////////////////////////////

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const userDoc = await getDoc(doc(db, "users", user.uid));
    const sid = userDoc.data()?.societyId;

    if (!sid) return;

    setSocietyId(sid);
    fetchComplaints(sid);
  };

  ////////////////////////////////////////////////////////
  // FETCH COMPLAINTS
  ////////////////////////////////////////////////////////

  const fetchComplaints = async (sid: string) => {
    const q = query(
      collection(db, "societies", sid, "complaints"),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);

    const list = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    setComplaints(list);
    calculateMonthly(list);
  };

  ////////////////////////////////////////////////////////
  // CREATE COMPLAINT
  ////////////////////////////////////////////////////////

  const createComplaint = async () => {
    if (!societyId || !title.trim() || !description.trim()) return;

    await addDoc(
      collection(db, "societies", societyId, "complaints"),
      {
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        status: "open",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    );

    setTitle("");
    setDescription("");
    fetchComplaints(societyId);
  };

  ////////////////////////////////////////////////////////
  // UPDATE STATUS
  ////////////////////////////////////////////////////////

  const updateStatus = async (id: string, status: string) => {
    if (!societyId) return;

    await updateDoc(
      doc(db, "societies", societyId, "complaints", id),
      {
        status,
        updatedAt: serverTimestamp(),
      }
    );

    fetchComplaints(societyId);
  };

  ////////////////////////////////////////////////////////
  // DELETE
  ////////////////////////////////////////////////////////

  const deleteComplaint = async (id: string) => {
    if (!societyId) return;

    await deleteDoc(
      doc(db, "societies", societyId, "complaints", id)
    );

    fetchComplaints(societyId);
  };

  ////////////////////////////////////////////////////////
  // MONTHLY STATS CALCULATION
  ////////////////////////////////////////////////////////

  const calculateMonthly = (list: any[]) => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    let total = 0;
    let resolved = 0;
    let pending = 0;
    let high = 0;

    list.forEach((c) => {
      if (!c.createdAt || !c.createdAt.toDate) return;

      const d = c.createdAt.toDate();

      if (d.getMonth() === month && d.getFullYear() === year) {
        total++;

        if (c.status === "resolved") resolved++;

        if (c.status === "open" || c.status === "in_progress")
          pending++;

        if (c.priority === "high") high++;
      }
    });

    setMonthlyStats({ total, resolved, pending, high });
  };

  ////////////////////////////////////////////////////////
  // FILTER
  ////////////////////////////////////////////////////////

  const filtered =
    filter === "all"
      ? complaints
      : complaints.filter((c) => c.status === filter);

  ////////////////////////////////////////////////////////
  // UI
  ////////////////////////////////////////////////////////

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-semibold mb-8">
        Complaints & Monthly Report
      </h1>

      {/* CREATE */}
      <div className="bg-white p-6 rounded-2xl shadow border mb-8">
        <h2 className="font-semibold mb-4">
          Create Complaint
        </h2>

        <div className="grid grid-cols-4 gap-4">
          <input
            placeholder="Title"
            className="border p-2 rounded-lg"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <select
            className="border p-2 rounded-lg"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="maintenance">Maintenance</option>
            <option value="security">Security</option>
            <option value="noise">Noise</option>
            <option value="other">Other</option>
          </select>

          <select
            className="border p-2 rounded-lg"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <button
            onClick={createComplaint}
            className="bg-gray-800 text-white rounded-lg px-4"
          >
            Create
          </button>
        </div>

        <textarea
          placeholder="Description"
          className="border p-2 rounded-lg mt-4 w-full"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* FILTERS */}
      <div className="flex gap-3 mb-6">
        {["all", "open", "in_progress", "resolved"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg border capitalize ${
              filter === f
                ? "bg-gray-800 text-white"
                : "bg-white"
            }`}
          >
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* LIST */}
      <div className="bg-white rounded-2xl shadow border divide-y mb-10">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="p-6 flex justify-between items-center"
          >
            <div>
              <p className="font-semibold text-lg">
                {c.title}
              </p>
              <p className="text-sm text-gray-500">
                {c.category} • {c.priority}
              </p>
              <p className="mt-2 text-gray-600">
                {c.description}
              </p>
            </div>

            <div className="text-right space-y-2">
              <span className="block text-xs bg-gray-100 px-3 py-1 rounded-full capitalize">
                {c.status}
              </span>

              <select
                value={c.status}
                onChange={(e) =>
                  updateStatus(c.id, e.target.value)
                }
                className="border p-1 rounded"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>

              <button
                onClick={() => deleteComplaint(c.id)}
                className="text-red-600 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MONTHLY REPORT SUMMARY */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard title="Total This Month" value={monthlyStats.total} />
        <StatCard title="Resolved" value={monthlyStats.resolved} />
        <StatCard title="Pending" value={monthlyStats.pending} />
        <StatCard title="High Priority" value={monthlyStats.high} />
      </div>
    </div>
  );
}

function StatCard({ title, value }: any) {
  return (
    <div className="bg-white rounded-2xl shadow border p-6">
      <p className="text-gray-500 text-sm">{title}</p>
      <p className="text-2xl font-semibold mt-2">{value}</p>
    </div>
  );
}