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

// Helper to make HTTPS POST requests
function makePostRequest(url, headers, body) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'POST',
            headers: {
                ...headers,
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

function makeGetRequest(url) {
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
            const data = await makeGetRequest(url);
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
        seccional: getVal(fields.seccional) || "N/A",
        colonia: getVal(fields.colonia) || "N/A"
    };
}

async function verifyWhatsAppNumbers(phoneId, token, phoneNumbersList) {
    const url = `https://graph.facebook.com/v19.0/${phoneId}/contacts`;
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    // Format contacts array for Meta: e.g. ["+52662xxxxxxx"]
    const contactsPayload = phoneNumbersList.map(phone => {
        let clean = phone.replace(/\D/g, '');
        if (clean.length === 10) {
            clean = '52' + clean;
        } else if (clean.length === 11 && clean.startsWith('1')) {
            clean = '52' + clean;
        }
        return '+' + clean;
    });

    const body = JSON.stringify({
        blocking: 'wait',
        contacts: contactsPayload
    });

    const response = await makePostRequest(url, headers, body);
    return response.contacts || [];
}

async function main() {
    const env = loadEnv();
    const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey = env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const phoneId = env.WHATSAPP_PHONE_NUMBER_ID || env.WHATSAPP_PHONE_ID;
    const token = env.WHATSAPP_TOKEN;

    if (!projectId || !apiKey || !phoneId || !token) {
        console.error("Missing Firebase or WhatsApp credentials.");
        return;
    }

    // 1. Fetch all contacts from Firestore
    const rawContacts = await fetchAllContacts(projectId, apiKey);
    console.log(`Fetched ${rawContacts.length} contacts from database.`);
    const contacts = rawContacts.map(parseContact);

    // 2. Read the successful sent phones from the local JSON log
    const recentOutboundsRaw = fs.readFileSync(path.resolve(__dirname, 'recent_outbounds.json'), 'utf8');
    const recentOutbounds = JSON.parse(recentOutboundsRaw);
    
    const sentPhones = new Set();
    recentOutbounds.forEach(c => {
        c.messages.forEach(m => {
            if (m.type === 'template' && m.timestamp && m.timestamp.startsWith('2026-07-16')) {
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

    // Filter contacts that were NOT successfully sent
    const unsentContacts = contacts.filter(c => {
        let cleanPhone = c.phone.replace(/\D/g, '');
        if (cleanPhone.length === 12 && cleanPhone.startsWith('52')) {
            cleanPhone = cleanPhone.substring(2);
        } else if (cleanPhone.length === 13 && cleanPhone.startsWith('521')) {
            cleanPhone = cleanPhone.substring(3);
        }
        return !sentPhones.has(cleanPhone);
    });

    console.log(`Found ${unsentContacts.length} contacts that didn't receive the message yesterday.`);
    console.log("Starting WhatsApp registration validation via Meta API...");

    // 3. Batch verify using Meta API
    const batchSize = 100;
    const invalidContacts = [];

    for (let i = 0; i < unsentContacts.length; i += batchSize) {
        const batch = unsentContacts.slice(i, i + batchSize);
        const batchPhones = batch.map(c => c.phone);
        
        console.log(`Verifying batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(unsentContacts.length / batchSize)} (size: ${batch.length})...`);
        try {
            const results = await verifyWhatsAppNumbers(phoneId, token, batchPhones);
            
            // Map the results back to the contacts
            results.forEach((res, index) => {
                const contact = batch[index];
                if (res.status === 'invalid') {
                    invalidContacts.push({
                        "ID Contacto": contact.id,
                        "Nombre": contact.name,
                        "Teléfono": contact.phone,
                        "Seccional": contact.seccional,
                        "Colonia": contact.colonia,
                        "Razón de Meta": "Número no registrado en WhatsApp (invalid)"
                    });
                }
            });
        } catch (e) {
            console.error("Error verifying batch:", e);
        }
        
        // Pause briefly to respect rate limits
        await new Promise(r => setTimeout(r, 200));
    }

    console.log(`\nVerification finished:`);
    console.log(`- Total contacts checked: ${unsentContacts.length}`);
    console.log(`- Invalid numbers found (without WhatsApp): ${invalidContacts.length}`);

    // 4. Export to Excel
    const wb = XLSX.utils.book_new();
    
    // Sheet 1: Invalid Contacts
    const wsInvalid = XLSX.utils.json_to_sheet(invalidContacts);
    XLSX.utils.book_append_sheet(wb, wsInvalid, "Contactos sin WhatsApp");
    
    // Write the output file in the workspace root
    const outputPath = path.resolve(__dirname, '..', 'Reporte_Contactos_Sin_WhatsApp.xlsx');
    XLSX.writeFile(wb, outputPath);
    console.log(`Excel list created successfully at ${outputPath}`);
}

main().catch(console.error);
