import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

const COLLECTION_PATH = 'campaigns/main_campaign/contacts';

const LEVEL_ROLES: Record<number, string> = {
    1: 'Ciudadano Concientizado',
    2: 'Ciudadano Movilizador',
    3: 'Brigadista',
    4: 'Coordinador Territorial',
    5: 'Coordinador General',
};

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const format = searchParams.get('format') || 'json';

        // Apply same filters as contactsApi
        const levels = searchParams.get('levels') || '';
        const seccionales = searchParams.get('seccionales') || '';
        const colonias = searchParams.get('colonias') || '';
        const consent = searchParams.get('consent') || '';
        const search = searchParams.get('search')?.toLowerCase() || '';
        const events = searchParams.get('events') || '';
        const pyramidType = searchParams.get('pyramidType') || 'all';
        const onlyOrphans = searchParams.get('onlyOrphans') === 'true';

        const parsedLevels = levels ? levels.split(',').map(Number).filter(n => !isNaN(n)) : [];
        const parsedSeccionales = seccionales ? seccionales.split(',') : [];
        const parsedColonias = colonias ? colonias.split(',') : [];
        const parsedEvents = events ? events.split(',') : [];

        // Fetch ALL contacts (for export we need the full dataset)
        // Use batched reads with cursor pagination to handle 450K+
        const colRef = adminDb.collection(COLLECTION_PATH);
        let allContacts: any[] = [];
        let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
        const BATCH_SIZE = 10000;

        while (true) {
            let q: FirebaseFirestore.Query = colRef.orderBy('timestamp', 'desc');
            
            // Apply server-side filter (most selective one)
            if (parsedLevels.length > 0 && parsedLevels.length <= 30) {
                q = colRef.where('level', 'in', parsedLevels).orderBy('timestamp', 'desc');
            }

            if (lastDoc) {
                q = q.startAfter(lastDoc);
            }
            q = q.limit(BATCH_SIZE);

            const batch = await q.get();
            if (batch.empty) break;

            const docs = batch.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            allContacts.push(...docs);
            lastDoc = batch.docs[batch.docs.length - 1];

            if (batch.size < BATCH_SIZE) break;
        }

        // Post-filter
        if (search) {
            allContacts = allContacts.filter((c: any) =>
                c.name?.toLowerCase().includes(search) || c.phone?.includes(search)
            );
        }
        if (parsedSeccionales.length > 0) {
            allContacts = allContacts.filter((c: any) => parsedSeccionales.includes(c.seccional || ''));
        }
        if (parsedColonias.length > 0) {
            allContacts = allContacts.filter((c: any) => parsedColonias.includes(c.colonia || ''));
        }
        if (consent) {
            allContacts = allContacts.filter((c: any) => c.consent === consent);
        }
        if (onlyOrphans) {
            allContacts = allContacts.filter((c: any) => !c.parentId);
        }
        if (pyramidType !== 'all') {
            allContacts = allContacts.filter((c: any) => c.pyramidType === pyramidType);
        }
        if (parsedEvents.length > 0) {
            allContacts = allContacts.filter((c: any) => {
                const contactEvents = [...(c.eventNames || []), c.eventName].filter(Boolean);
                return parsedEvents.some((fe: string) => contactEvents.includes(fe));
            });
        }

        // Build contacts map for hierarchy lookup
        const contactsMap = new Map(allContacts.map((c: any) => [c.id, c]));

        // Build rows for export
        const rows = allContacts.map((c: any) => {
            let fecha = '---';
            if (c.timestamp) {
                const seconds = c.timestamp._seconds || c.timestamp.seconds;
                if (seconds) {
                    const dt = new Date(seconds * 1000);
                    if (!isNaN(dt.getTime())) {
                        fecha = dt.toLocaleString('es-MX');
                    }
                }
            }

            // Build hierarchy chain (levels 1-5)
            const levelsPath: Record<number, string> = { 1: '---', 2: '---', 3: '---', 4: '---', 5: '---' };
            if (c.level && c.level >= 1 && c.level <= 5) {
                levelsPath[c.level] = c.name;
            }
            let current = c;
            let depth = 0;
            while (current.parentId && depth < 20) {
                const parent = contactsMap.get(current.parentId);
                if (!parent) break;
                if (parent.level && parent.level >= 1 && parent.level <= 5) {
                    levelsPath[parent.level] = parent.name;
                }
                current = parent;
                depth++;
            }

            return {
                'ID': c.id,
                'Nombre': c.name,
                'WhatsApp': c.phone,
                'Calle': c.calle || '',
                'Num Ext': c.numExt || '',
                'Num Int': c.numInt || '',
                'Colonia': c.colonia || '',
                'Código Postal': c.cp || '',
                'Municipio': c.municipio || '',
                'Seccional': c.seccional || '',
                'Distrito': c.distrito || '',
                'Invitado Por': c.invitedBy || '',
                'Consentimiento': c.consent || 'no_definido',
                'Origen': c.source || '',
                'Fecha Registro': fecha,
                'Rol': LEVEL_ROLES[c.level || 1] || `Nivel ${c.level || 1}`,
                [`Nivel 5: ${LEVEL_ROLES[5]}`]: levelsPath[5],
                [`Nivel 4: ${LEVEL_ROLES[4]}`]: levelsPath[4],
                [`Nivel 3: ${LEVEL_ROLES[3]}`]: levelsPath[3],
                [`Nivel 2: ${LEVEL_ROLES[2]}`]: levelsPath[2],
                [`Nivel 1: ${LEVEL_ROLES[1]}`]: levelsPath[1],
            };
        });

        if (format === 'json') {
            return NextResponse.json({ rows, totalExported: rows.length });
        }

        // Return as CSV for direct download
        if (rows.length === 0) {
            return new NextResponse('No hay contactos para exportar', { status: 200 });
        }

        const headers = Object.keys(rows[0]);
        const csvLines = [
            headers.join(','),
            ...rows.map(row =>
                headers.map(h => {
                    const val = String((row as any)[h] || '').replace(/"/g, '""');
                    return `"${val}"`;
                }).join(',')
            ),
        ];
        const csvContent = csvLines.join('\n');

        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="directorio-${new Date().toISOString().slice(0, 10)}.csv"`,
            },
        });
    } catch (error: any) {
        console.error('Error in exportContacts:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
