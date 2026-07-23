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

        // Get unique seccionales, colonias, municipios, and events (fetch only distinct fields from ALL docs)
        const distinctSnap = await colRef
            .select('seccional', 'colonia', 'municipio', 'eventName', 'eventNames')
            .get();

        const seccionalesSet = new Set<string>();
        const coloniasSet = new Set<string>();
        const municipiosSet = new Set<string>();
        const eventNamesSet = new Set<string>();

        distinctSnap.docs.forEach(doc => {
            const d = doc.data();
            if (d.seccional && d.seccional.trim()) seccionalesSet.add(d.seccional.trim());
            if (d.colonia && d.colonia.trim()) coloniasSet.add(d.colonia.trim());
            if (d.municipio && d.municipio.trim()) municipiosSet.add(d.municipio.trim());
            if (d.eventName && d.eventName.trim()) eventNamesSet.add(d.eventName.trim());
            if (d.eventNames && Array.isArray(d.eventNames)) {
                d.eventNames.forEach((e: string) => { if (e && e.trim()) eventNamesSet.add(e.trim()); });
            }
        });

        const total = totalSnap.data().count;
        
        // Level 1 includes contacts without a level field (default)
        const explicitLevels = level1Snap.data().count + level2Snap.data().count + 
                               level3Snap.data().count + level4Snap.data().count + level5Snap.data().count;
        const noLevelCount = total - explicitLevels;

        // Fetch Level 4 Coordinators for filters
        const level4DocsSnap = await colRef.where('level', '==', 4).select('name', 'seccional').get();
        const level4Coordinators = level4DocsSnap.docs.map(d => ({
            id: d.id,
            name: d.data().name || 'Sin Nombre',
            seccional: d.data().seccional || ''
        })).sort((a, b) => a.name.localeCompare(b.name));

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
            level4Coordinators,
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
