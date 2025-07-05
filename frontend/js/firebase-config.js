const firebaseConfig = {
    apiKey: "AIzaSyAF4xJYedIsOuKXD7JOLuR4gP74f4Tue90",
    authDomain: "bloombuddy-id.firebaseapp.com",
    projectId: "bloombuddy-id",
    storageBucket: "bloombuddy-id.firebasestorage.app",
    messagingSenderId: "837626738147",
    appId: "1:837626738147:web:1fe1ada7222d349fdc9cd6",
    measurementId: "G-7PK0MMW53H"
};

// Initialize Firebase (compat version)
firebase.initializeApp(firebaseConfig);

// Export Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Configure Google Sign-In
const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');