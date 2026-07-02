import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get('id');

    if (!mediaId) {
        return new NextResponse(JSON.stringify({ error: 'Missing media id' }), { status: 400 });
    }

    const token = process.env.WHATSAPP_TOKEN;
    if (!token) {
        return new NextResponse(JSON.stringify({ error: 'Missing token' }), { status: 500 });
    }

    try {
        // Step 1: Get the download URL from Meta
        const metaRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!metaRes.ok) {
            const err = await metaRes.json();
            return new NextResponse(JSON.stringify({ error: err }), { status: metaRes.status });
        }

        const metaData = await metaRes.json();
        const downloadUrl = metaData.url;

        if (!downloadUrl) {
            return new NextResponse(JSON.stringify({ error: 'No download URL returned' }), { status: 404 });
        }

        // Step 2: Download the actual media file
        const fileRes = await fetch(downloadUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!fileRes.ok) {
            return new NextResponse(JSON.stringify({ error: 'Failed to download media' }), { status: fileRes.status });
        }

        const contentType = fileRes.headers.get('content-type') || 'application/octet-stream';
        const fileBuffer = await fileRes.arrayBuffer();

        // Step 3: Return the file as a proxied response with proper headers
        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400',
                'Access-Control-Allow-Origin': '*',
            }
        });

    } catch (error: any) {
        console.error('Error proxying media:', error);
        return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
