import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCjpY_9_-C5_8ShIj4gwkgVcYwzf2wbDgU",
  authDomain: "tokko-society.firebaseapp.com",
  projectId: "tokko-society",
  storageBucket: "tokko-society.firebasestorage.app",
  messagingSenderId: "842132813928",
  appId: "1:842132813928:web:ba216723ae591a60cb63dd",
  measurementId: "G-8B2STEFEJE"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// 🔥 VERY IMPORTANT — AFTER auth creation
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Persistence error:", error);
  });