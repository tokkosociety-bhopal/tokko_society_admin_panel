"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  query,
  limit,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";

export default function GuardsPage() {
  const [societyId, setSocietyId] = useState("");
  const [guards, setGuards] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const [showGuardModal, setShowGuardModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("");

  //////////////////////////////////////////////////////////////

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      const sId = userDoc.data()?.societyId;
      if (!sId) return;

      setSocietyId(sId);

      const guardsSnap = await getDocs(
        query(collection(db, "societies", sId, "guards"), limit(50))
      );

      const staffSnap = await getDocs(
        query(collection(db, "societies", sId, "societyStaff"), limit(50))
      );

      setGuards(guardsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setStaff(staffSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    load();
  }, []);

  //////////////////////////////////////////////////////////////
  // ADD GUARD (EMAIL LOGIN)
  //////////////////////////////////////////////////////////////

  const handleAddGuard = async () => {
    if (!name || !email) {
      alert("Name & Email required");
      return;
    }

    const functions = getFunctions();
    const createUser = httpsCallable(functions, "createSocietyUser");

    await createUser({
      name,
      email,
      role: "guard",
    });

    location.reload();
  };

  //////////////////////////////////////////////////////////////
  // ADD SOCIETY STAFF (NO LOGIN)
  //////////////////////////////////////////////////////////////

  const handleAddStaff = async () => {
    if (!name || !category) {
      alert("Name & Category required");
      return;
    }

    await addDoc(
      collection(db, "societies", societyId, "societyStaff"),
      {
        name,
        phone,
        category,
        isActive: true,
        createdAt: new Date(),
      }
    );

    location.reload();
  };

  //////////////////////////////////////////////////////////////

  const toggleStatus = async (id: string, collectionName: string, current: boolean) => {
    await updateDoc(
      doc(db, "societies", societyId, collectionName, id),
      { isActive: !current }
    );
    location.reload();
  };

  const handleDelete = async (id: string, collectionName: string) => {
    await deleteDoc(
      doc(db, "societies", societyId, collectionName, id)
    );
    location.reload();
  };

  //////////////////////////////////////////////////////////////

  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">
            Guards & Staff Management
          </h2>
          <p className="text-gray-500 text-sm">
            Manage security guards and society staff
          </p>
        </div>

        <input
          placeholder="Search by name..."
          className="mt-4 md:mt-0 border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none px-4 py-2 rounded-lg w-72"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* GUARDS SECTION */}
      <SectionCard
        title="Guards"
        subtitle="Login enabled security guards"
        buttonLabel="+ Add Guard"
        buttonColor="green"
        onClick={() => setShowGuardModal(true)}
      >
        {guards
          .filter(g =>
            g.name?.toLowerCase().includes(search.toLowerCase())
          )
          .map(g => (
            <ListItem
              key={g.id}
              name={g.name}
              sub={g.email}
              active={g.isActive}
              onToggle={() => toggleStatus(g.id, "guards", g.isActive)}
              onDelete={() => handleDelete(g.id, "guards")}
            />
          ))}
      </SectionCard>

      {/* STAFF SECTION */}
      <SectionCard
        title="Society Staff"
        subtitle="Non-login staff members"
        buttonLabel="+ Add Staff"
        buttonColor="blue"
        onClick={() => setShowStaffModal(true)}
      >
        {staff
          .filter(s =>
            s.name?.toLowerCase().includes(search.toLowerCase())
          )
          .map(s => (
            <ListItem
              key={s.id}
              name={s.name}
              sub={s.category}
              active={s.isActive}
              onToggle={() => toggleStatus(s.id, "societyStaff", s.isActive)}
              onDelete={() => handleDelete(s.id, "societyStaff")}
            />
          ))}
      </SectionCard>

      {/* MODALS */}
      {showGuardModal && (
        <Modal title="Add Guard (Login Enabled)" onClose={() => setShowGuardModal(false)}>
          <input
            placeholder="Full Name"
            className="input"
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Email Address"
            className="input"
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="btn-green" onClick={handleAddGuard}>
            Save Guard
          </button>
        </Modal>
      )}

      {showStaffModal && (
        <Modal title="Add Society Staff" onClose={() => setShowStaffModal(false)}>
          <input
            placeholder="Full Name"
            className="input"
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Phone Number"
            className="input"
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            placeholder="Category"
            className="input"
            onChange={(e) => setCategory(e.target.value)}
          />
          <button className="btn-blue" onClick={handleAddStaff}>
            Save Staff
          </button>
        </Modal>
      )}
    </div>
  );
}

//////////////////////////////////////////////////////////////
// REUSABLE UI COMPONENTS
//////////////////////////////////////////////////////////////

function SectionCard({ title, subtitle, buttonLabel, buttonColor, onClick, children }: any) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-10">
      <div className="flex justify-between items-center p-6 border-b">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        <button
          onClick={onClick}
          className={`px-5 py-2 rounded-lg text-white transition ${
            buttonColor === "green"
              ? "bg-green-600 hover:bg-green-700"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {buttonLabel}
        </button>
      </div>

      <div className="divide-y">{children}</div>
    </div>
  );
}

function ListItem({ name, sub, active, onToggle, onDelete }: any) {
  return (
    <div className="p-5 flex flex-col md:flex-row md:items-center md:justify-between hover:bg-gray-50 transition">
      <div>
        <p className="font-medium text-gray-800">{name}</p>
        <p className="text-sm text-gray-500">{sub}</p>

        <span className={`inline-block mt-2 text-xs px-3 py-1 rounded-full ${
          active
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }`}>
          {active ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="flex gap-3 mt-4 md:mt-0">
        <button
          onClick={onToggle}
          className="px-4 py-2 text-sm rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 transition"
        >
          {active ? "Deactivate" : "Activate"}
        </button>

        <button
          onClick={onDelete}
          className="px-4 py-2 text-sm rounded-lg border border-red-600 text-red-600 hover:bg-red-50 transition"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white w-96 p-6 rounded-2xl shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4">{children}</div>
      </div>
    </div>
  );
}