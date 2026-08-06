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
        const municipios = searchParams.get('municipios') || '';
        const coordinators = searchParams.get('coordinators') || '';
        const consent = searchParams.get('consent') || '';
        const search = searchParams.get('search')?.toLowerCase() || '';
        const events = searchParams.get('events') || '';
        const pyramidType = searchParams.get('pyramidType') || 'all';
        const onlyOrphans = searchParams.get('onlyOrphans') === 'true';

        const parsedLevels = levels ? levels.split(',').map(Number).filter(n => !isNaN(n)) : [];
        const parsedSeccionales = seccionales ? seccionales.split(',') : [];
        const parsedColonias = colonias ? colonias.split(',') : [];
        const parsedMunicipios = municipios ? municipios.split(',') : [];
        const parsedCoordinators = coordinators ? coordinators.split(',') : [];
        const parsedEvents = events ? events.split(',') : [];

        // Fetch ALL contacts to build complete hierarchy map (do not limit Firestore query by level)
        const colRef = adminDb.collection(COLLECTION_PATH);
        let rawContacts: any[] = [];
        let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
        const BATCH_SIZE = 10000;

        while (true) {
            let q: FirebaseFirestore.Query = colRef.orderBy('timestamp', 'desc');

            if (lastDoc) {
                q = q.startAfter(lastDoc);
            }
            q = q.limit(BATCH_SIZE);

            const batch = await q.get();
            if (batch.empty) break;

            const docs = batch.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            rawContacts.push(...docs);
            lastDoc = batch.docs[batch.docs.length - 1];

            if (batch.size < BATCH_SIZE) break;
        }

        // Build FULL contacts map BEFORE applying filters so hierarchy lookup works for any parent across the tree
        const fullContactsMap = new Map(rawContacts.map((c: any) => [c.id, c]));

        // Post-filter to get rows to export
        let filteredContacts = [...rawContacts];

        if (parsedLevels.length > 0) {
            filteredContacts = filteredContacts.filter((c: any) => parsedLevels.includes(Number(c.level || 1)));
        }
        if (search) {
            filteredContacts = filteredContacts.filter((c: any) =>
                c.name?.toLowerCase().includes(search) || c.phone?.includes(search)
            );
        }
        if (parsedSeccionales.length > 0) {
            filteredContacts = filteredContacts.filter((c: any) => parsedSeccionales.includes(c.seccional || ''));
        }
        if (parsedColonias.length > 0) {
            filteredContacts = filteredContacts.filter((c: any) => parsedColonias.includes(c.colonia || ''));
        }
        if (parsedMunicipios.length > 0) {
            filteredContacts = filteredContacts.filter((c: any) => parsedMunicipios.includes(c.municipio || ''));
        }
        if (parsedCoordinators.length > 0) {
            filteredContacts = filteredContacts.filter((c: any) => {
                if (parsedCoordinators.includes(c.id)) return true;
                let curr = c;
                let depth = 0;
                while (curr.parentId && depth < 20) {
                    if (parsedCoordinators.includes(curr.parentId)) return true;
                    const parent = fullContactsMap.get(curr.parentId);
                    if (!parent) break;
                    curr = parent;
                    depth++;
                }
                return false;
            });
        }
        if (consent) {
            filteredContacts = filteredContacts.filter((c: any) => c.consent === consent);
        }
        if (onlyOrphans) {
            filteredContacts = filteredContacts.filter((c: any) => !c.parentId);
        }
        if (pyramidType !== 'all') {
            filteredContacts = filteredContacts.filter((c: any) => c.pyramidType === pyramidType);
        }
        if (parsedEvents.length > 0) {
            filteredContacts = filteredContacts.filter((c: any) => {
                const contactEvents = [...(c.eventNames || []), c.eventName].filter(Boolean);
                return parsedEvents.some((fe: string) => contactEvents.includes(fe));
            });
        }

        // Build rows for export
        const rows = filteredContacts.map((c: any) => {
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
            const contactLevel = Number(c.level || 1);
            if (contactLevel >= 1 && contactLevel <= 5) {
                levelsPath[contactLevel] = c.name;
            }

            let current = c;
            let depth = 0;
            while (current.parentId && depth < 20) {
                const parent = fullContactsMap.get(current.parentId);
                if (!parent) {
                    if (current.parentName && levelsPath[5] === '---') {
                        if (current.parentName.toLowerCase().includes('marcos') && current.parentName.toLowerCase().includes('flores')) {
                            levelsPath[5] = current.parentName;
                        }
                    }
                    break;
                }
                const parentLevel = Number(parent.level || 1);
                if (parentLevel >= 1 && parentLevel <= 5) {
                    levelsPath[parentLevel] = parent.name;
                }
                current = parent;
                depth++;
            }

            if (levelsPath[5] === '---' && c.parentName && c.parentName.toLowerCase().includes('marcos') && c.parentName.toLowerCase().includes('flores')) {
                levelsPath[5] = c.parentName;
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
                'Invitado Por': c.parentName || c.invitedBy || '',
                'Consentimiento': c.consent || 'no_definido',
                'Origen': c.source || '',
                'Fecha Registro': fecha,
                'Rol': LEVEL_ROLES[contactLevel] || `Nivel ${contactLevel}`,
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
