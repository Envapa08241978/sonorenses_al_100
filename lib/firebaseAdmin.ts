import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';


function getAdminApp(): App {
    if (getApps().length > 0) {
        return getApps()[0];
    }

    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
        try {
            const serviceAccount = JSON.parse(serviceAccountKey);
            return initializeApp({
                credential: cert(serviceAccount),
            });
        } catch (e) {
            console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', e);
        }
    }

    // Fallback: initialize with project ID if available
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'sonorensesal100com';
    return initializeApp({ projectId });
}

export function getAdminDb(): Firestore {
    const app = getAdminApp();
    return getFirestore(app);
}

export const adminDb = new Proxy({} as Firestore, {
    get(_target, prop) {
        const db = getAdminDb();
        const value = (db as any)[prop];
        return typeof value === 'function' ? value.bind(db) : value;
    }
});

