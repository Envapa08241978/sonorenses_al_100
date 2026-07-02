import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';

export async function POST(request: Request) {
    try {
        const { to, message, templateName, mediaId, mediaType, filename, headerImageUrl, templateParams } = await request.json();

        if (!to) {
            return new NextResponse(JSON.stringify({ error: 'Missing "to"' }), { status: 400 });
        }
        if (!message && !templateName && !mediaId) {
            return new NextResponse(JSON.stringify({ error: 'Missing "message", "templateName", or "mediaId"' }), { status: 400 });
        }

        const token = process.env.WHATSAPP_TOKEN;
        const phoneId = process.env.WHATSAPP_PHONE_ID;

        if (!token || !phoneId) {
            return new NextResponse(JSON.stringify({ error: 'WhatsApp API credentials missing' }), { status: 500 });
        }

        let cleanTo = to.replace(/\D/g, '');
        if (cleanTo.length === 10) {
            cleanTo = '52' + cleanTo;
        } else if (cleanTo.length === 11 && cleanTo.startsWith('1')) {
            cleanTo = '52' + cleanTo;
        } else if (cleanTo.length === 13 && cleanTo.startsWith('521')) {
            // Keep the 521 as is
        }

        // Build the payload
        let payload: any = {
            messaging_product: 'whatsapp',
            to: cleanTo
        };

        let lastMessagePreview = '';
        let msgDocType = 'text';

        if (templateName) {
            // Template message
            payload.type = 'template';
            payload.template = {
                name: templateName,
                language: { code: templateName === 'hello_world' ? 'en_US' : 'es_MX' },
                components: []
            };

            if (headerImageUrl) {
                payload.template.components.push({
                    type: 'header',
                    parameters: [
                        { type: 'image', image: { link: headerImageUrl } }
                    ]
                });
            }

            if (templateParams && Array.isArray(templateParams) && templateParams.length > 0) {
                payload.template.components.push({
                    type: 'body',
                    parameters: templateParams.map((p: string) => ({ type: 'text', text: p }))
                });
                lastMessagePreview = `[Plantilla: ${templateName}] Vars: ${templateParams.join(', ')}`;
            } else if (message) {
                payload.template.components.push({
                    type: 'body',
                    parameters: [
                        { type: 'text', text: message }
                    ]
                });
                lastMessagePreview = `[Plantilla: ${templateName}] ${message || ''}`;
            } else {
                lastMessagePreview = `[Plantilla: ${templateName}]`;
            }
            
            if (payload.template.components.length === 0) {
                delete payload.template.components;
            }
            
            msgDocType = 'template';

        } else if (mediaId) {
            // Media message (image, video, audio, document)
            const type = mediaType || 'image';
            payload.type = type;

            const mediaPayload: any = { id: mediaId };
            if (message) mediaPayload.caption = message;
            if (type === 'document' && filename) mediaPayload.filename = filename;

            payload[type] = mediaPayload;

            const icons: Record<string, string> = { image: '📷', video: '🎥', audio: '🎵', document: '📎' };
            lastMessagePreview = `${icons[type] || '📎'} ${message || filename || type}`;
            msgDocType = type;

        } else {
            // Plain text message
            payload.type = 'text';
            payload.text = { body: message };
            lastMessagePreview = message;
            msgDocType = 'text';
        }

        const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            const chatRef = doc(db, 'campaigns', 'main_campaign', 'chats', to);
            
            await setDoc(chatRef, {
                phone: to,
                lastMessage: lastMessagePreview,
                lastMessageAt: serverTimestamp(),
            }, { merge: true });

            const messagesRef = collection(chatRef, 'messages');
            const messageDoc: any = {
                body: message || '',
                to: to,
                type: msgDocType,
                direction: 'outbound',
                timestamp: serverTimestamp()
            };

            if (mediaId) {
                messageDoc.mediaId = mediaId;
                messageDoc.mimeType = mediaType || 'image';
                if (filename) messageDoc.filename = filename;
                if (message) messageDoc.caption = message;
            }

            await addDoc(messagesRef, messageDoc);

            return new NextResponse(JSON.stringify({ success: true, data }), { status: 200 });
        } else {
            console.error('Meta API Error:', data);
            return new NextResponse(JSON.stringify({ error: data }), { status: response.status });
        }

    } catch (error: any) {
        console.error('Error sending message:', error);
        return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
