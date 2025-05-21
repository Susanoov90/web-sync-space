// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCYWiWZtaC_GCGP-u6q4uuyI7LDCL6tpuA",
  authDomain: "web-sync-space.firebaseapp.com",
  databaseURL: "https://web-sync-space-default-rtdb.firebaseio.com",
  projectId: "web-sync-space",
  storageBucket: "web-sync-space.firebasestorage.app",
  messagingSenderId: "191633119192",
  appId: "1:191633119192:web:fd9e5a60799d15a09d84ad"
};

// Initialise Firebase
const app = initializeApp(firebaseConfig);

// Accès à la base de données en temps réel
export const db = getDatabase(app);
