"use client";

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt?: any;
}

export default function NoticesPage() {
  const [list, setList] = useState<Announcement[]>([]);
  const [filter, setFilter] = useState("all");

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("important");

  ////////////////////////////////////////////////////////
  // FETCH
  ////////////////////////////////////////////////////////

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const userDoc = await getDoc(doc(db, "users", user.uid));
    const societyId = userDoc.data()?.societyId;

    const q = query(
      collection(db, "societies", societyId, "announcements"),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);

    const data = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Announcement[];

    setList(data);
  };

  ////////////////////////////////////////////////////////
  // CREATE
  ////////////////////////////////////////////////////////

  const createAnnouncement = async () => {
    if (!title || !message) return;

    const user = auth.currentUser;
    if (!user) return;

    const userDoc = await getDoc(doc(db, "users", user.uid));
    const societyId = userDoc.data()?.societyId;

    await addDoc(
      collection(db, "societies", societyId, "announcements"),
      {
        title,
        message,
        type,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      }
    );

    setTitle("");
    setMessage("");
    fetchData();
  };

  ////////////////////////////////////////////////////////
  // DELETE
  ////////////////////////////////////////////////////////

  const deleteAnnouncement = async (id: string) => {
    const user = auth.currentUser;
    if (!user) return;

    const userDoc = await getDoc(doc(db, "users", user.uid));
    const societyId = userDoc.data()?.societyId;

    await deleteDoc(
      doc(db, "societies", societyId, "announcements", id)
    );

    fetchData();
  };

  ////////////////////////////////////////////////////////
  // FILTER
  ////////////////////////////////////////////////////////

  const filtered =
    filter === "all"
      ? list
      : list.filter((item) => item.type === filter);

  ////////////////////////////////////////////////////////
  // UI
  ////////////////////////////////////////////////////////

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-semibold mb-8">
        Notices & Announcements
      </h1>

      {/* CREATE */}
      <div className="bg-white p-6 rounded-2xl shadow border mb-8">
        <div className="grid grid-cols-3 gap-4">
          <input
            placeholder="Title"
            className="border p-2 rounded-lg"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <select
            className="border p-2 rounded-lg"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="important">Important</option>
            <option value="events">Events</option>
            <option value="general">General</option>
          </select>

          <button
            onClick={createAnnouncement}
            className="bg-gray-800 text-white rounded-lg"
          >
            Create
          </button>
        </div>

        <textarea
          placeholder="Message"
          className="border p-2 rounded-lg mt-4 w-full"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      {/* FILTER */}
      <div className="flex gap-3 mb-6">
        {["all", "important", "events"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg capitalize border ${
              filter === f
                ? "bg-gray-800 text-white"
                : "bg-white"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* LIST */}
      <div className="bg-white rounded-2xl shadow border divide-y">
        {filtered.map((n) => (
          <div
            key={n.id}
            className="p-6 flex justify-between"
          >
            <div>
              <p className="font-semibold text-lg">
                {n.title}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {n.message}
              </p>
            </div>

            <div className="text-right">
              <span className="px-3 py-1 text-xs rounded-full bg-gray-100 capitalize">
                {n.type}
              </span>

              <button
                onClick={() => deleteAnnouncement(n.id)}
                className="block mt-3 text-sm text-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}