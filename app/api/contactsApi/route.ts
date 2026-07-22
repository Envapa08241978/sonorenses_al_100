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
        const sortField = searchParams.get('sortField') || 'timestamp';
        const sortDir = (searchParams.get('sortDir') || 'desc') as 'asc' | 'desc';

        // --- Build a Firestore query with server-side filters ---
        const colRef = adminDb.collection(COLLECTION_PATH);
        let q: FirebaseFirestore.Query = colRef;

        // Firestore supports only ONE inequality / array-contains, so we pick the 
        // most selective filter for the server and do the rest in memory.
        const parsedLevels = levels ? levels.split(',').map(Number).filter(n => !isNaN(n)) : [];
        const parsedSeccionales = seccionales ? seccionales.split(',') : [];
        const parsedColonias = colonias ? colonias.split(',') : [];
        const parsedEvents = events ? events.split(',') : [];

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

        // --- Execute: fetch all matching docs then apply client-side filters ---
        // For text search and multi-field filters we must post-filter.
        // We over-fetch to fill the page after filtering.
        // For very large datasets, we use cursor-based pagination.

        // Strategy: use cursor-based pagination with over-fetching
        const fetchLimit = search || 
            (parsedSeccionales.length > 0 && parsedLevels.length > 0) || 
            parsedColonias.length > 0 || 
            parsedEvents.length > 0
            ? pageSize * 10  // Over-fetch when we need to post-filter
            : pageSize + 1;  // Slight over-fetch to detect hasMore

        // For cursor-based pagination, we skip (page-1)*adjustedLimit docs
        // But Firestore doesn't support offset efficiently, so for pages > 1 
        // we need to use startAfter with a cursor.
        // Simple approach: use offset (works up to ~10K, fine for filtered results)
        const offset = (page - 1) * pageSize;

        let snapshot: FirebaseFirestore.QuerySnapshot;
        
        if (search || parsedColonias.length > 0 || 
            (parsedSeccionales.length > 0 && parsedLevels.length > 0) ||
            parsedEvents.length > 0) {
            // Complex filter: fetch more and post-filter
            // Cap at 25000 to allow scanning the entire current DB for text search
            const maxFetch = Math.min(25000, offset + fetchLimit);
            snapshot = await q.limit(maxFetch).get();
        } else {
            // Simple filter: use offset + limit
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
            // Seccional filter wasn't applied server-side because levels used 'in'
            contacts = contacts.filter(c => parsedSeccionales.includes(c.seccional || ''));
        }

        if (parsedColonias.length > 0) {
            contacts = contacts.filter(c => parsedColonias.includes(c.colonia || ''));
        }

        if (parsedEvents.length > 0) {
            contacts = contacts.filter(c => {
                const contactEvents = [...(c.eventNames || []), c.eventName].filter(Boolean);
                return parsedEvents.some((fe: string) => contactEvents.includes(fe));
            });
        }

        if (consent && (parsedLevels.length > 0 || parsedSeccionales.length > 0)) {
            contacts = contacts.filter(c => c.consent === consent);
        }

        // --- Paginate the post-filtered results ---
        const needsClientPagination = search || parsedColonias.length > 0 || 
            (parsedSeccionales.length > 0 && parsedLevels.length > 0) ||
            parsedEvents.length > 0;

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
