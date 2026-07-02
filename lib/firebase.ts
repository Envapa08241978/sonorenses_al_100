import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp = {} as FirebaseApp;
let db: Firestore = {} as Firestore;
let storage: FirebaseStorage = {} as FirebaseStorage;
let auth: Auth = {} as Auth;

if (typeof window !== 'undefined' && !getApps().length) {
    if (firebaseConfig.apiKey) {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        storage = getStorage(app);
        auth = getAuth(app);
    } else {
        console.error("Firebase config is missing. Please add environment variables.");
    }
} else if (getApps().length > 0) {
    app = getApps()[0];
    db = getFirestore(app);
    storage = getStorage(app);
    auth = getAuth(app);
} else if (typeof window === 'undefined') {
    // SSR fallback to prevent build errors
    if (firebaseConfig.apiKey && !getApps().length) {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        storage = getStorage(app);
        auth = getAuth(app);
    } else if (getApps().length > 0) {
        app = getApps()[0];
        db = getFirestore(app);
        storage = getStorage(app);
        auth = getAuth(app);
    }
}

export { app, db, storage, auth };
