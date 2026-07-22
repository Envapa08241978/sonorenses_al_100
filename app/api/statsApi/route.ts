import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

const COLLECTION_PATH = 'campaigns/main_campaign/contacts';

// In-memory cache for stats (30 second TTL)
let cachedStats: any = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000;

export async function GET() {
    try {
        const now = Date.now();
        if (cachedStats && (now - cacheTimestamp) < CACHE_TTL_MS) {
            return NextResponse.json(cachedStats);
        }

        const colRef = adminDb.collection(COLLECTION_PATH);

        // Parallel aggregation queries using Firestore count()
        const [
            totalSnap,
            level1Snap, level2Snap, level3Snap, level4Snap, level5Snap,
            consentYesSnap, consentNoSnap,
        ] = await Promise.all([
            colRef.count().get(),
            colRef.where('level', '==', 1).count().get(),
            colRef.where('level', '==', 2).count().get(),
            colRef.where('level', '==', 3).count().get(),
            colRef.where('level', '==', 4).count().get(),
            colRef.where('level', '==', 5).count().get(),
            colRef.where('consent', '==', 'yes').count().get(),
            colRef.where('consent', '==', 'no').count().get(),
        ]);

        // Get unique seccionales and colonias (lightweight query - just distinct values)
        // For this we need to fetch a limited set of fields. 
        // We'll fetch seccional and colonia fields only from first 10K docs.
        const distinctSnap = await colRef
            .select('seccional', 'colonia', 'municipio', 'eventName', 'eventNames')
            .limit(1000)
            .get();

        const seccionalesSet = new Set<string>();
        const coloniasSet = new Set<string>();
        const municipiosSet = new Set<string>();
        const eventNamesSet = new Set<string>();

        distinctSnap.docs.forEach(doc => {
            const d = doc.data();
            if (d.seccional) seccionalesSet.add(d.seccional);
            if (d.colonia) coloniasSet.add(d.colonia);
            if (d.municipio) municipiosSet.add(d.municipio);
            if (d.eventName) eventNamesSet.add(d.eventName);
            if (d.eventNames && Array.isArray(d.eventNames)) {
                d.eventNames.forEach((e: string) => { if (e) eventNamesSet.add(e); });
            }
        });

        // If there are more than 10K, continue fetching distinct values
        if (distinctSnap.size === 10000) {
            const lastDoc = distinctSnap.docs[distinctSnap.docs.length - 1];
            let cursor = lastDoc;
            let hasMore = true;
            while (hasMore) {
                const nextBatch = await colRef
                    .select('seccional', 'colonia', 'municipio', 'eventName', 'eventNames')
                    .startAfter(cursor)
                    .limit(10000)
                    .get();
                
                nextBatch.docs.forEach(doc => {
                    const d = doc.data();
                    if (d.seccional) seccionalesSet.add(d.seccional);
                    if (d.colonia) coloniasSet.add(d.colonia);
                    if (d.municipio) municipiosSet.add(d.municipio);
                    if (d.eventName) eventNamesSet.add(d.eventName);
                    if (d.eventNames && Array.isArray(d.eventNames)) {
                        d.eventNames.forEach((e: string) => { if (e) eventNamesSet.add(e); });
                    }
                });

                hasMore = nextBatch.size === 10000;
                if (hasMore) cursor = nextBatch.docs[nextBatch.docs.length - 1];
            }
        }

        const total = totalSnap.data().count;
        
        // Level 1 includes contacts without a level field (default)
        const explicitLevels = level1Snap.data().count + level2Snap.data().count + 
                               level3Snap.data().count + level4Snap.data().count + level5Snap.data().count;
        const noLevelCount = total - explicitLevels;

        const stats = {
            totalContacts: total,
            byLevel: {
                1: level1Snap.data().count + noLevelCount,  // Default level
                2: level2Snap.data().count,
                3: level3Snap.data().count,
                4: level4Snap.data().count,
                5: level5Snap.data().count,
            },
            byConsent: {
                yes: consentYesSnap.data().count,
                no: consentNoSnap.data().count,
                pending: total - consentYesSnap.data().count - consentNoSnap.data().count,
            },
            uniqueSeccionales: Array.from(seccionalesSet).sort(),
            uniqueColonias: Array.from(coloniasSet).sort(),
            uniqueMunicipios: Array.from(municipiosSet).sort(),
            uniqueEventNames: Array.from(eventNamesSet).sort(),
            cachedAt: new Date().toISOString(),
        };

        cachedStats = stats;
        cacheTimestamp = now;

        return NextResponse.json(stats);
    } catch (error: any) {
        console.error('Error in statsApi:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
