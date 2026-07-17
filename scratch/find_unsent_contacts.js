const fs = require('fs');
const path = require('path');
const https = require('https');
const XLSX = require('xlsx');

// Load environment variables
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

// Fetch all contacts from Firestore
async function fetchAllContacts(projectId, apiKey) {
    const contacts = [];
    let pageToken = '';
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/campaigns/main_campaign/contacts`;

    console.log("Fetching all contacts from Firestore...");
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
        name: getVal(fields.name) || "Sin Nombre",
        phone: getVal(fields.phone) || "",
        level: getVal(fields.level) || 1,
        seccional: getVal(fields.seccional) || "N/A",
        colonia: getVal(fields.colonia) || "N/A",
        parentName: getVal(fields.parentName) || "N/A"
    };
}

async function main() {
    const env = loadEnv();
    const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey = env.NEXT_PUBLIC_FIREBASE_API_KEY;

    if (!projectId || !apiKey) {
        console.error("Missing Firebase credentials.");
        return;
    }

    // 1. Read the successful sent phones from the local JSON log
    const recentOutboundsRaw = fs.readFileSync(path.resolve(__dirname, 'recent_outbounds.json'), 'utf8');
    const recentOutbounds = JSON.parse(recentOutboundsRaw);
    
    const sentPhones = new Set();
    recentOutbounds.forEach(c => {
        c.messages.forEach(m => {
            // Count any template outbound sent on July 16 (UTC)
            if (m.type === 'template' && m.timestamp && m.timestamp.startsWith('2026-07-16')) {
                // Normalize phone to 10 digits
                let clean = c.phone.replace(/\D/g, '');
                if (clean.length === 12 && clean.startsWith('52')) {
                    clean = clean.substring(2);
                } else if (clean.length === 13 && clean.startsWith('521')) {
                    clean = clean.substring(3);
                }
                sentPhones.add(clean);
            }
        });
    });

    console.log(`Loaded ${sentPhones.size} unique successfully sent phones from local logs.`);

    // 2. Fetch all contacts from Firestore
    const rawContacts = await fetchAllContacts(projectId, apiKey);
    console.log(`Fetched ${rawContacts.length} contacts from database.`);

    const contacts = rawContacts.map(parseContact);

    // 3. Separate contacts into Sent and Unsent/Failed
    const successfulSendsList = [];
    const unsentList = [];

    contacts.forEach(c => {
        let cleanPhone = c.phone.replace(/\D/g, '');
        if (cleanPhone.length === 12 && cleanPhone.startsWith('52')) {
            cleanPhone = cleanPhone.substring(2);
        } else if (cleanPhone.length === 13 && cleanPhone.startsWith('521')) {
            cleanPhone = cleanPhone.substring(3);
        }

        const details = {
            "ID Contacto": c.id,
            "Nombre": c.name,
            "Teléfono": c.phone,
            "Nivel": c.level,
            "Seccional": c.seccional,
            "Colonia": c.colonia,
            "Reclutador": c.parentName
        };

        if (sentPhones.has(cleanPhone)) {
            successfulSendsList.push(details);
        } else {
            unsentList.push(details);
        }
    });

    console.log(`Analysis complete:`);
    console.log(`- Envíos Exitosos Registrados: ${successfulSendsList.length}`);
    console.log(`- No Enviados / Fallidos: ${unsentList.length}`);

    // 4. Create Excel Workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: Resumen
    const summaryData = [
        { "Métrica": "Total de Contactos en el Directorio", "Cantidad": contacts.length, "Descripción": "Total de registros de ciudadanos." },
        { "Métrica": "Envíos Exitosos (Mensaje Entregado/Aceptado por Meta)", "Cantidad": successfulSendsList.length, "Descripción": "Mensajes que se enviaron y registraron con éxito en Firestore." },
        { "Métrica": "No Enviados / Fallidos (Pendientes para hoy)", "Cantidad": unsentList.length, "Descripción": "Contactos que no recibieron el mensaje (por rebasar límite diario o números no registrados)." }
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen de Envío");

    // Sheet 2: No Enviados
    const wsUnsent = XLSX.utils.json_to_sheet(unsentList);
    XLSX.utils.book_append_sheet(wb, wsUnsent, "Pendientes y Fallidos");

    // Sheet 3: Exitosos
    const wsSent = XLSX.utils.json_to_sheet(successfulSendsList);
    XLSX.utils.book_append_sheet(wb, wsSent, "Enviados Exitosos");

    // Write file
    const outputPath = path.resolve(__dirname, '..', 'Reporte_Envio_Asamblea_Errores.xlsx');
    XLSX.writeFile(wb, outputPath);
    console.log(`Excel report successfully written to ${outputPath}`);
}

main().catch(console.error);
