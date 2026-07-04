import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI client
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(request: Request) {
    if (!apiKey) {
        return NextResponse.json({ error: 'GEMINI_API_KEY no está configurada' }, { status: 500 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No se recibió ninguna imagen' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const base64Data = Buffer.from(bytes).toString('base64');
        const mimeType = file.type;

        // Use gemini-1.5-flash as it's fast and supports vision
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `
Eres un asistente experto en lectura de credenciales de elector mexicanas (INE).
Tu trabajo es extraer la siguiente información de esta credencial:
- name: El nombre completo de la persona (sin apellidos separados, todo en la misma línea como aparece).
- calle: El nombre de la calle.
- numExt: El número exterior. Si hay un número interior, ignóralo o ponlo en numExt si está junto.
- colonia: La colonia o fraccionamiento. (A veces aparece debajo de la calle, o cerca del código postal).
- cp: El código postal (5 dígitos).
- seccional: La "SECCION" electoral, que suele ser un número de 4 dígitos.
- ciudad: El municipio, ciudad o localidad.

Si no encuentras algún dato o la foto está borrosa para ese campo, déjalo vacío ("").
Devuelve ÚNICAMENTE un objeto JSON válido con las llaves mencionadas. Nada de explicaciones, ni comillas extra, solo el JSON puro. Ejemplo:
{
  "name": "JUAN PEREZ LOPEZ",
  "calle": "AV LAS AMERICAS",
  "numExt": "123",
  "colonia": "CENTRO",
  "cp": "85000",
  "seccional": "0543",
  "ciudad": "CAJEME"
}
`;

        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType
            }
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        let text = response.text();
        
        // Clean up markdown json blocks if present
        text = text.replace(/```json\n/g, '').replace(/```\n/g, '').replace(/```/g, '');

        let parsedData = {};
        try {
            parsedData = JSON.parse(text);
        } catch (jsonErr) {
            console.error('Error parseando JSON de Gemini:', text);
            return NextResponse.json({ error: 'La IA no pudo interpretar la credencial con claridad. Intenta de nuevo con mejor iluminación.' }, { status: 400 });
        }

        return NextResponse.json(parsedData);
    } catch (error) {
        console.error('Error en OCR:', error);
        return NextResponse.json({ error: 'Ocurrió un error al procesar la imagen' }, { status: 500 });
    }
}
