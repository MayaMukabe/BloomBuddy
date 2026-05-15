// firebase-config.js — Single source of truth for Firebase configuration
// All pages import from this module instead of duplicating the config

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signInAnonymously, updateProfile, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, sendPasswordResetEmail, getAdditionalUserInfo } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, setDoc, addDoc, collection, serverTimestamp, getDocs, query, where, orderBy, getDoc, limit, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyAF4xJYedIsOuKXD7JOLuR4gP74f4Tue90",
  authDomain: "bloombuddy-id.firebaseapp.com",
  projectId: "bloombuddy-id",
  storageBucket: "bloombuddy-id.firebasestorage.app",
  messagingSenderId: "837626738147",
  appId: "1:837626738147:web:63ad0819361b0281dc9cd6",
  measurementId: "G-SNEL7GGE3H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export to window for use by non-module scripts
window.auth = auth;
window.db = db;

// Auth methods
window.signOut = signOut;
window.onAuthStateChanged = onAuthStateChanged;
window.signInWithEmailAndPassword = signInWithEmailAndPassword;
window.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
window.signInWithPopup = signInWithPopup;
window.GoogleAuthProvider = GoogleAuthProvider;
window.signInAnonymously = signInAnonymously;
window.updateProfile = updateProfile;
window.updateEmail = updateEmail;
window.updatePassword = updatePassword;
window.reauthenticateWithCredential = reauthenticateWithCredential;
window.EmailAuthProvider = EmailAuthProvider;
window.sendPasswordResetEmail = sendPasswordResetEmail;
window.getAdditionalUserInfo = getAdditionalUserInfo;
// Firestore methods
window.doc = doc;
window.setDoc = setDoc;
window.addDoc = addDoc;
window.collection = collection;
window.serverTimestamp = serverTimestamp;
window.getDocs = getDocs;
window.query = query;
window.where = where;
window.orderBy = orderBy;
window.getDoc = getDoc;
window.limit = limit;
window.updateDoc = updateDoc;
window.deleteDoc = deleteDoc;

// Analytics (gracefully handles environments where analytics won't load)
let analytics = null;
let logEventFn = () => {}; // no-op fallback

try {
  const { getAnalytics, logEvent } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js');
  // Analytics only works on http/https, not file://
  if (window.location.protocol !== 'file:') {
    analytics = getAnalytics(app);
    logEventFn = (eventName, params) => {
      try {
        logEvent(analytics, eventName, params);
      } catch (e) {
        console.warn('Analytics event failed:', eventName, e);
      }
    };
    console.log('Firebase Analytics initialized');
  }
} catch (e) {
  console.warn('Firebase Analytics not available:', e.message);
}

window.bbAnalytics = logEventFn;

export { app, auth, db, analytics };
