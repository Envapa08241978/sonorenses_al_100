import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const token = process.env.WHATSAPP_TOKEN;
        const phoneId = process.env.WHATSAPP_PHONE_ID;
        
        const to = "5216421600559";
        let cleanTo = to.replace(/\D/g, '');
        if (cleanTo.length === 10) {
            cleanTo = '52' + cleanTo;
        } else if (cleanTo.length === 11 && cleanTo.startsWith('1')) {
            cleanTo = '52' + cleanTo.slice(1);
        } else if (cleanTo.length === 13 && cleanTo.startsWith('521')) {
            cleanTo = '52' + cleanTo.slice(3);
        }

        const payload = {
            messaging_product: 'whatsapp',
            to: cleanTo,
            type: 'text',
            text: { body: "Mensaje de diagnóstico del sistema de votantes" }
        };

        const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        return new NextResponse(JSON.stringify({
            diagnostic: "Prueba de diagnóstico de envío",
            to_original: to,
            to_clean: cleanTo,
            meta_status: response.status,
            meta_ok: response.ok,
            meta_response: data,
            credentials: {
                has_token: !!token,
                token_length: token ? token.length : 0,
                has_phone_id: !!phoneId,
                phone_id: phoneId
            }
        }, null, 4), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
