// scratch/read_all_messages.js
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, orderBy, query } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Parse .env.local manually
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
    console.log("Cargando chats...");
    const chatsRef = collection(db, 'campaigns', 'main_campaign', 'chats');
    const chatsSnap = await getDocs(chatsRef);
    console.log(`Se encontraron ${chatsSnap.size} chats.`);
    
    let allHistory = "";
    
    for (const chatDoc of chatsSnap.docs) {
        const chatId = chatDoc.id;
        const chatData = chatDoc.data();
        allHistory += `========================================\n`;
        allHistory += `CHAT ID: ${chatId} | Contact Name: ${chatData.contactName || 'N/A'} | Status: ${chatData.status || 'N/A'}\n`;
        allHistory += `========================================\n`;
        
        const messagesRef = collection(db, 'campaigns', 'main_campaign', 'chats', chatId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));
        const messagesSnap = await getDocs(q);
        
        messagesSnap.docs.forEach(mDoc => {
            const m = mDoc.data();
            const timeStr = m.timestamp?.toDate ? m.timestamp.toDate().toLocaleString() : 'N/A';
            const dir = m.direction === 'inbound' ? 'CITADINO' : 'BOT';
            allHistory += `[${timeStr}] ${dir}: ${m.body || '[Mensaje sin texto o multimedia]'}\n`;
        });
        allHistory += `\n\n`;
    }
    
    const outputPath = path.join('scratch', 'all_conversations.txt');
    fs.writeFileSync(outputPath, allHistory, 'utf-8');
    console.log(`Conversaciones exportadas a ${outputPath}`);
}

main().catch(err => console.error(err));
