import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

const COLLECTION_PATH = 'campaigns/main_campaign/contacts';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') || '50')));
        const search = searchParams.get('search')?.toLowerCase() || '';
        const levels = searchParams.get('levels') || ''; // comma-separated: "1,3,5"
        const seccionales = searchParams.get('seccionales') || '';
        const colonias = searchParams.get('colonias') || '';
        const consent = searchParams.get('consent') || '';
        const onlyOrphans = searchParams.get('onlyOrphans') === 'true';
        const pyramidType = searchParams.get('pyramidType') || 'all';
        const events = searchParams.get('events') || '';
        const municipios = searchParams.get('municipios') || '';
        const coordinators = searchParams.get('coordinators') || '';
        const sortField = searchParams.get('sortField') || 'timestamp';
        const sortDir = (searchParams.get('sortDir') || 'desc') as 'asc' | 'desc';

        // --- Build a Firestore query with server-side filters ---
        const colRef = adminDb.collection(COLLECTION_PATH);
        let q: FirebaseFirestore.Query = colRef;

        const parsedLevels = levels ? levels.split(',').map(Number).filter(n => !isNaN(n)) : [];
        const parsedSeccionales = seccionales ? seccionales.split(',') : [];
        const parsedColonias = colonias ? colonias.split(',') : [];
        const parsedEvents = events ? events.split(',') : [];
        const parsedMunicipios = municipios ? municipios.split(',') : [];
        const parsedCoordinators = coordinators ? coordinators.split(',') : [];

        // Use 'in' for levels (max 30 values) if specified
        if (parsedLevels.length > 0 && parsedLevels.length <= 30) {
            q = q.where('level', 'in', parsedLevels);
        }

        // Use 'in' for seccionales if specified and levels not already used
        if (parsedSeccionales.length > 0 && parsedSeccionales.length <= 30 && parsedLevels.length === 0) {
            q = q.where('seccional', 'in', parsedSeccionales);
        }

        if (consent && parsedLevels.length === 0 && parsedSeccionales.length === 0) {
            q = q.where('consent', '==', consent);
        }

        if (onlyOrphans) {
            q = q.where('parentId', '==', '');
        }

        if (pyramidType !== 'all') {
            q = q.where('pyramidType', '==', pyramidType);
        }

        // Order by timestamp desc for consistent pagination
        q = q.orderBy(sortField, sortDir);

        const offset = (page - 1) * pageSize;

        const needsClientPagination = Boolean(
            search || 
            parsedColonias.length > 0 || 
            parsedEvents.length > 0 || 
            parsedMunicipios.length > 0 || 
            parsedCoordinators.length > 0 ||
            (parsedSeccionales.length > 0 && parsedLevels.length > 0)
        );

        let snapshot: FirebaseFirestore.QuerySnapshot;
        
        if (needsClientPagination) {
            snapshot = await q.get();
        } else {
            snapshot = await q.offset(offset).limit(pageSize + 1).get();
        }

        let contacts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as any[];

        // --- Post-filter in memory for fields Firestore can't combine ---
        if (search) {
            contacts = contacts.filter(c =>
                c.name?.toLowerCase().includes(search) ||
                c.phone?.includes(search)
            );
        }

        if (parsedSeccionales.length > 0 && parsedLevels.length > 0) {
            contacts = contacts.filter(c => parsedSeccionales.includes(c.seccional || ''));
        }

        if (parsedColonias.length > 0) {
            contacts = contacts.filter(c => parsedColonias.includes(c.colonia || ''));
        }

        if (parsedMunicipios.length > 0) {
            contacts = contacts.filter(c => parsedMunicipios.includes(c.municipio || ''));
        }

        if (parsedEvents.length > 0) {
            contacts = contacts.filter(c => {
                const contactEvents = [...(c.eventNames || []), c.eventName].filter(Boolean);
                return parsedEvents.some((fe: string) => contactEvents.includes(fe));
            });
        }

        if (parsedCoordinators.length > 0) {
            // Build parent lookup map to match hierarchy tree for Coordinador Territorial Nivel 4
            const contactsMap = new Map<string, any>();
            contacts.forEach(c => contactsMap.set(c.id, c));

            contacts = contacts.filter(c => {
                if (parsedCoordinators.includes(c.id)) return true;
                let curr = c;
                let depth = 0;
                while (curr.parentId && depth < 10) {
                    if (parsedCoordinators.includes(curr.parentId)) return true;
                    const parent = contactsMap.get(curr.parentId);
                    if (!parent) break;
                    curr = parent;
                    depth++;
                }
                return false;
            });
        }

        if (consent && (parsedLevels.length > 0 || parsedSeccionales.length > 0)) {
            contacts = contacts.filter(c => c.consent === consent);
        }

        // --- Paginate the post-filtered results ---
        let totalFiltered = contacts.length;
        let paginatedContacts: any[];
        let hasMore: boolean;

        if (needsClientPagination) {
            paginatedContacts = contacts.slice(offset, offset + pageSize);
            hasMore = offset + pageSize < totalFiltered;
        } else {
            hasMore = contacts.length > pageSize;
            paginatedContacts = contacts.slice(0, pageSize);
            totalFiltered = -1; // Unknown total without full scan
        }

        // Clean up Firestore timestamps for JSON serialization
        paginatedContacts = paginatedContacts.map(c => ({
            ...c,
            timestamp: c.timestamp?._seconds 
                ? { seconds: c.timestamp._seconds, nanoseconds: c.timestamp._nanoseconds }
                : c.timestamp,
            lastBroadcastAt: c.lastBroadcastAt?._seconds
                ? { seconds: c.lastBroadcastAt._seconds, nanoseconds: c.lastBroadcastAt._nanoseconds }
                : c.lastBroadcastAt,
            lastBroadcastAttemptAt: c.lastBroadcastAttemptAt?._seconds
                ? { seconds: c.lastBroadcastAttemptAt._seconds, nanoseconds: c.lastBroadcastAttemptAt._nanoseconds }
                : c.lastBroadcastAttemptAt,
        }));

        return NextResponse.json({
            contacts: paginatedContacts,
            page,
            pageSize,
            hasMore,
            totalFiltered: totalFiltered >= 0 ? totalFiltered : undefined,
        });
    } catch (error: any) {
        console.error('Error in contactsApi:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
