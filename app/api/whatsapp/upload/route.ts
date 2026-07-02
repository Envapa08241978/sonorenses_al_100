import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return new NextResponse(JSON.stringify({ error: 'No file provided' }), { status: 400 });
        }

        const token = process.env.WHATSAPP_TOKEN;
        const phoneId = process.env.WHATSAPP_PHONE_ID;

        if (!token || !phoneId) {
            return new NextResponse(JSON.stringify({ error: 'WhatsApp API credentials missing' }), { status: 500 });
        }

        // Upload file to Meta's servers
        const uploadForm = new FormData();
        uploadForm.append('messaging_product', 'whatsapp');
        uploadForm.append('file', file, file.name);
        uploadForm.append('type', file.type);

        const uploadRes = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/media`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: uploadForm,
        });

        const uploadData = await uploadRes.json();

        if (!uploadRes.ok) {
            console.error('Meta upload error:', uploadData);
            return new NextResponse(JSON.stringify({ error: uploadData }), { status: uploadRes.status });
        }

        return new NextResponse(JSON.stringify({ 
            success: true, 
            mediaId: uploadData.id 
        }), { status: 200 });

    } catch (error: any) {
        console.error('Error uploading media:', error);
        return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
