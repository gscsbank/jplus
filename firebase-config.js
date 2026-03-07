// Firebase Configuration provided by user
const firebaseConfig = {
    apiKey: "AIzaSyDNnNtk6boqci9lTWFIb8Hz90OX69fP7x0",
    authDomain: "jplus-a8fab.firebaseapp.com",
    projectId: "jplus-a8fab",
    storageBucket: "jplus-a8fab.firebasestorage.app",
    messagingSenderId: "1097463349222",
    appId: "1:1097463349222:web:4cd7030e082498dba1a027",
    measurementId: "G-XBLQ9WV37B"
};

// Initialize Firebase (Compat Version)
firebase.initializeApp(firebaseConfig);
const firestore = firebase.firestore();
const auth = firebase.auth();

console.log("Firebase initialized successfully.");

// Persistent cloud sync flag
window.isCloudSyncing = false;
