// scratch/list_chats.js
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, limit, query } = require('firebase/firestore');
const fs = require('fs');

const envConfig = {};
try {
    const envFileContent = fs.readFileSync('.env.local', 'utf-8');
    envFileContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const parts = trimmed.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const val = parts.slice(1).join('=').trim();
                envConfig[key] = val;
            }
        }
    });
} catch (e) {
    console.log("No se pudo leer .env.local:", e.message);
}

const firebaseConfig = {
    apiKey: envConfig.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: envConfig.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: envConfig.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: envConfig.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: envConfig.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: envConfig.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
    console.log("Conectando a Firestore...");
    const chatsRef = collection(db, 'campaigns', 'main_campaign', 'chats');
    const q = query(chatsRef, limit(20));
    const snap = await getDocs(q);
    
    console.log(`Encontrados ${snap.size} chats:`);
    snap.docs.forEach(d => {
        console.log(`- ID del Documento: "${d.id}" | Datos:`, d.data());
    });
}

main().catch(err => console.error(err));
