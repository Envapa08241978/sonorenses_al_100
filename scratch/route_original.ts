import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc, getDoc, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
        console.log('WEBHOOK_VERIFIED');
        return new NextResponse(challenge, { status: 200 });
    }
    return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        if (body.object) {
            if (
                body.entry &&
                body.entry[0].changes &&
                body.entry[0].changes[0] &&
                body.entry[0].changes[0].value.messages &&
                body.entry[0].changes[0].value.messages[0]
            ) {
                const msg = body.entry[0].changes[0].value.messages[0];
                const from = body.entry[0].changes[0].value.messages[0].from;
                const name = body.entry[0].changes[0].value.contacts?.[0]?.profile?.name || 'Usuario';
                const profilePic = body.entry[0].changes[0].value.contacts?.[0]?.profile?.picture || '';
                const msgType = msg.type; // text, image, video, document, audio, sticker, location, interactive

                // Build the message document based on type
                let messageDoc: any = {
                    from: from,
                    direction: 'inbound',
                    timestamp: serverTimestamp(),
                    type: msgType,
                };

                let lastMessagePreview = '';
                let isButtonSelection = false;
                let buttonId = '';

                switch (msgType) {
                    case 'text':
                        messageDoc.body = msg.text?.body || '';
                        lastMessagePreview = messageDoc.body;
                        break;

                    case 'image':
                        messageDoc.mediaId = msg.image?.id || '';
                        messageDoc.mimeType = msg.image?.mime_type || 'image/jpeg';
                        messageDoc.caption = msg.image?.caption || '';
                        messageDoc.body = msg.image?.caption || '';
                        lastMessagePreview = '📷 Imagen' + (msg.image?.caption ? `: ${msg.image.caption}` : '');
                        break;

                    case 'video':
                        messageDoc.mediaId = msg.video?.id || '';
                        messageDoc.mimeType = msg.video?.mime_type || 'video/mp4';
                        messageDoc.caption = msg.video?.caption || '';
                        messageDoc.body = msg.video?.caption || '';
                        lastMessagePreview = '🎥 Video' + (msg.video?.caption ? `: ${msg.video.caption}` : '');
                        break;

                    case 'audio':
                        messageDoc.mediaId = msg.audio?.id || '';
                        messageDoc.mimeType = msg.audio?.mime_type || 'audio/ogg';
                        messageDoc.body = '';
                        lastMessagePreview = '🎵 Audio';
                        break;

                    case 'document':
                        messageDoc.mediaId = msg.document?.id || '';
                        messageDoc.mimeType = msg.document?.mime_type || 'application/pdf';
                        messageDoc.filename = msg.document?.filename || 'documento';
                        messageDoc.caption = msg.document?.caption || '';
                        messageDoc.body = msg.document?.filename || 'documento';
                        lastMessagePreview = '📎 ' + (msg.document?.filename || 'Documento');
                        break;

                    case 'sticker':
                        messageDoc.mediaId = msg.sticker?.id || '';
                        messageDoc.mimeType = msg.sticker?.mime_type || 'image/webp';
                        messageDoc.body = '';
                        lastMessagePreview = '🏷️ Sticker';
                        break;

                    case 'location':
                        messageDoc.latitude = msg.location?.latitude || 0;
                        messageDoc.longitude = msg.location?.longitude || 0;
                        messageDoc.locationName = msg.location?.name || '';
                        messageDoc.locationAddress = msg.location?.address || '';
                        messageDoc.body = msg.location?.name || 'Ubicación compartida';
                        lastMessagePreview = '📍 Ubicación';
                        break;

                    case 'interactive':
                        const intVal = msg.interactive;
                        if (intVal?.type === 'button_reply') {
                            messageDoc.body = intVal.button_reply?.title || '';
                            lastMessagePreview = messageDoc.body;
                            isButtonSelection = true;
                            buttonId = intVal.button_reply?.id || '';
                        } else if (intVal?.type === 'list_reply') {
                            messageDoc.body = intVal.list_reply?.title || '';
                            lastMessagePreview = messageDoc.body;
                        } else {
                            messageDoc.body = '[Interactivo]';
                            lastMessagePreview = '[Interactivo]';
                        }
                        break;

                    default:
                        messageDoc.body = `[${msgType}]`;
                        lastMessagePreview = `[${msgType}]`;
                        break;
                }

                // Skip completely empty messages (shouldn't happen now)
                if (!messageDoc.body && !messageDoc.mediaId && msgType === 'text') {
                    return new NextResponse('EVENT_RECEIVED', { status: 200 });
                }

                const chatRef = doc(db, 'campaigns', 'main_campaign', 'chats', from);

                // Read the existing chat to evaluate states and rate limits
                const chatDoc = await getDoc(chatRef);
                let isRecentlyReplied = false;
                let botState = 'idle';

                if (chatDoc.exists()) {
                    const chatData = chatDoc.data();
                    botState = chatData.botState || 'idle';
                    const lastMsg = chatData.lastMessage || '';
                    const lastMsgAt = chatData.lastMessageAt?.toDate?.() || chatData.lastMessageAt;

                    if (lastMsgAt && lastMsg.includes('🤖 Auto-respuesta')) {
                        const lastMsgTime = lastMsgAt instanceof Date ? lastMsgAt.getTime() : (lastMsgAt.seconds ? lastMsgAt.seconds * 1000 : Date.now());
                        const timeDiffMinutes = (Date.now() - lastMsgTime) / (1000 * 60);
                        if (timeDiffMinutes < 15) {
                            isRecentlyReplied = true;
                        }
                    }
                }

                const chatUpdate: any = {
                    phone: from,
                    name: name,
                    lastMessage: lastMessagePreview,
                    lastMessageAt: serverTimestamp(),
                };

                // Save profile picture URL if available
                if (profilePic) {
                    chatUpdate.profilePic = profilePic;
                }

                await setDoc(chatRef, chatUpdate, { merge: true });

                const messagesRef = collection(chatRef, 'messages');
                await addDoc(messagesRef, messageDoc);

                // Token & credentials
                const token = process.env.WHATSAPP_TOKEN;
                const phoneId = process.env.WHATSAPP_PHONE_ID;

                if (token && phoneId) {
                    let cleanTo = from.replace(/\D/g, '');
                    if (cleanTo.length === 10) {
                        cleanTo = '52' + cleanTo;
                    } else if (cleanTo.length === 11 && cleanTo.startsWith('1')) {
                        cleanTo = '52' + cleanTo.slice(1);
                    } else if (cleanTo.length === 13 && cleanTo.startsWith('521')) {
                        cleanTo = '52' + cleanTo.slice(3);
                    }

                    // 1. AUTO-REPLY TYPE A: Registration Message
                    const isRegistration = msgType === 'text' && messageDoc.body && (
                        messageDoc.body.includes('Me acabo de registrar') ||
                        messageDoc.body.includes('Folio:')
                    );

                    if (isRegistration) {
                        const firstName = name.split(' ')[0] || 'Hola';
                        const replyText = `¡Hola, ${firstName}! 👋\n\nMuchas gracias por registrarte y sumarte a este gran esfuerzo. Tu participación como Enlace es fundamental para seguir construyendo comunidad y fortaleciendo nuestro movimiento. 🏛️✨\n\nTu registro ha sido recibido con éxito.\n\nPara brindarte la mejor atención y asegurar una comunicación fluida, por favor realiza dos sencillas acciones:\n\n1️⃣ **Guarda este número** en tus contactos como **Enlace del Senador Heriberto Aguilar** 📲. Esto te asegurará recibir todas nuestras actualizaciones y evitará que WhatsApp bloquee las notificaciones.\n\n2️⃣ **Autorización de Difusión:** Para compartirte información de interés sobre el movimiento y las actividades del Senador Heriberto Aguilar, ¿nos das tu consentimiento para enviarte mensajes informativos y de difusión? ✅`;

                        const payload = {
                            messaging_product: 'whatsapp',
                            to: cleanTo,
                            type: 'interactive',
                            interactive: {
                                type: 'button',
                                body: { text: replyText },
                                action: {
                                    buttons: [
                                        {
                                            type: 'reply',
                                            reply: { id: 'consent_yes', title: 'Sí, acepto ✅' }
                                        },
                                        {
                                            type: 'reply',
                                            reply: { id: 'consent_no', title: 'No, gracias' }
                                        }
                                    ]
                                }
                            }
                        };

                        try {
                            const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(payload)
                            });

                            if (response.ok) {
                                const replyDoc = {
                                    body: replyText + '\n\n[Botón: Sí, acepto ✅] [Botón: No, gracias]',
                                    to: from,
                                    type: 'text',
                                    direction: 'outbound',
                                    timestamp: serverTimestamp()
                                };
                                await addDoc(messagesRef, replyDoc);
                                await setDoc(chatRef, {
                                    lastMessage: `🤖 Auto-respuesta con botones de consentimiento enviada`,
                                    lastMessageAt: serverTimestamp(),
                                    botState: 'idle'
                                }, { merge: true });
                            }
                        } catch (err) {
                            console.error('Error sending registration interactive reply:', err);
                        }

                    // 2. AUTO-REPLY TYPE B: Consent Button Clicked
                    } else if (isButtonSelection) {
                        let consentReply = '';
                        if (buttonId === 'consent_yes') {
                            consentReply = `¡Muchas gracias por tu confianza! ❤️ Tu consentimiento ha sido registrado. A partir de ahora te mantendremos informado(a) sobre las actividades del Senador Heriberto Aguilar y del movimiento. ¡Sigamos transformando juntos! 🏛️🤝`;
                        } else if (buttonId === 'consent_no') {
                            consentReply = `Entendido. Respetamos completamente tu decisión y no te enviaremos mensajes de difusión masiva. Si en el futuro deseas recibir noticias, siempre puedes escribirnos. ¡Que tengas un excelente día! 👍`;
                        }

                        if (consentReply) {
                            const payload = {
                                messaging_product: 'whatsapp',
                                to: cleanTo,
                                type: 'text',
                                text: { body: consentReply }
                            };

                            try {
                                const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `Bearer ${token}`,
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify(payload)
                                });

                                if (response.ok) {
                                    const replyDoc = {
                                        body: consentReply,
                                        to: from,
                                        type: 'text',
                                        direction: 'outbound',
                                        timestamp: serverTimestamp()
                                    };
                                    await addDoc(messagesRef, replyDoc);
                                    await setDoc(chatRef, {
                                        lastMessage: `🤖 Auto-respuesta: ${buttonId === 'consent_yes' ? 'Consentimiento registrado' : 'Consentimiento rechazado'}`,
                                        lastMessageAt: serverTimestamp(),
                                        botState: 'idle'
                                    }, { merge: true });
                                }
                            } catch (err) {
                                console.error('Error sending consent button selection response:', err);
                            }
                        }

                    // 3. CONVERSATIONAL BOT STATE MACHINE (For any general text message)
                    } else {
                        const messageBodyLower = (messageDoc.body || '').toLowerCase().trim();

                        const supportKeywords = [
                            'apoyo', 'estamos con', 'adelante', 'felicidades', 'excelente', 
                            'suerte', 'gracias', 'saludos', 'viva', 'morena', 'heriberto',
                            'felicito', 'abrazo', 'saludo', 'bendiciones', 'buen dia',
                            'buenos dias', 'buenas tardes', 'buenas noches', 'ya me registre',
                            'ya me registré', 'animo', 'ánimo', 'listo', 'lista'
                        ];

                        const petitionKeywords = [
                            'peticion', 'petición', 'solicitud', 'ayuda', 'necesito', 'ocupo',
                            'problema', 'consulta', 'tramite', 'trámite', 'gestion', 'gestión',
                            'reportar', 'duda', 'pregunta', 'apoyo social', 'gestionar', 'carta'
                        ];

                        const isSupport = supportKeywords.some(keyword => messageBodyLower.includes(keyword));
                        const isPetition = petitionKeywords.some(keyword => messageBodyLower.includes(keyword));

                        // Query contact in campaigns/main_campaign/contacts
                        const cleanFromPhone = from.replace(/\D/g, '').slice(-10); // 10 digits
                        const contactsRef = collection(db, 'campaigns', 'main_campaign', 'contacts');
                        const qContact = query(contactsRef, where('phone', '==', cleanFromPhone));
                        const contactSnap = await getDocs(qContact);
                        
                        let contactDoc: any = null;
                        let contactData: any = null;
                        if (!contactSnap.empty) {
                            contactDoc = contactSnap.docs[0];
                            contactData = contactDoc.data();
                        }

                        // Query gestiones to see if this user has an active folio
                        let activeGestion: any = null;
                        if (contactData) {
                            const gestionesRef = collection(db, 'campaigns', 'main_campaign', 'gestiones');
                            const qGestiones = query(gestionesRef, where('phone', 'in', [from, cleanFromPhone]));
                            const gestionesSnap = await getDocs(qGestiones);
                            
                            for (const docSnap of gestionesSnap.docs) {
                                const data = docSnap.data();
                                if (data.status !== 'resuelto') {
                                    activeGestion = data;
                                    break;
                                }
                            }
                        }

                        // Read if this is a newly registered user who has not clicked a consent button yet (grace period)
                        const isNewRegistrationFlow = chatDoc.exists() && chatDoc.data().lastMessage?.includes('botones de consentimiento');

                        let replyText = '';
                        let newBotState = botState || 'idle';
                        let isReferralToVinculacion = false;
                        let extraDataToMerge: any = {};

                        const getUpdatedCardMessage = (contact: any) => {
                            const nameStr = contact?.name || 'Enlace';
                            const secStr = contact?.seccional || 'Faltante 🔴';
                            const calleStr = contact?.calle || 'Faltante 🔴';
                            const colStr = contact?.colonia || 'Faltante 🔴';
                            const munStr = contact?.municipio || 'Faltante 🔴';
                            const numIntStr = contact?.numInt ? ` (Int: ${contact.numInt})` : '';
                            const invStr = contact?.invitedBy || 'No especificado 🔴';

                            return `¡Dato actualizado con éxito! 📝 Tus datos actuales en nuestro Directorio Ciudadano han quedado así:\n\n*👤 Nombre:* ${nameStr}\n*🗳️ Sección Electoral:* ${secStr}\n*📍 Dirección:* Calle ${calleStr}${numIntStr}, Col. ${colStr}, ${munStr}\n*👥 Invitado por:* ${invStr}\n\n¿Deseas corregir algún otro dato o están todos correctos? Escribe **"Sí, son correctos"** o **"Listo"** si todo está bien. Si deseas cambiar algo más, indícame qué dato o el número:`;
                        };

                        // If an image was received, attempt to process it as an INE card
                        let ineData: any = null;
                        if (msgType === 'image' && messageDoc.mediaId) {
                            try {
                                const token = process.env.WHATSAPP_TOKEN;
                                if (token) {
                                    const metaRes = await fetch(`https://graph.facebook.com/v19.0/${messageDoc.mediaId}`, {
                                        headers: { 'Authorization': `Bearer ${token}` }
                                    });
                                    if (metaRes.ok) {
                                        const metaData = await metaRes.json();
                                        const downloadUrl = metaData?.url;
                                        if (downloadUrl) {
                                            const fileRes = await fetch(downloadUrl, {
                                                headers: { 'Authorization': `Bearer ${token}` }
                                            });
                                            if (fileRes.ok) {
                                                const fileBuffer = await fileRes.arrayBuffer();
                                                const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
                                                if (geminiKey) {
                                                    const genAI = new GoogleGenerativeAI(geminiKey);
                                                    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                                                    
                                                    const fileBufferBase64 = Buffer.from(fileBuffer).toString('base64');
                                                    const imagePart = {
                                                        inlineData: {
                                                            data: fileBufferBase64,
                                                            mimeType: messageDoc.mimeType || "image/jpeg"
                                                        }
                                                    };
                                                    
                                                    const prompt = `Analiza detenidamente esta imagen de una credencial para votar mexicana (INE). Extrae de forma precisa los siguientes campos y devuélvelos estrictamente en formato JSON válido, sin textos adicionales ni bloques de formato markdown. Si un campo no es visible o legible, devuélvelo vacío (""):
{
  "nombreCompleto": "Nombre y apellidos completos en orden natural",
  "seccionElectoral": "Número de sección electoral (de 3 o 4 dígitos). IMPORTANTE: Si tiene ceros a la izquierda (ej. 0432 o 0059), devuélvelo SIN esos ceros a la izquierda (ej. 432 o 59).",
  "calleYNumero": "Calle y número exterior de domicilio",
  "colonia": "Nombre de la colonia o localidad",
  "municipio": "Municipio o Ciudad de residencia"
}`;
                                                    
                                                    const result = await model.generateContent([prompt, imagePart]);
                                                    const responseText = result.response.text();
                                                    
                                                    let cleanJsonText = responseText.trim();
                                                    if (cleanJsonText.startsWith('```')) {
                                                        cleanJsonText = cleanJsonText.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '').trim();
                                                    }
                                                    
                                                    const parsed = JSON.parse(cleanJsonText);
                                                    if (parsed.nombreCompleto?.trim() || parsed.seccionElectoral?.trim()) {
                                                        ineData = {
                                                            name: (parsed.nombreCompleto || '').trim(),
                                                            seccional: (parsed.seccionElectoral || '').trim().replace(/^0+/, ''),
                                                            calle: (parsed.calleYNumero || '').trim(),
                                                            colonia: (parsed.colonia || '').trim(),
                                                            municipio: (parsed.municipio || '').trim()
                                                        };
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            } catch (ocrErr) {
                                console.error('Error in INE OCR via Gemini:', ocrErr);
                            }
                        }

                        if (msgType === 'image') {
                            if (ineData) {
                                const invitedByStr = contactData?.invitedBy || 'No especificado 🔴';
                                replyText = `¡Listo! He leído los datos de tu INE en un segundo. 📋 Por seguridad y para verificar tu información en el Directorio, por favor confírmame si los extraje de forma correcta:\n\n*👤 Nombre:* ${ineData.name}\n*🗳️ Sección Electoral:* ${ineData.seccional || 'Faltante 🔴'}\n*📍 Dirección:* Calle ${ineData.calle || 'Faltante 🔴'}, Col. ${ineData.colonia || 'Faltante 🔴'}, ${ineData.municipio || 'Faltante 🔴'}\n*👥 Invitado por:* ${invitedByStr}\n\n¿Son correctos tus datos o deseas corregir alguno? Escribe **"Sí, son correctos"** o **"Actualizar"**:`;
                                newBotState = 'confirmando_datos_ine';
                                extraDataToMerge = {
                                    tempName: ineData.name || '',
                                    tempSeccional: ineData.seccional || '',
                                    tempCalle: ineData.calle || '',
                                    tempColonia: ineData.colonia || '',
                                    tempMunicipio: ineData.municipio || '',
                                    tempInvitedBy: contactData?.invitedBy || '',
                                    botState: 'confirmando_datos_ine'
                                };
                            } else {
                                replyText = `No logré identificar de forma clara los datos de tu credencial INE en la foto. 📸\n\nPor favor, asegúrate de enviar una **foto nítida y de frente** de tu credencial, o si lo prefieres, dime tu **Nombre Completo** por este medio para capturar tus datos manualmente:`;
                            }
                        } else {
                            if (isNewRegistrationFlow) {
                            // If they are in the new registration flow, WE DO NOT spam them for polite words/support.
                            // The ONLY thing we respond to is an explicit petition.
                            if (isPetition) {
                                if (contactData) {
                                    if (activeGestion) {
                                        const statusText = activeGestion.status === 'pendiente' ? 'Pendiente 🔴' : 'En Proceso 🟡';
                                        replyText = `Veo que actualmente tienes una petición activa en nuestro sistema:\n\n*📋 Folio de Gestión:* ${activeGestion.folio}\n*📌 Estatus:* ${statusText}\n*📝 Petición:* "${activeGestion.petitionText}"\n\n📞 El número de teléfono oficial de Vinculación es: **662 423 6390**\n\n🔗 Puedes escribirles directamente haciendo clic en el siguiente enlace de WhatsApp para dar seguimiento:\nhttps://wa.me/526624236390?text=Hola,%20le%20doy%20seguimiento%20a%20mi%20Folio%20de%20Gesti%C3%B3n%20${activeGestion.folio}\n\n¡Seguimos a tus órdenes! 🏛️✨`;
                                        newBotState = 'idle';
                                    } else {
                                        replyText = `Entendido. Por favor, **escríbeme detalladamente cuál es tu consulta, petición o el apoyo que necesitas** para poder registrarlo y canalizarlo de forma correcta: 📋`;
                                        newBotState = 'esperando_motivo_peticion';
                                    }
                                } else {
                                    replyText = `¡Hola! 👋 Te saluda el Asistente Virtual del Senador Heriberto Aguilar. Veo que nos escribes desde este número pero aún no lo tenemos registrado en nuestra red ciudadana.\n\n¿Ya te habías registrado anteriormente con otro número de teléfono o eres un nuevo integrante? 🗳️\n\nEscribe:\n1️⃣ **"Ya me registré"** (si usaste otro número)\n2️⃣ **"Soy nuevo"** (si deseas registrarte hoy)`;
                                    newBotState = 'validando_telefono';
                                }
                            } else {
                                // For anything else ("ya me registre", "animo", "gracias"), the bot stays completely SILENT.
                                return new NextResponse('EVENT_RECEIVED', { status: 200 });
                            }
                        } else {
                            // Read if they have already confirmed their details in the chat state
                            const hasConfirmedDetails = chatDoc.exists() && chatDoc.data().datosConfirmados === true;
                            const isUpdatingAll = chatDoc.exists() && chatDoc.data().isUpdatingAll === true;

                            // Breakout / questionnaire loop reset check
                            const isQuestionnaireState = botState !== 'idle' && 
                                                         botState !== 'saludado' && 
                                                         botState !== 'esperando_motivo' && 
                                                         botState !== 'confirmando_datos_existentes' &&
                                                         botState !== 'validando_telefono' &&
                                                         botState !== 'esperando_telefono_anterior';

                            const breakoutKeywords = [
                                'hola', 'buen dia', 'buenos dias', 'buenas tardes', 'buenas noches', 
                                'ey', 'eit', 'peticion', 'petición', 'solicitud', 'ayuda', 
                                'cancelar', 'salir', 'menu', 'menú', 'reiniciar', 'inicio'
                            ];
                            
                            const isBreakoutIntent = isQuestionnaireState && breakoutKeywords.some(keyword => {
                                return messageBodyLower.startsWith(keyword) || 
                                       messageBodyLower.endsWith(keyword) || 
                                       messageBodyLower === keyword ||
                                       (keyword.length > 3 && messageBodyLower.includes(keyword));
                            });

                            if (isBreakoutIntent) {
                                botState = 'idle';
                                newBotState = 'idle';
                                extraDataToMerge.botState = 'idle';
                                extraDataToMerge.tempName = '';
                                extraDataToMerge.tempSeccional = '';
                                extraDataToMerge.tempColonia = '';
                                extraDataToMerge.tempCalle = '';
                                extraDataToMerge.tempInvitedBy = '';
                                extraDataToMerge.tempMunicipio = '';
                                extraDataToMerge.onlyUpdating = false;
                                extraDataToMerge.isUpdatingAll = false;

                                const lowerMsg = messageBodyLower;
                                if (lowerMsg === 'cancelar' || lowerMsg === 'salir' || lowerMsg === 'reiniciar') {
                                    replyText = `Entendido. He cancelado el registro o actualización de datos actual. Si deseas volver a empezar, solo escribe **"Actualizar"** o envíanos un saludo. ¿Hay algo más en lo que te pueda ayudar? 🏛️✨`;
                                }
                            }

                            // General override for update intent
                            const isUpdateIntent = contactData && (
                                messageBodyLower.includes('actualizar') ||
                                messageBodyLower.includes('actualizacion') ||
                                messageBodyLower.includes('actulizar') || // Handles user's typo
                                messageBodyLower.includes('corregir') ||
                                messageBodyLower.includes('cambiar') ||
                                messageBodyLower.includes('modificar') ||
                                messageBodyLower.includes('mis datos') ||
                                messageBodyLower.includes('mis campos')
                            );

                            // Check active conversational states:
                            if (isUpdateIntent && (botState === 'idle' || botState === 'saludado' || botState === 'esperando_motivo')) {
                                const nameStr = contactData.name || 'Enlace';
                                const secStr = contactData.seccional || 'Faltante 🔴';
                                const calleStr = contactData.calle || 'Faltante 🔴';
                                const colStr = contactData.colonia || 'Faltante 🔴';
                                const munStr = contactData.municipio || 'Faltante 🔴';
                                const numIntStr = contactData.numInt ? ` (Int: ${contactData.numInt})` : '';
                                const invStr = contactData.invitedBy || 'No especificado 🔴';
                                
                                extraDataToMerge.onlyUpdating = true;
                                replyText = `Entendido. Vamos a revisar tus datos actuales en nuestro Directorio Ciudadano para asegurarnos de que todo esté al día: 🗳️\n\n*👤 Nombre:* ${nameStr}\n*🗳️ Sección Electoral:* ${secStr}\n*📍 Dirección:* Calle ${calleStr}${numIntStr}, Col. ${colStr}, ${munStr}\n*👥 Invitado por:* ${invStr}\n\n¿Son correctos tus datos o deseas actualizarlos? Escribe **"Sí, son correctos"** o **"Actualizar"**:`;
                                newBotState = 'confirmando_datos_existentes';
                            } else if (botState === 'confirmando_datos_existentes') {
                                const responseLower = (messageDoc.body || '').toLowerCase().trim();
                                
                                const isNo = responseLower.includes('no ') || 
                                             responseLower === 'no' || 
                                             responseLower.startsWith('no ') || 
                                             responseLower.endsWith(' no') || 
                                             responseLower.includes('incorrecto') || 
                                             responseLower.includes('incorrectos') || 
                                             responseLower.includes('falso') || 
                                             responseLower.includes('tampoco') || 
                                             responseLower.includes('ninguno');

                                const isYes = !isNo && (
                                              responseLower.includes('si') || 
                                              responseLower.includes('sí') || 
                                              responseLower.includes('correcto') || 
                                              responseLower.includes('correctos') || 
                                              responseLower.includes('perfecto') || 
                                              responseLower.includes('perfecta') || 
                                              responseLower.includes('excelente') || 
                                              responseLower.includes('bien') || 
                                              responseLower.includes('ok') || 
                                              responseLower.includes('listo') || 
                                              responseLower.includes('lista') || 
                                              responseLower.includes('de acuerdo') || 
                                              responseLower.includes('enterado') || 
                                              responseLower.includes('1')
                                );

                                if (isYes) {
                                    extraDataToMerge.datosConfirmados = true;
                                    
                                    // Check if they are missing any critical fields in their profile
                                    const hasInvitedBy = contactData?.invitedBy;
                                    const hasMunicipio = contactData?.municipio;
                                    const hasSeccional = contactData?.seccional;
                                    const hasColonia = contactData?.colonia;
                                    const hasCalle = contactData?.calle;
                                    const hasNumInt = contactData?.numInt !== undefined && contactData?.numInt !== null;

                                    if (!hasInvitedBy) {
                                        replyText = `¡Excelente! Gracias por confirmar tus datos. 🗳️\n\nPara completar tu registro al 100%, ¿podrías decirme **quién te invitó** a sumarte a este movimiento o **cómo te enteraste** de este número?`;
                                        newBotState = 'esperando_invitado';
                                    } else if (!hasMunicipio) {
                                        replyText = `¡Excelente! Gracias por confirmar tus datos. 🗳️\n\n¿Podrías decirme en qué **Municipio o Ciudad** de Sonora vives?`;
                                        newBotState = 'esperando_municipio';
                                    } else if (!hasSeccional) {
                                        replyText = `¡Excelente! Gracias por confirmar tus datos. 🗳️\n\n¿Me podrías indicar tu **Sección Electoral**? (Es el número de 3 o 4 dígitos al frente de tu INE).`;
                                        newBotState = 'esperando_seccional';
                                    } else if (!hasColonia) {
                                        replyText = `¡Excelente! Gracias por confirmar tus datos. 🗳️\n\n¿Podrías decirme en qué **Colonia o Localidad** vives?`;
                                        newBotState = 'esperando_colonia';
                                    } else if (!hasCalle) {
                                        replyText = `¡Excelente! Gracias por confirmar tus datos. 🗳️\n\n¿Podrías decirme tu **Calle y Número Exterior** de casa?`;
                                        newBotState = 'esperando_calle';
                                    } else if (!hasNumInt) {
                                        replyText = `¡Excelente! Gracias por confirmar tus datos. 🗳️\n\nSi tu domicilio cuenta con **Número Interior o de departamento**, por favor escríbelo. Si no tiene, escribe **"No"**:`;
                                        newBotState = 'esperando_numint';
                                    } else {
                                        replyText = `¡Perfecto! Tus datos han sido confirmados y están 100% correctos. Muchas gracias por ayudarnos a mantener nuestro Directorio Ciudadano sólido y actualizado. 🏛️✨\n\n¿Hay alguna consulta o tema en el que te podamos apoyar el día de hoy?`;
                                        newBotState = 'idle';
                                        extraDataToMerge.onlyUpdating = false;
                                        extraDataToMerge.isUpdatingAll = false;
                                    }
                                } else {
                                    // User said "No", "Actualizar", "cambiar el nombre", etc.
                                    // Check if they want to update a specific field
                                    const mentionsName = responseLower.includes('nombre') || responseLower.includes('llam') || responseLower.includes('nom');
                                    const mentionsSection = responseLower.includes('seccion') || responseLower.includes('sección') || responseLower.includes('ine') || responseLower.includes('electoral') || responseLower.includes('seccional');
                                    const mentionsInvited = responseLower.includes('invito') || responseLower.includes('invitó') || responseLower.includes('quien') || responseLower.includes('quién');
                                    const mentionsMunicipio = responseLower.includes('ciudad') || responseLower.includes('municipio') || responseLower.includes('pueblo') || responseLower.includes('lugar');
                                    const mentionsAddress = responseLower.includes('direccion') || responseLower.includes('dirección') || responseLower.includes('colonia') || responseLower.includes('calle') || responseLower.includes('casa') || responseLower.includes('domicilio') || responseLower.includes('localidad');

                                    if (mentionsName) {
                                         replyText = `Entendido, vamos a corregir tu nombre. 📝\n\nPor favor, escribe tu **Nombre Completo** (tal como aparece en tu credencial del INE):`;
                                         newBotState = 'actualizando_nombre';
                                     } else if (mentionsInvited) {
                                         replyText = `Entendido, vamos a corregir quién te invitó. 👥\n\nPor favor, dime ¿**quién te invitó** a sumarte a este movimiento o **cómo te enteraste** de este número?`;
                                         newBotState = 'esperando_invitado';
                                     } else if (mentionsMunicipio) {
                                         replyText = `Entendido, vamos a corregir tu Municipio o Ciudad de residencia. 📍\n\nPor favor, dime ¿en qué **Municipio o Ciudad** de Sonora vives?`;
                                         newBotState = 'esperando_municipio';
                                     } else if (mentionsSection) {
                                         replyText = `Entendido, vamos a corregir tu Sección Electoral. 🗳️\n\nPor favor, indícame tu **Sección Electoral** (el número de 3 o 4 dígitos de tu INE):`;
                                         newBotState = 'esperando_seccional';
                                     } else if (mentionsAddress) {
                                         replyText = `Entendido, vamos a corregir tu dirección de domicilio. 🏠\n\nPor favor, dime ¿en qué **Colonia o Localidad** vives?`;
                                         newBotState = 'esperando_colonia';
                                     } else {
                                         // Present a menu of fields to choose what to update
                                         replyText = `Entendido, vamos a corregir tus datos. 📝 ¿Qué información de tu registro deseas actualizar?\n\nPor favor, escribe el **número** o el **nombre** de la opción:\n\n1️⃣ **Nombre Completo** 👤\n2️⃣ **Sección Electoral** 🗳️\n3️⃣ **Municipio o Ciudad** 📍\n4️⃣ **Dirección** (Calle/Colonia) 🏠\n5️⃣ **Quién te invitó** 👥\n6️⃣ **Todo** (actualizar todos los campos uno por uno) 🔄\n\nEscribe el número o el campo que deseas cambiar:`;
                                         newBotState = 'preguntando_que_actualizar';
                                     }
                                }

                             } else if (botState === 'preguntando_que_actualizar') {
                                 const responseLower = (messageDoc.body || '').toLowerCase().trim();
                                 
                                 const mentionsName = responseLower.includes('1') || responseLower.includes('nombre') || responseLower.includes('nom');
                                 const mentionsSection = responseLower.includes('2') || responseLower.includes('seccion') || responseLower.includes('sección') || responseLower.includes('electoral') || responseLower.includes('ine') || responseLower.includes('seccional');
                                 const mentionsMunicipio = responseLower.includes('3') || responseLower.includes('municipio') || responseLower.includes('ciudad');
                                 const mentionsAddress = responseLower.includes('4') || responseLower.includes('direccion') || responseLower.includes('dirección') || responseLower.includes('calle') || responseLower.includes('colonia') || responseLower.includes('casa') || responseLower.includes('domicilio') || responseLower.includes('localidad');
                                 const mentionsInvited = responseLower.includes('5') || responseLower.includes('invito') || responseLower.includes('invitó') || responseLower.includes('quien') || responseLower.includes('quién');
                                 const mentionsAll = responseLower.includes('6') || responseLower.includes('todo') || responseLower.includes('todos') || responseLower.includes('completo');

                                 if (mentionsName) {
                                     replyText = `Entendido, vamos a corregir tu nombre. 📝\n\nPor favor, escribe tu **Nombre Completo** (tal como aparece en tu credencial del INE):`;
                                     newBotState = 'actualizando_nombre';
                                 } else if (mentionsSection) {
                                     replyText = `Entendido, vamos a corregir tu Sección Electoral. 🗳️\n\nPor favor, indícame tu **Sección Electoral** (el número de 3 o 4 dígitos de tu INE):`;
                                     newBotState = 'esperando_seccional';
                                 } else if (mentionsMunicipio) {
                                     replyText = `Entendido, vamos a corregir tu Municipio o Ciudad de residencia. 📍\n\nPor favor, dime ¿en qué **Municipio o Ciudad** de Sonora vives?`;
                                     newBotState = 'esperando_municipio';
                                 } else if (mentionsAddress) {
                                     replyText = `Entendido, vamos a corregir tu dirección de domicilio. 🏠\n\nPor favor, dime ¿en qué **Colonia o Localidad** vives?`;
                                     newBotState = 'esperando_colonia';
                                 } else if (mentionsInvited) {
                                     replyText = `Entendido, vamos a corregir quién te invitó. 👥\n\nPor favor, dime ¿**quién te invitó** a sumarte a este movimiento o **cómo te enteraste** de este número?`;
                                     newBotState = 'esperando_invitado';
                                 } else if (mentionsAll) {
                                     replyText = `Entendido. Vamos a actualizar toda tu información paso a paso. 🔄\n\nPor favor, escribe tu **Nombre Completo** (tal como aparece en tu credencial para votar):`;
                                     newBotState = 'actualizando_nombre';
                                     extraDataToMerge.isUpdatingAll = true;
                                 } else {
                                     replyText = `Disculpa, no logré identificar qué opción deseas cambiar. 🤔\n\nPor favor, escribe el **número** o **nombre** del campo que deseas cambiar:\n\n1️⃣ **Nombre Completo** 👤\n2️⃣ **Sección Electoral** 🗳️\n3️⃣ **Municipio o Ciudad** 📍\n4️⃣ **Dirección** (Calle/Colonia) 🏠\n5️⃣ **Quién te invitó** 👥\n6️⃣ **Todo** (actualizar todos los campos) 🔄`;
                                     newBotState = 'preguntando_que_actualizar';
                                 }

                            } else if (botState === 'actualizando_nombre') {
                                const userNewName = (messageDoc.body || '').trim();
                                const savedContactId = chatDoc.exists() ? chatDoc.data().contactId : '';
                                if (savedContactId) {
                                    await updateDoc(doc(db, 'campaigns', 'main_campaign', 'contacts', savedContactId), {
                                        name: userNewName
                                    });
                                }
                                
                                const contactDocSnap = savedContactId ? await getDoc(doc(db, 'campaigns', 'main_campaign', 'contacts', savedContactId)) : null;
                                const updatedContactData = contactDocSnap?.exists() ? contactDocSnap.data() : null;

                                if (isUpdatingAll || !updatedContactData?.invitedBy) {
                                    replyText = `¡Nombre actualizado! 🤝\n\nAhora, ¿**quién te invitó** a sumarte a este movimiento o **cómo te enteraste** de este número?`;
                                    newBotState = 'esperando_invitado';
                                } else if (!updatedContactData?.municipio) {
                                    replyText = `¡Nombre actualizado! 🤝\n\nAhora dime, ¿en qué **Municipio o Ciudad** de Sonora vives?`;
                                    newBotState = 'esperando_municipio';
                                } else if (!updatedContactData?.seccional) {
                                    replyText = `¡Nombre actualizado! 🤝\n\nAhora, por favor indícame tu **Sección Electoral** (el número de 3 o 4 dígitos al frente de tu INE):`;
                                    newBotState = 'esperando_seccional';
                                } else if (!updatedContactData?.colonia) {
                                    replyText = `¡Nombre actualizado! 🤝\n\nAhora, ¿en qué **Colonia o Localidad** vives?`;
                                    newBotState = 'esperando_colonia';
                                } else if (!updatedContactData?.calle) {
                                    replyText = `¡Nombre actualizado! 🤝\n\nAhora, escribe tu **Calle y Número Exterior** de casa:`;
                                    newBotState = 'esperando_calle';
                                } else if (updatedContactData?.numInt === undefined || updatedContactData?.numInt === null) {
                                    replyText = `¡Nombre actualizado! 🤝\n\nSi tu domicilio tiene **Número Interior o de departamento**, escríbelo por favor. Si no tiene, escribe **"No"**:`;
                                    newBotState = 'esperando_numint';
                                } else {
                                     extraDataToMerge.isUpdatingAll = false;
                                     const onlyUpdating = chatDoc.exists() && chatDoc.data().onlyUpdating === true;
                                     if (onlyUpdating) {
                                         replyText = getUpdatedCardMessage(updatedContactData);
                                         newBotState = 'confirmando_datos_existentes';
                                     } else {
                                         extraDataToMerge.datosConfirmados = true;
                                         replyText = `¡Excelente! Tu registro como Enlace Ciudadano está ahora 100% completo, actualizado y verificado. Muchas gracias por tu valioso apoyo. ¿Hay alguna gestión o petición en la que te podamos ayudar hoy?`;
                                         newBotState = 'idle';
                                     }
                                }

                            } else if (botState === 'esperando_invitado') {
                                const userInvitedBy = (messageDoc.body || '').trim();
                                const savedContactId = chatDoc.exists() ? chatDoc.data().contactId : '';
                                if (savedContactId) {
                                    await updateDoc(doc(db, 'campaigns', 'main_campaign', 'contacts', savedContactId), {
                                        invitedBy: userInvitedBy
                                    });
                                }
                                
                                const contactDocSnap = savedContactId ? await getDoc(doc(db, 'campaigns', 'main_campaign', 'contacts', savedContactId)) : null;
                                const updatedContactData = contactDocSnap?.exists() ? contactDocSnap.data() : null;

                                if (isUpdatingAll || !updatedContactData?.municipio) {
                                    replyText = `¡Registrado! Ahora dime, ¿en qué **Municipio o Ciudad** de Sonora vives?`;
                                    newBotState = 'esperando_municipio';
                                } else if (!updatedContactData?.seccional) {
                                    replyText = `¡Registrado! Ahora, por favor indícame tu **Sección Electoral** (el número de 3 o 4 dígitos al frente de tu INE):`;
                                    newBotState = 'esperando_seccional';
                                } else if (!updatedContactData?.colonia) {
                                    replyText = `¡Registrado! Ahora, ¿en qué **Colonia o Localidad** vives?`;
                                    newBotState = 'esperando_colonia';
                                } else if (!updatedContactData?.calle) {
                                    replyText = `¡Registrado! Ahora, escribe tu **Calle y Número Exterior** de casa:`;
                                    newBotState = 'esperando_calle';
                                } else if (updatedContactData?.numInt === undefined || updatedContactData?.numInt === null) {
                                    replyText = `¡Registrado! Si tu domicilio tiene **Número Interior o de departamento**, escríbelo por favor. Si no tiene, escribe **"No"**:`;
                                    newBotState = 'esperando_numint';
                                } else {
                                     extraDataToMerge.isUpdatingAll = false;
                                     const onlyUpdating = chatDoc.exists() && chatDoc.data().onlyUpdating === true;
                                     if (onlyUpdating) {
                                         replyText = getUpdatedCardMessage(updatedContactData);
                                         newBotState = 'confirmando_datos_existentes';
                                     } else {
                                         extraDataToMerge.datosConfirmados = true;
                                         replyText = `¡Excelente! Tu registro como Enlace Ciudadano está ahora 100% completo, actualizado y verificado. Muchas gracias por tu valioso apoyo. ¿Hay alguna gestión o petición en la que te podamos ayudar hoy?`;
                                         newBotState = 'idle';
                                     }
                                }

                            } else if (botState === 'esperando_municipio') {
                                const userMunicipio = (messageDoc.body || '').trim();
                                const savedContactId = chatDoc.exists() ? chatDoc.data().contactId : '';
                                if (savedContactId) {
                                    await updateDoc(doc(db, 'campaigns', 'main_campaign', 'contacts', savedContactId), {
                                        municipio: userMunicipio
                                    });
                                }
                                
                                const contactDocSnap = savedContactId ? await getDoc(doc(db, 'campaigns', 'main_campaign', 'contacts', savedContactId)) : null;
                                const updatedContactData = contactDocSnap?.exists() ? contactDocSnap.data() : null;

                                if (isUpdatingAll || !updatedContactData?.seccional) {
                                    replyText = `¡Municipio registrado! Ahora indícame tu **Sección Electoral** (el número de 3 o 4 dígitos al frente de tu INE):`;
                                    newBotState = 'esperando_seccional';
                                } else if (!updatedContactData?.colonia) {
                                    replyText = `¡Municipio registrado! Ahora, ¿en qué **Colonia o Localidad** vives?`;
                                    newBotState = 'esperando_colonia';
                                } else if (!updatedContactData?.calle) {
                                    replyText = `¡Municipio registrado! Ahora, escribe tu **Calle y Número Exterior** de casa:`;
                                    newBotState = 'esperando_calle';
                                } else if (updatedContactData?.numInt === undefined || updatedContactData?.numInt === null) {
                                    replyText = `¡Municipio registrado! Si tu domicilio tiene **Número Interior o de departamento**, escríbelo por favor. Si no tiene, escribe **"No"**:`;
                                    newBotState = 'esperando_numint';
                                } else {
                                     extraDataToMerge.isUpdatingAll = false;
                                     const onlyUpdating = chatDoc.exists() && chatDoc.data().onlyUpdating === true;
                                     if (onlyUpdating) {
                                         replyText = getUpdatedCardMessage(updatedContactData);
                                         newBotState = 'confirmando_datos_existentes';
                                     } else {
                                         extraDataToMerge.datosConfirmados = true;
                                         replyText = `¡Excelente! Tu registro como Enlace Ciudadano está ahora 100% completo, actualizado y verificado. Muchas gracias por tu valioso apoyo. ¿Hay alguna gestión o petición en la que te podamos ayudar hoy?`;
                                         newBotState = 'idle';
                                     }
                                }

                            } else if (botState === 'esperando_seccional') {
                                const matchSeccional = (messageDoc.body || '').match(/\b\d{1,4}\b/);
                                if (matchSeccional) {
                                    const newSeccional = matchSeccional[0];
                                    const savedContactId = chatDoc.exists() ? chatDoc.data().contactId : '';
                                    if (savedContactId) {
                                        await updateDoc(doc(db, 'campaigns', 'main_campaign', 'contacts', savedContactId), {
                                            seccional: newSeccional
                                        });
                                    }
                                    
                                    const contactDocSnap = savedContactId ? await getDoc(doc(db, 'campaigns', 'main_campaign', 'contacts', savedContactId)) : null;
                                    const updatedContactData = contactDocSnap?.exists() ? contactDocSnap.data() : null;

                                    if (isUpdatingAll || !updatedContactData?.colonia) {
                                        replyText = `¡Excelente! He registrado tu Sección Electoral: **${newSeccional}** 🗳️.\n\nAhora, ¿en qué **Colonia o Localidad** vives?`;
                                        newBotState = 'esperando_colonia';
                                    } else if (!updatedContactData?.calle) {
                                        replyText = `¡Excelente! He registrado tu Sección Electoral: **${newSeccional}** 🗳️.\n\nAhora, escribe tu **Calle y Número Exterior** de casa:`;
                                        newBotState = 'esperando_calle';
                                    } else if (updatedContactData?.numInt === undefined || updatedContactData?.numInt === null) {
                                        replyText = `¡Excelente! He registrado tu Sección Electoral: **${newSeccional}** 🗳️.\n\nSi tu domicilio tiene **Número Interior o de departamento**, escríbelo por favor. Si no tiene, escribe **"No"**:`;
                                        newBotState = 'esperando_numint';
                                    } else {
                                        extraDataToMerge.isUpdatingAll = false;
                                        const onlyUpdating = chatDoc.exists() && chatDoc.data().onlyUpdating === true;
                                        if (onlyUpdating) {
                                            replyText = getUpdatedCardMessage(updatedContactData);
                                            newBotState = 'confirmando_datos_existentes';
                                        } else {
                                            extraDataToMerge.datosConfirmados = true;
                                            replyText = `¡Excelente! He actualizado tu Sección Electoral a: **${newSeccional}** 🗳️. Tu registro como Enlace Ciudadano está ahora 100% completo, actualizado y verificado.\n\nMuchísimas gracias por tu apoyo. ¿Hay alguna gestión o petición en la que te podamos ayudar hoy?`;
                                            newBotState = 'idle';
                                        }
                                    }
                                } else {
                                    replyText = `Disculpa, no logré identificar tu Sección Electoral. Por favor, escribe solo los números (de 1 a 4 dígitos) que aparecen al frente de tu credencial del INE.`;
                                    newBotState = 'esperando_seccional';
                                }

                            } else if (botState === 'esperando_colonia') {
                                const userColonia = (messageDoc.body || '').trim();
                                const savedContactId = chatDoc.exists() ? chatDoc.data().contactId : '';
                                if (savedContactId) {
                                    await updateDoc(doc(db, 'campaigns', 'main_campaign', 'contacts', savedContactId), {
                                        colonia: userColonia
                                    });
                                }
                                
                                const contactDocSnap = savedContactId ? await getDoc(doc(db, 'campaigns', 'main_campaign', 'contacts', savedContactId)) : null;
                                const updatedContactData = contactDocSnap?.exists() ? contactDocSnap.data() : null;

                                if (isUpdatingAll || !updatedContactData?.calle) {
                                    replyText = `¡Perfecto! Colonia **"${userColonia}"** registrada.\n\nAhora, escribe tu **Calle y Número Exterior** de casa:`;
                                    newBotState = 'esperando_calle';
                                } else if (updatedContactData?.numInt === undefined || updatedContactData?.numInt === null) {
                                    replyText = `¡Perfecto! Colonia **"${userColonia}"** registrada.\n\nSi tu domicilio tiene **Número Interior o de departamento**, escríbelo por favor. Si no tiene, escribe **"No"**:`;
                                    newBotState = 'esperando_numint';
                                } else {
                                    extraDataToMerge.isUpdatingAll = false;
                                    const onlyUpdating = chatDoc.exists() && chatDoc.data().onlyUpdating === true;
                                    if (onlyUpdating) {
                                        replyText = getUpdatedCardMessage(updatedContactData);
                                        newBotState = 'confirmando_datos_existentes';
                                    } else {
                                        extraDataToMerge.datosConfirmados = true;
                                        replyText = `¡Excelente! Tu registro como Enlace Ciudadano está ahora 100% completo, actualizado y verificado. Muchas gracias por tu valioso apoyo. ¿Hay alguna gestión o petición en la que te podamos ayudar hoy?`;
                                        newBotState = 'idle';
                                    }
                                }

                            } else if (botState === 'esperando_calle') {
                                const userCalle = (messageDoc.body || '').trim();
                                const savedContactId = chatDoc.exists() ? chatDoc.data().contactId : '';
                                if (savedContactId) {
                                    await updateDoc(doc(db, 'campaigns', 'main_campaign', 'contacts', savedContactId), {
                                        calle: userCalle
                                    });
                                }
                                
                                const contactDocSnap = savedContactId ? await getDoc(doc(db, 'campaigns', 'main_campaign', 'contacts', savedContactId)) : null;
                                const updatedContactData = contactDocSnap?.exists() ? contactDocSnap.data() : null;

                                if (isUpdatingAll || updatedContactData?.numInt === undefined || updatedContactData?.numInt === null) {
                                    replyText = `¡Calle registrada! Si tu domicilio tiene **Número Interior o de departamento**, por favor escríbelo. Si no tiene, escribe **"No"**:`;
                                    newBotState = 'esperando_numint';
                                } else {
                                    extraDataToMerge.isUpdatingAll = false;
                                    const onlyUpdating = chatDoc.exists() && chatDoc.data().onlyUpdating === true;
                                    if (onlyUpdating) {
                                        replyText = getUpdatedCardMessage(updatedContactData);
                                        newBotState = 'confirmando_datos_existentes';
                                    } else {
                                        extraDataToMerge.datosConfirmados = true;
                                        replyText = `¡Excelente! He guardado tu dirección completa con éxito. Tu registro en el Directorio del Senador Heriberto Aguilar está ahora 100% verificado, completo y al día. 🏛️✨\n\n¿Hay alguna consulta o petición en la que te podamos ayudar el día de hoy?`;
                                        newBotState = 'idle';
                                    }
                                }

                            } else if (botState === 'esperando_numint') {
                                const responseBody = (messageDoc.body || '').trim();
                                const lowerResponse = responseBody.toLowerCase();
                                let userNumInt = responseBody;
                                if (lowerResponse === 'no' || lowerResponse === 'ninguno' || lowerResponse === 'n/a' || lowerResponse === 'na' || lowerResponse === 'no tiene' || lowerResponse === 'sin numero interior') {
                                    userNumInt = '';
                                }
                                const savedContactId = chatDoc.exists() ? chatDoc.data().contactId : '';
                                if (savedContactId) {
                                    await updateDoc(doc(db, 'campaigns', 'main_campaign', 'contacts', savedContactId), {
                                        numInt: userNumInt
                                    });
                                }
                                
                                const contactDocSnap = savedContactId ? await getDoc(doc(db, 'campaigns', 'main_campaign', 'contacts', savedContactId)) : null;
                                const updatedContactData = contactDocSnap?.exists() ? contactDocSnap.data() : null;

                                extraDataToMerge.isUpdatingAll = false;
                                const onlyUpdating = chatDoc.exists() && chatDoc.data().onlyUpdating === true;
                                if (onlyUpdating) {
                                    replyText = getUpdatedCardMessage(updatedContactData);
                                    newBotState = 'confirmando_datos_existentes';
                                } else {
                                    extraDataToMerge.datosConfirmados = true;
                                    replyText = `¡Excelente! He guardado tu dirección completa con éxito. Tu registro en el Directorio del Senador Heriberto Aguilar está ahora 100% verificado, completo y al día. 🏛️✨\n\n¿Hay alguna consulta o petición en la que te podamos ayudar el día de hoy?`;
                                    newBotState = 'idle';
                                }

                            } else if (botState === 'validando_telefono') {
                                const userResponse = (messageDoc.body || '').toLowerCase().trim();
                                if (userResponse.includes('1') || userResponse.includes('otro') || userResponse.includes('ya me') || userResponse.includes('si')) {
                                    replyText = `¡Entendido! Vamos a buscar tu registro anterior en nuestra base de datos. 🔍\n\nPor favor, escribe el **número de teléfono de 10 dígitos** con el que te registraste originalmente:`;
                                    newBotState = 'esperando_telefono_anterior';
                                } else {
                                    replyText = `¡Bienvenido(a) a nuestro movimiento! 🏛️ Nos encantaría registrarte como Enlace Ciudadano del Senador Heriberto Aguilar.\n\nPara comenzar, por favor escribe tu **Nombre Completo** (tal como aparece en tu credencial del INE).\n\n📸 **Tip:** Si lo prefieres, puedes **tomarle una foto de frente a tu credencial del INE** y enviármela por este medio. ¡Yo me encargo de registrar tus datos de forma automática! 😉`;
                                    newBotState = 'esperando_nombre_nuevo';
                                }

                            } else if (botState === 'esperando_telefono_anterior') {
                                const oldPhoneClean = (messageDoc.body || '').replace(/\D/g, '').slice(-10);
                                if (oldPhoneClean.length === 10) {
                                    const qOld = query(contactsRef, where('phone', '==', oldPhoneClean));
                                    const oldSnap = await getDocs(qOld);
                                    if (!oldSnap.empty) {
                                        const oldDoc = oldSnap.docs[0];
                                        const oldData = oldDoc.data();
                                        
                                        // Update the old contact with the active WhatsApp phone!
                                        await updateDoc(doc(db, 'campaigns', 'main_campaign', 'contacts', oldDoc.id), {
                                            phone: cleanFromPhone
                                        });
                                        
                                        // Save contactId in the chat state
                                        extraDataToMerge.contactId = oldDoc.id;
                                        
                                        const nameStr = oldData.name || 'Enlace';
                                        const secStr = oldData.seccional || 'Faltante 🔴';
                                        const calleStr = oldData.calle || 'Faltante 🔴';
                                        const colStr = oldData.colonia || 'Faltante 🔴';
                                        const munStr = oldData.municipio || 'Faltante 🔴';
                                        const numIntStr = oldData.numInt ? ` (Int: ${oldData.numInt})` : '';
                                        const invStr = oldData.invitedBy || 'No especificado 🔴';
                                        
                                        replyText = `¡Lo encontré! Tu registro estaba bajo el número **${oldPhoneClean}** y he actualizado tu teléfono al de tu WhatsApp actual (**${cleanFromPhone}**). ¡Ahora estamos vinculados y sincronizados! 📲✨\n\nPor favor, confírmanos si tus datos actuales en el Directorio son correctos:\n\n*👤 Nombre:* ${nameStr}\n*🗳️ Sección Electoral:* ${secStr}\n*📍 Dirección:* Calle ${calleStr}${numIntStr}, Col. ${colStr}, ${munStr}\n*👥 Invitado por:* ${invStr}\n\n¿Son correctos tus datos o deseas actualizarlos? Escribe **"Sí, son correctos"** o **"Actualizar"**:`;
                                        newBotState = 'confirmando_datos_existentes';
                                    } else {
                                        replyText = `No encontré ningún registro con el número **${oldPhoneClean}** en nuestro directorio.\n\nNo te preocupes, podemos crear un registro nuevo para ti en este momento. Por favor, escríbeme tu **Nombre Completo**:`;
                                        newBotState = 'esperando_nombre_nuevo';
                                    }
                                } else {
                                    replyText = `Por favor, asegúrate de ingresar un número de teléfono válido de 10 dígitos. Escríbelo de nuevo:`;
                                    newBotState = 'esperando_telefono_anterior';
                                }

                            } else if (botState === 'esperando_nombre_nuevo') {
                                const newName = (messageDoc.body || '').trim();
                                extraDataToMerge.tempName = newName;
                                replyText = `¡Mucho gusto, **${newName}**! 🤝\n\n¿**Quién te invitó** a sumarte a este movimiento o **cómo te enteraste** de este número?`;
                                newBotState = 'esperando_invitado_nuevo';

                            } else if (botState === 'esperando_invitado_nuevo') {
                                const newInvitedBy = (messageDoc.body || '').trim();
                                extraDataToMerge.tempInvitedBy = newInvitedBy;
                                
                                const chatState = chatDoc.exists() ? chatDoc.data() : {};
                                const hasMun = chatState.tempMunicipio || extraDataToMerge.tempMunicipio;
                                const hasSec = chatState.tempSeccional || extraDataToMerge.tempSeccional;
                                const hasCol = chatState.tempColonia || extraDataToMerge.tempColonia;
                                const hasCalle = chatState.tempCalle || extraDataToMerge.tempCalle;
                                
                                if (!hasMun) {
                                    replyText = `¡Registrado! Ahora dime, ¿en qué **Municipio o Ciudad** de Sonora vives?`;
                                    newBotState = 'esperando_municipio_nuevo';
                                } else if (!hasSec) {
                                    replyText = `¡Excelente! Ahora, por favor indícame tu **Sección Electoral** (el número de 3 o 4 dígitos de tu INE):`;
                                    newBotState = 'esperando_seccional_nuevo';
                                } else if (!hasCol) {
                                    replyText = `¡Registrado! Ahora, dime ¿en qué **Colonia o Localidad** vives?`;
                                    newBotState = 'esperando_colonia_nuevo';
                                } else if (!hasCalle) {
                                    replyText = `¡Colonia registrada! Por favor, dime tu **Calle y Número Exterior** de casa:`;
                                    newBotState = 'esperando_calle_nuevo';
                                } else {
                                    replyText = `¡Excelente! Ya extraje tu domicilio completo del INE. Si tu casa cuenta con **Número Interior o de departamento**, escríbelo por favor. Si no cuenta con número interior, escribe **"No"**:`;
                                    newBotState = 'esperando_numint_nuevo';
                                }

                            } else if (botState === 'esperando_municipio_nuevo') {
                                const newMunicipio = (messageDoc.body || '').trim();
                                extraDataToMerge.tempMunicipio = newMunicipio;
                                replyText = `¡Excelente! Ahora, por favor indícame tu **Sección Electoral** (el número de 3 o 4 dígitos de tu INE):`;
                                newBotState = 'esperando_seccional_nuevo';

                            } else if (botState === 'esperando_seccional_nuevo') {
                                const matchSec = (messageDoc.body || '').match(/\b\d{1,4}\b/);
                                if (matchSec) {
                                    const newSec = matchSec[0];
                                    extraDataToMerge.tempSeccional = newSec;
                                    replyText = `¡Registrado! Sección **${newSec}**.\n\nAhora, dime ¿en qué **Colonia o Localidad** vives?`;
                                    newBotState = 'esperando_colonia_nuevo';
                                } else {
                                    replyText = `No logré identificar tu sección electoral. Por favor, escribe solo los números (de 1 a 4 dígitos) que aparecen al frente de tu INE:`;
                                    newBotState = 'esperando_seccional_nuevo';
                                }

                            } else if (botState === 'esperando_colonia_nuevo') {
                                const newCol = (messageDoc.body || '').trim();
                                extraDataToMerge.tempColonia = newCol;
                                replyText = `¡Colonia **"${newCol}"** registrada!\n\nPor favor, dime tu **Calle y Número Exterior** de casa:`;
                                newBotState = 'esperando_calle_nuevo';

                            } else if (botState === 'esperando_calle_nuevo') {
                                const newCalle = (messageDoc.body || '').trim();
                                extraDataToMerge.tempCalle = newCalle;
                                replyText = `¡Domicilio registrado! Si tu domicilio tiene **Número Interior o de departamento**, escríbelo por favor. Si no cuenta con número interior, escribe **"No"**:`;
                                newBotState = 'esperando_numint_nuevo';

                            } else if (botState === 'esperando_numint_nuevo') {
                                const responseBody = (messageDoc.body || '').trim();
                                const lowerResponse = responseBody.toLowerCase();
                                let userNumInt = responseBody;
                                if (lowerResponse === 'no' || lowerResponse === 'ninguno' || lowerResponse === 'n/a' || lowerResponse === 'na' || lowerResponse === 'no tiene' || lowerResponse === 'sin numero interior') {
                                    userNumInt = '';
                                }
                                
                                const chatState = chatDoc.exists() ? chatDoc.data() : {};
                                const tempName = chatState.tempName || name || 'Enlace Ciudadano';
                                const tempSeccional = chatState.tempSeccional || '';
                                const tempColonia = chatState.tempColonia || '';
                                const tempCalle = chatState.tempCalle || '';
                                const tempInvitedBy = chatState.tempInvitedBy || '';
                                const tempMunicipio = chatState.tempMunicipio || '';

                                // Create contact in campaigns/main_campaign/contacts
                                const newContactRef = doc(collection(db, 'campaigns', 'main_campaign', 'contacts'));
                                await setDoc(newContactRef, {
                                    name: tempName,
                                    phone: cleanFromPhone,
                                    seccional: tempSeccional,
                                    colonia: tempColonia,
                                    calle: tempCalle,
                                    numInt: userNumInt,
                                    invitedBy: tempInvitedBy,
                                    municipio: tempMunicipio,
                                    level: 1, // default Voto level
                                    pyramidType: 'votation',
                                    timestamp: serverTimestamp()
                                });

                                extraDataToMerge.datosConfirmados = true;
                                replyText = `¡Felicidades, **${tempName}**! 🎉 He completado tu registro como Enlace Ciudadano en nuestra plataforma oficial. Tu información ha sido guardada de manera segura en el Directorio.\n\nTu participación es sumamente importante para el proyecto de transformación del Senador Heriberto Aguilar. 🏛️✨\n\n¿Hay alguna gestión o petición en la que te podamos ayudar hoy?`;
                                newBotState = 'idle';

                                // Clear temp fields
                                extraDataToMerge.tempName = '';
                                extraDataToMerge.tempSeccional = '';
                                extraDataToMerge.tempColonia = '';
                                extraDataToMerge.tempCalle = '';
                                extraDataToMerge.tempInvitedBy = '';
                                extraDataToMerge.tempMunicipio = '';

                            } else if (botState === 'esperando_motivo') {
                                if (isSupport) {
                                    replyText = `¡Muchísimas gracias por tus palabras y por tu valioso apoyo a nuestro movimiento y al Senador Heriberto Aguilar! 🏛️❤️🎉\n\nTu convicción y participación son el motor de esta gran transformación en Sonora. Organizados y en comunidad seguiremos haciendo historia. 🤝✨\n\n¡Un fuerte abrazo y sigamos adelante! 💪`;
                                    newBotState = 'idle';
                                } else {
                                    if (activeGestion) {
                                        const statusText = activeGestion.status === 'pendiente' ? 'Pendiente 🔴' : 'En Proceso 🟡';
                                        replyText = `Veo que actualmente tienes una petición activa en nuestro sistema:\n\n*📋 Folio de Gestión:* ${activeGestion.folio}\n*📌 Estatus:* ${statusText}\n*📝 Petición:* "${activeGestion.petitionText}"\n\n📞 El número de teléfono oficial de Vinculación es: **662 423 6390**\n\n🔗 Puedes escribirles directamente haciendo clic en el siguiente enlace de WhatsApp para dar seguimiento:\nhttps://wa.me/526624236390?text=Hola,%20le%20doy%20seguimiento%20a%20mi%20Folio%20de%20Gesti%C3%B3n%20${activeGestion.folio}\n\n¡Seguimos a tus órdenes! 🏛️✨`;
                                        newBotState = 'idle';
                                    } else {
                                        replyText = `Entendido. Por favor, **escríbeme detalladamente cuál es tu consulta, petición o el apoyo que necesitas** para poder registrarlo y canalizarlo de forma correcta: 📋`;
                                        newBotState = 'esperando_motivo_peticion';
                                    }
                                }

                            } else if (botState === 'esperando_motivo_peticion') {
                                isReferralToVinculacion = true;
                                newBotState = 'idle';

                            } else if (botState === 'confirmando_datos_ine') {
                                const responseLower = (messageDoc.body || '').toLowerCase().trim();
                                
                                const isNo = responseLower.includes('no ') || 
                                             responseLower === 'no' || 
                                             responseLower.startsWith('no ') || 
                                             responseLower.endsWith(' no') || 
                                             responseLower.includes('incorrecto') || 
                                             responseLower.includes('incorrectos') || 
                                             responseLower.includes('falso') || 
                                             responseLower.includes('tampoco') || 
                                             responseLower.includes('ninguno');

                                const isYes = !isNo && (
                                              responseLower.includes('si') || 
                                              responseLower.includes('sí') || 
                                              responseLower.includes('correcto') || 
                                              responseLower.includes('correctos') || 
                                              responseLower.includes('perfecto') || 
                                              responseLower.includes('perfecta') || 
                                              responseLower.includes('excelente') || 
                                              responseLower.includes('bien') || 
                                              responseLower.includes('ok') || 
                                              responseLower.includes('listo') || 
                                              responseLower.includes('lista') || 
                                              responseLower.includes('de acuerdo') || 
                                              responseLower.includes('enterado') || 
                                              responseLower.includes('1')
                                );

                                const chatState = chatDoc.exists() ? chatDoc.data() : {};
                                
                                if (isYes) {
                                    extraDataToMerge.datosConfirmados = true;
                                    
                                    const tempName = chatState.tempName || '';
                                    const tempSeccional = chatState.tempSeccional || '';
                                    const tempCalle = chatState.tempCalle || '';
                                    const tempColonia = chatState.tempColonia || '';
                                    const tempMunicipio = chatState.tempMunicipio || '';
                                    const tempInvitedBy = chatState.tempInvitedBy || '';
                                    
                                    if (contactData) {
                                        // Update existing contact document
                                        await updateDoc(doc(db, 'campaigns', 'main_campaign', 'contacts', contactDoc.id), {
                                            name: tempName || contactData.name || '',
                                            seccional: tempSeccional || contactData.seccional || '',
                                            calle: tempCalle || contactData.calle || '',
                                            colonia: tempColonia || contactData.colonia || '',
                                            municipio: tempMunicipio || contactData.municipio || '',
                                            invitedBy: tempInvitedBy || contactData.invitedBy || ''
                                        });

                                        replyText = `¡Perfecto! Tus datos del INE han sido confirmados y tu registro está 100% actualizado. Muchas gracias por ayudarnos a mantener nuestro Directorio Ciudadano sólido y al día. 🏛️✨\n\n¿Hay alguna consulta o tema en el que te podamos apoyar el día de hoy?`;
                                        newBotState = 'idle';
                                        
                                        // Clear temps
                                        extraDataToMerge.tempName = '';
                                        extraDataToMerge.tempSeccional = '';
                                        extraDataToMerge.tempCalle = '';
                                        extraDataToMerge.tempColonia = '';
                                        extraDataToMerge.tempMunicipio = '';
                                        extraDataToMerge.tempInvitedBy = '';
                                    } else {
                                        // New user - they must specify InvitedBy and NumInt!
                                        if (!tempInvitedBy) {
                                            replyText = `¡Excelente! He guardado los datos de tu INE.\n\nPara completar tu registro, ¿podrías decirme **quién te invitó** a sumarte a este movimiento o **cómo te enteraste** de este número?`;
                                            newBotState = 'esperando_invitado_nuevo';
                                        } else {
                                            // They already have invitedBy somehow, create the contact!
                                            const newContactRef = doc(collection(db, 'campaigns', 'main_campaign', 'contacts'));
                                            await setDoc(newContactRef, {
                                                name: tempName,
                                                phone: cleanFromPhone,
                                                seccional: tempSeccional,
                                                colonia: tempColonia,
                                                calle: tempCalle,
                                                numInt: '',
                                                invitedBy: tempInvitedBy,
                                                municipio: tempMunicipio,
                                                level: 1,
                                                pyramidType: 'votation',
                                                timestamp: serverTimestamp()
                                            });

                                            replyText = `¡Felicidades! 🎉 He completado tu registro como Enlace Ciudadano en nuestra plataforma oficial. Tu información ha sido guardada de manera segura en el Directorio.\n\nTu participación es sumamente importante para el proyecto de transformación del Senador Heriberto Aguilar. 🏛️✨\n\n¿Hay alguna gestión o petición en la que te podamos ayudar hoy?`;
                                            newBotState = 'idle';
                                            
                                            // Clear temps
                                            extraDataToMerge.tempName = '';
                                            extraDataToMerge.tempSeccional = '';
                                            extraDataToMerge.tempCalle = '';
                                            extraDataToMerge.tempColonia = '';
                                            extraDataToMerge.tempMunicipio = '';
                                            extraDataToMerge.tempInvitedBy = '';
                                        }
                                    }
                                } else {
                                    // Redirect to correction parser
                                    extraDataToMerge.botState = 'confirmando_datos_existentes';
                                    newBotState = 'confirmando_datos_existentes';
                                    replyText = `Entendido. Escribe exactamente qué dato deseas cambiar (ej. *nombre*, *dirección*, *sección electoral*):`;
                                }

                            } else if (botState === 'saludado') {
                                const responseLower = (messageDoc.body || '').toLowerCase().trim();
                                const askedBack = responseLower.includes('y tu') || responseLower.includes('y tú') || responseLower.includes('y usted') || responseLower.includes('que tal');
                                const greetingStatus = askedBack ? '¡Muy bien, muchas gracias por preguntar! 😊' : '¡Me alegro mucho! 😊';
                                replyText = `${greetingStatus} Cuéntame, ¿cuál es el motivo de tu mensaje? 🏛️✨\n\n📋 ¿Tienes alguna **consulta o petición** para el Senador Heriberto Aguilar?\n❤️ ¿O deseas enviarnos un **saludo de apoyo** al movimiento?`;
                                newBotState = 'esperando_motivo';

                            } else {
                                // Default / IDLE state
                                if (!replyText) {
                                    if (contactData) {
                                        extraDataToMerge.contactId = contactDoc.id;
                                        
                                        if (isPetition) {
                                            if (activeGestion) {
                                                const statusText = activeGestion.status === 'pendiente' ? 'Pendiente 🔴' : 'En Proceso 🟡';
                                                replyText = `Veo que actualmente tienes una petición activa en nuestro sistema:\n\n*📋 Folio de Gestión:* ${activeGestion.folio}\n*📌 Estatus:* ${statusText}\n*📝 Petición:* "${activeGestion.petitionText}"\n\n📞 El número de teléfono oficial de Vinculación es: **662 423 6390**\n\n🔗 Puedes escribirles directamente haciendo clic en el siguiente enlace de WhatsApp para dar seguimiento:\nhttps://wa.me/526624236390?text=Hola,%20le%20doy%20seguimiento%20a%20mi%20Folio%20de%20Gesti%C3%B3n%20${activeGestion.folio}\n\n¡Seguimos a tus órdenes! 🏛️✨`;
                                                newBotState = 'idle';
                                            } else {
                                                replyText = `Entendido. Por favor, **escríbeme detalladamente cuál es tu consulta, petición o el apoyo que necesitas** para poder registrarlo y canalizarlo de forma correcta: 📋`;
                                                newBotState = 'esperando_motivo_peticion';
                                            }
                                        } else if (!hasConfirmedDetails) {
                                            // Greet and trigger detailed data confirmation
                                            const nameStr = contactData.name || 'Enlace';
                                            const secStr = contactData.seccional || 'Faltante 🔴';
                                            const calleStr = contactData.calle || 'Faltante 🔴';
                                            const colStr = contactData.colonia || 'Faltante 🔴';
                                            const munStr = contactData.municipio || 'Faltante 🔴';
                                            const numIntStr = contactData.numInt ? ` (Int: ${contactData.numInt})` : '';
                                            const invStr = contactData.invitedBy || 'No especificado 🔴';
                                            
                                            replyText = `¡Hola, **${nameStr.split(' ')[0]}**! 👋 Veo que ya estás registrado(a) en nuestra red ciudadana como Enlace.\n\nPor seguridad y para mantener nuestra base de datos sólida y actualizada, ¿podrías confirmarnos si tus datos actuales son correctos? 🗳️\n\n*👤 Nombre:* ${nameStr}\n*🗳️ Sección Electoral:* ${secStr}\n*📍 Dirección:* Calle ${calleStr}${numIntStr}, Col. ${colStr}, ${munStr}\n*👥 Invitado por:* ${invStr}\n\n¿Son correctos tus datos o deseas actualizarlos? Escribe **"Sí, son correctos"** o **"Actualizar"**:`;
                                            newBotState = 'confirmando_datos_existentes';
                                        } else {
                                            // Already confirmed, run standard support/petition flows
                                            if (isSupport) {
                                                const firstName = contactData.name.split(' ')[0];
                                                replyText = `¡Muchísimas gracias por tu valioso apoyo, **${firstName}**! 🏛️❤️ Tu convicción es el motor de esta gran transformación en Sonora. Organizados seguiremos haciendo historia con el Senador Heriberto Aguilar. ¡Un fuerte abrazo! 💪`;
                                                newBotState = 'idle';
                                            } else {
                                                if (!isRecentlyReplied || isBreakoutIntent) {
                                                    const firstName = contactData.name.split(' ')[0];
                                                    replyText = `¡Hola, **${firstName}**! 👋 Qué gusto saludarte de nuevo. ¿Cómo te encuentras hoy? 😊`;
                                                    newBotState = 'saludado';
                                                }
                                            }
                                        }
                                    } else {
                                        // Contact NOT found by phone number
                                        replyText = `¡Hola! 👋 Te saluda el Asistente Virtual del Senador Heriberto Aguilar. Veo que nos escribes desde este número pero aún no lo tenemos registrado en nuestra red ciudadana.\n\n¿Ya te habías registrado anteriormente con otro número de teléfono o eres un nuevo integrante? 🗳️\n\nEscribe:\n1️⃣ **"Ya me registré"** (si usaste otro número)\n2️⃣ **"Soy nuevo"** (si deseas registrarte hoy)`;
                                        newBotState = 'validando_telefono';
                                    }
                                }
                            }
                        }
                        }

                        // Generate Folio and refer if needed
                        if (isReferralToVinculacion) {
                            const randomFolio = 'GS-' + Math.floor(1000 + Math.random() * 9000);
                            try {
                                await addDoc(collection(db, 'campaigns', 'main_campaign', 'gestiones'), {
                                    folio: randomFolio,
                                    phone: from,
                                    name: contactData?.name || name,
                                    municipio: contactData?.municipio || '',
                                    seccional: contactData?.seccional || '',
                                    petitionText: messageDoc.body || '',
                                    status: 'pendiente',
                                    priority: 'baja',
                                    assignedTo: '',
                                    notes: '',
                                    timestamp: serverTimestamp()
                                });
                            } catch (dbErr) {
                                console.error('Error saving gestion to Firestore CRM collection:', dbErr);
                            }
                            replyText = `¡Listo! He registrado tu caso con el **Folio de Gestión: ${randomFolio}** y lo he canalizado con nuestro equipo de Vinculación. 📋\n\n📞 El número de teléfono oficial de Vinculación es: **662 423 6390**\n\n🔗 Puedes escribirles directamente haciendo clic en el siguiente enlace de WhatsApp:\nhttps://wa.me/526624236390?text=Hola,%20mi%20Folio%20de%20Gesti%C3%B3n%20es%20${randomFolio}\n\nComo Enlace Ciudadano registrado del Senador Heriberto Aguilar, tu participación es sumamente importante para nosotros. Sigamos en comunicación por esta vía para mantenerte al tanto de las actividades y coordinar nuestro apoyo en territorio. ¡Que tengas un excelente día! 🏛️✨`;
                        }

                        // Send the reply if we constructed one
                        if (replyText) {
                            const payload = {
                                messaging_product: 'whatsapp',
                                to: cleanTo,
                                type: 'text',
                                text: { body: replyText }
                            };

                            try {
                                const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `Bearer ${token}`,
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify(payload)
                                });

                                if (response.ok) {
                                    const replyDoc = {
                                        body: replyText,
                                        to: from,
                                        type: 'text',
                                        direction: 'outbound',
                                        timestamp: serverTimestamp()
                                    };
                                    await addDoc(messagesRef, replyDoc);
                                    await setDoc(chatRef, {
                                        ...extraDataToMerge,
                                        lastMessage: `🤖 Auto-respuesta: Conversación estado [${newBotState}]`,
                                        lastMessageAt: serverTimestamp(),
                                        botState: newBotState
                                    }, { merge: true });
                                }
                            } catch (err) {
                                console.error('Error sending conversational chatbot reply:', err);
                            }
                        }
                    }
                  }
              }
              return new NextResponse('EVENT_RECEIVED', { status: 200 });
          } else {
              return new NextResponse('Not Found', { status: 404 });
          }
      } catch (error) {
          console.error('Error handling webhook:', error);
          return new NextResponse('Internal Server Error', { status: 500 });
      }
  }
