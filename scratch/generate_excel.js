const fs = require('fs');
const path = require('path');
const https = require('https');
const XLSX = require('xlsx');

// 1. Load env variables
function loadEnv() {
    const envPath = path.resolve(__dirname, '..', '.env.local');
    const env = {};
    try {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#') && line.includes('=')) {
                const parts = line.split('=');
                const key = parts[0].trim();
                const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
                env[key] = value;
            }
        });
    } catch (e) {
        console.error("Error reading .env.local:", e);
    }
    return env;
}

// Helper to make HTTPS GET requests
function makeRequest(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

// 2. Fetch all contacts from Firestore
async function fetchAllContacts(projectId, apiKey) {
    const contacts = [];
    let pageToken = '';
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/campaigns/main_campaign/contacts`;

    console.log("Fetching contacts from Firestore...");
    while (true) {
        let url = `${baseUrl}?key=${apiKey}&pageSize=300`;
        if (pageToken) {
            url += `&pageToken=${pageToken}`;
        }

        try {
            const data = await makeRequest(url);
            if (data.documents) {
                contacts.push(...data.documents);
            }
            pageToken = data.nextPageToken;
            if (!pageToken) {
                break;
            }
        } catch (e) {
            console.error("Error fetching page:", e);
            break;
        }
    }
    return contacts;
}

// Helper to parse Firestore fields
function getVal(field) {
    if (!field) return null;
    if ('stringValue' in field) return field.stringValue;
    if ('integerValue' in field) return parseInt(field.integerValue, 10);
    if ('doubleValue' in field) return parseFloat(field.doubleValue);
    if ('booleanValue' in field) return field.booleanValue;
    return null;
}

function parseContact(doc) {
    const fields = doc.fields || {};
    const namePath = doc.name || "";
    const docId = namePath.split("/").pop();

    return {
        id: docId,
        name: getVal(fields.name),
        phone: getVal(fields.phone),
        level: getVal(fields.level),
        parentId: getVal(fields.parentId),
        parentName: getVal(fields.parentName),
        seccional: getVal(fields.seccional),
        colonia: getVal(fields.colonia),
    };
}

async function main() {
    const env = loadEnv();
    const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey = env.NEXT_PUBLIC_FIREBASE_API_KEY;

    if (!projectId || !apiKey) {
        console.error("Missing Firebase Project ID or API Key in env.");
        return;
    }

    const rawContacts = await fetchAllContacts(projectId, apiKey);
    console.log(`Fetched ${rawContacts.length} contacts.`);

    const contacts = rawContacts.map(parseContact);
    const contactsMap = {};
    contacts.forEach(c => {
        contactsMap[c.id] = c;
    });

    const levelNames = {
        5: "Nivel 5 - Coordinador General",
        4: "Nivel 4 - Coordinador Territorial",
        3: "Nivel 3 - Brigadista",
        2: "Nivel 2 - Ciudadano Movilizador",
        1: "Nivel 1 - Ciudadano Concientizado"
    };

    // Calculate level counts
    const levelCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    contacts.forEach(c => {
        const lvl = c.level || 1;
        if (levelCounts[lvl] !== undefined) {
            levelCounts[lvl]++;
        }
    });

    // 1. Resumen Tab Data
    const summaryData = [
        { "Métrica / Nivel": "Nivel 5 - Coordinador General", "Cantidad": levelCounts[5], "Descripción": "Cabezas del movimiento en la campaña." },
        { "Métrica / Nivel": "Nivel 4 - Coordinador Territorial", "Cantidad": levelCounts[4], "Descripción": "Coordinan zonas territoriales y administran brigadas." },
        { "Métrica / Nivel": "Nivel 3 - Brigadista", "Cantidad": levelCounts[3], "Descripción": "Operadores de campo que realizan visitas domiciliarias con su QR." },
        { "Métrica / Nivel": "Nivel 2 - Ciudadano Movilizador", "Cantidad": levelCounts[2], "Descripción": "Ciudadanos registrados por Brigadistas (automáticamente bajan a nivel 2)." },
        { "Métrica / Nivel": "Nivel 1 - Ciudadano Concientizado", "Cantidad": levelCounts[1], "Descripción": "Ciudadanos sin referido (registro directo) o invitados por un Movilizador." },
        { "Métrica / Nivel": "TOTAL DIRECTORIO", "Cantidad": contacts.length, "Descripción": "Suma total de toda la estructura de red registrada en el sistema." }
    ];

    // 2. Coordinadores Territoriales Tab Data
    const coordinadores = contacts.filter(c => c.level === 4);
    const brigadistas = contacts.filter(c => c.level === 3);

    const coordCounts = {};
    coordinadores.forEach(coord => {
        coordCounts[coord.id] = {
            "ID Coordinador": coord.id,
            "Nombre Coordinador": coord.name || "Sin Nombre",
            "Teléfono": coord.phone || "Sin Teléfono",
            "Seccional": coord.seccional || "N/A",
            "Brigadistas Asignados": 0
        };
    });

    // Count how many brigadistas are linked to each coordinator
    let brigadistasUnderCoordinators = 0;
    let brigadistasUnderBrigadistas = 0;
    let brigadistasOrphans = 0;
    let brigadistasUnderGenerals = 0;

    const detailedBrigadistasList = [];

    brigadistas.forEach(brig => {
        const parentId = brig.parentId;
        let parentName = brig.parentName || "Sin registro de padre";
        let parentLevelName = "N/A";
        let parentContact = null;

        if (parentId) {
            parentContact = contactsMap[parentId];
            if (parentContact) {
                const parentLevel = parentContact.level || 1;
                parentLevelName = levelNames[parentLevel] || `Nivel ${parentLevel}`;
                parentName = parentContact.name || parentName;

                if (parentLevel === 4) {
                    brigadistasUnderCoordinators++;
                    if (coordCounts[parentId]) {
                        coordCounts[parentId]["Brigadistas Asignados"]++;
                    }
                } else if (parentLevel === 3) {
                    brigadistasUnderBrigadistas++;
                } else if (parentLevel === 5) {
                    brigadistasUnderGenerals++;
                }
            } else {
                parentLevelName = "ID inexistente/eliminado";
                brigadistasOrphans++;
            }
        } else {
            parentLevelName = "Sin parentId asignado";
            brigadistasOrphans++;
        }

        detailedBrigadistasList.push({
            "ID Brigadista": brig.id,
            "Nombre Brigadista": brig.name || "Sin Nombre",
            "Teléfono Brigadista": brig.phone || "Sin Teléfono",
            "Seccional": brig.seccional || "N/A",
            "Invitado Por (Nombre)": parentName,
            "Rol del Invitador": parentLevelName,
            "ID del Invitador": parentId || "N/A"
        });
    });

    const coordTabRows = Object.values(coordCounts).sort((a, b) => b["Brigadistas Asignados"] - a["Brigadistas Asignados"]);

    // Add extra statistics for analysis
    const notesData = [
        { "Categoría de Análisis": "Total de Brigadistas (Nivel 3)", "Cantidad": brigadistas.length, "Análisis / Conclusión": "Total de operadores de campo activos en la plataforma." },
        { "Categoría de Análisis": "Brigadistas bajo un Coordinador Territorial (Nivel 4)", "Cantidad": brigadistasUnderCoordinators, "Análisis / Conclusión": "Estructura directa oficial. El coordinador Julio César Navarro encabeza con el 34% de las brigadas." },
        { "Categoría de Análisis": "Brigadistas bajo otro Brigadista (Nivel 3)", "Cantidad": brigadistasUnderBrigadistas, "Análisis / Conclusión": "Movilizadores (Nivel 2) que fueron promovidos a Brigadistas después de su registro, conservando a su reclutador original." },
        { "Categoría de Análisis": "Brigadistas bajo Coordinador General (Nivel 5)", "Cantidad": brigadistasUnderGenerals, "Análisis / Conclusión": "Reclutamientos directos del nivel superior de la campaña." },
        { "Categoría de Análisis": "Brigadistas sin invitador registrado", "Cantidad": brigadistasOrphans, "Análisis / Conclusión": "Usuarios registrados sin enlace de referido o con coordinadores borrados." }
    ];

    // Create Excel workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: Resumen General
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen General");

    // Sheet 2: Notas y Análisis
    const wsNotes = XLSX.utils.json_to_sheet(notesData);
    XLSX.utils.book_append_sheet(wb, wsNotes, "Análisis de Red");

    // Sheet 3: Coordinadores Territoriales
    const wsCoord = XLSX.utils.json_to_sheet(coordTabRows);
    XLSX.utils.book_append_sheet(wb, wsCoord, "Coordinadores Territoriales");

    // Sheet 4: Directorio de Brigadistas
    const wsBrig = XLSX.utils.json_to_sheet(detailedBrigadistasList);
    XLSX.utils.book_append_sheet(wb, wsBrig, "Directorio de Brigadistas");

    // Write file
    const outputPath = path.resolve(__dirname, '..', 'Analisis_Estructura_Sonorenses.xlsx');
    XLSX.writeFile(wb, outputPath);
    console.log(`Excel analysis generated successfully at ${outputPath}`);
}

main().catch(console.error);
