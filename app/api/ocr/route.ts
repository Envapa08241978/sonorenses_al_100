import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(request: Request) {
    if (!apiKey) {
        return NextResponse.json({ error: 'GEMINI_API_KEY no está configurada en las variables de entorno de Vercel.' }, { status: 500 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No se recibió ninguna imagen' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const base64Data = Buffer.from(bytes).toString('base64');
        const mimeType = (file.type && file.type.startsWith('image/')) ? file.type : 'image/jpeg';

        const prompt = `
Eres un asistente experto en lectura de credenciales de elector mexicanas (INE).
Tu trabajo es extraer la siguiente información de esta credencial:
- name: El nombre completo de la persona (sin apellidos separados, todo en la misma línea como aparece).
- calle: El nombre de la calle.
- numExt: El número exterior. Si hay un número interior, ignóralo o ponlo en numExt si está junto.
- colonia: La colonia o fraccionamiento.
- cp: El código postal (5 dígitos).
- seccional: La "SECCION" electoral (número de 3 o 4 dígitos).
- ciudad: El municipio o ciudad.

Si no encuentras algún dato o la foto está borrosa para ese campo, déjalo vacío ("").
Devuelve ÚNICAMENTE un objeto JSON válido con las llaves mencionadas. Ejemplo:
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

        const candidateModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
        let lastError: any = null;
        let text = '';

        for (const modelName of candidateModels) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent([prompt, imagePart]);
                const response = await result.response;
                text = response.text();
                if (text) break;
            } catch (err: any) {
                console.error(`OCR model ${modelName} failed:`, err?.message || err);
                lastError = err;
            }
        }

        if (!text) {
            throw lastError || new Error('No se pudo obtener respuesta del modelo de IA.');
        }

        text = text.replace(/```json\n/g, '').replace(/```\n/g, '').replace(/```/g, '').trim();

        let parsedData = {};
        try {
            parsedData = JSON.parse(text);
        } catch (jsonErr) {
            console.error('Error parseando JSON de Gemini:', text);
            return NextResponse.json({ error: 'La IA no pudo interpretar la credencial con claridad. Intenta con mejor iluminación.' }, { status: 400 });
        }

        return NextResponse.json(parsedData);
    } catch (error: any) {
        console.error('Error en OCR:', error);
        return NextResponse.json({ error: error?.message || 'Ocurrió un error al procesar la imagen' }, { status: 500 });
    }
}
