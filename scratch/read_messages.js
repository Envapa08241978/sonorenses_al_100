// scratch/read_messages.js
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, getDocs, orderBy, query, limit } = require('firebase/firestore');
const fs = require('fs');

// Parse .env.local manually to avoid installing dotenv
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
    console.log("Variables de entorno cargadas exitosamente.");
} catch (e) {
    console.log("No se pudo leer .env.local, usando variables del proceso:", e.message);
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
    console.log("Conectando a Firestore con Project ID:", firebaseConfig.projectId);
    
    const chatId = "5216421600559";
    const chatRef = doc(db, 'campaigns', 'main_campaign', 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    
    if (chatSnap.exists()) {
        console.log("Chat encontrado:", chatSnap.data());
        
        const messagesRef = collection(chatRef, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(10));
        const messagesSnap = await getDocs(q);
        
        console.log("\nÚltimos 10 mensajes en la base de datos:");
        messagesSnap.docs.forEach(d => {
            const m = d.data();
            console.log(`- [${m.direction}] [${m.timestamp?.toDate().toLocaleString() || 'sin fecha'}] Type: ${m.type || 'text'}, Body: "${m.body || ''}", To/From: ${m.to || m.from || ''}`);
        });
    } else {
        console.log("Chat no encontrado para id:", chatId);
    }
}

main().catch(err => console.error(err));
