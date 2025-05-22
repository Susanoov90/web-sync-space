"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
// src/firebase.ts
var app_1 = require("firebase/app");
var database_1 = require("firebase/database");
var firebaseConfig = {
    apiKey: "AIzaSyCYWiWZtaC_GCGP-u6q4uuyI7LDCL6tpuA",
    authDomain: "web-sync-space.firebaseapp.com",
    databaseURL: "https://web-sync-space-default-rtdb.firebaseio.com",
    projectId: "web-sync-space",
    storageBucket: "web-sync-space.firebasestorage.app",
    messagingSenderId: "191633119192",
    appId: "1:191633119192:web:fd9e5a60799d15a09d84ad"
};
// Initialise Firebase
var app = (0, app_1.initializeApp)(firebaseConfig);
// Accès à la base de données en temps réel
exports.db = (0, database_1.getDatabase)(app);
