const fs = require('fs');
const path = require('path');
const https = require('https');

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

async function main() {
    const env = loadEnv();
    const phoneId = env.WHATSAPP_PHONE_NUMBER_ID || env.WHATSAPP_PHONE_ID;
    const token = env.WHATSAPP_TOKEN;

    const url = `https://graph.facebook.com/v19.0/${phoneId}/contacts`;
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    // Test with two numbers: one clearly invalid (e.g. +521234567890) and one of our own
    const body = JSON.stringify({
        blocking: 'wait',
        contacts: [
            "+521234567890", // Invalid format/number
            "+5216622244979", // Valid number (our bot or a known number)
            "+526622244979" // Check without '1'
        ]
    });

    console.log("Sending check request to Meta...");
    const res = await makePostRequest(url, headers, body);
    console.log("Response from Meta:", JSON.stringify(res, null, 2));
}

main().catch(console.error);
