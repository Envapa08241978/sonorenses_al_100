import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

const COLLECTION_PATH = 'campaigns/main_campaign/contacts';

export async function GET(req: NextRequest) {
    try {
        const colRef = adminDb.collection(COLLECTION_PATH);
        const snapshot = await colRef.get();

        const contacts = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || '',
                phone: data.phone || '',
                municipio: data.municipio || '',
                seccional: data.seccional || '',
                colonia: data.colonia || '',
                level: data.level || 1,
                parentId: data.parentId || '',
                parentName: data.parentName || '',
                eventName: data.eventName || '',
                eventNames: Array.isArray(data.eventNames) ? data.eventNames : [],
                roles: Array.isArray(data.roles) ? data.roles : [],
                consent: data.consent || '',
                lastBroadcastTemplate: data.lastBroadcastTemplate || '',
                lastBroadcastAt: data.lastBroadcastAt?._seconds 
                    ? { seconds: data.lastBroadcastAt._seconds } 
                    : data.lastBroadcastAt || null,
            };
        });

        return NextResponse.json({
            success: true,
            totalContacts: contacts.length,
            contacts
        });
    } catch (error: any) {
        console.error('Error fetching broadcast contacts:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
