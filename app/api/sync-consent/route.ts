import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';

// Initialize Firebase client SDK for server-side
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function GET() {
    try {
        // 1. Get ALL chat documents
        const chatsRef = collection(db, 'chats');
        const chatsSnap = await getDocs(chatsRef);
        
        let synced = 0;
        let alreadyOk = 0;
        let noContact = 0;
        let chatWithConsent = 0;
        let chatTotal = chatsSnap.size;
        const syncedDetails: any[] = [];

        for (const chatDoc of chatsSnap.docs) {
            const chatData = chatDoc.data();
            
            // Only process chats that have consent set
            if (!chatData.consent) continue;
            chatWithConsent++;
            
            // Extract phone from chat doc ID (last 10 digits)
            const chatPhone = chatDoc.id.replace(/\D/g, '').slice(-10);
            if (!chatPhone || chatPhone.length < 10) continue;
            
            // Find the matching contact by phone
            const contactsRef = collection(db, 'campaigns', 'main_campaign', 'contacts');
            const qContact = query(contactsRef, where('phone', '==', chatPhone));
            const contactSnap = await getDocs(qContact);
            
            if (contactSnap.empty) {
                noContact++;
                syncedDetails.push({ 
                    phone: chatPhone, 
                    chatConsent: chatData.consent, 
                    status: '❌ NO_CONTACT_FOUND' 
                });
                continue;
            }
            
            const contactDocSnap = contactSnap.docs[0];
            const contactData = contactDocSnap.data();
            
            // Check if already in sync
            if (contactData.consent === chatData.consent) {
                alreadyOk++;
                continue;
            }
            
            // SYNC: Update the contact document with the chat's consent value
            await updateDoc(doc(db, 'campaigns', 'main_campaign', 'contacts', contactDocSnap.id), {
                consent: chatData.consent,
                consentTimestamp: chatData.consentTimestamp || new Date(),
            });
            
            synced++;
            syncedDetails.push({
                phone: chatPhone,
                name: contactData.name || 'N/A',
                chatConsent: chatData.consent,
                contactConsentBefore: contactData.consent || '(vacío)',
                contactConsentAfter: chatData.consent,
                status: '✅ SINCRONIZADO'
            });
        }

        return NextResponse.json({
            success: true,
            summary: {
                totalChats: chatTotal,
                chatsWithConsent: chatWithConsent,
                synced: synced,
                alreadyInSync: alreadyOk,
                noContactFound: noContact,
            },
            message: synced > 0 
                ? `✅ Se sincronizaron ${synced} contactos exitosamente.`
                : '✅ Todos los contactos ya estaban sincronizados correctamente.',
            syncedDetails
        });
    } catch (error: any) {
        console.error('Sync error:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}
