//firebase-config.js

// Import the Firebase SDK
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";

// import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
// import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
// import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
// import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBhEXY5ATio_B9FYk9NMO5EWW6JuP4gF34",
  authDomain: "recipe-cheker.firebaseapp.com",
  projectId: "recipe-cheker",
  storageBucket: "recipe-cheker.firebasestorage.app",
  messagingSenderId: "422740161285",
  appId: "1:422740161285:web:b2526047aac4c4a6733d6c",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const firestore = getFirestore(app);

// Make Firebase auth and database available globally
window.firebase = {
  auth,
  database,
  firestore,
};
