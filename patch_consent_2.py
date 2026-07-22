import os

file_path = r'c:\Users\ENRIQ\OneDrive\Documents\Paginas web\Sonorenses_al_100\app\api\whatsapp\webhook\route.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update isRegistration logic
target_1 = """                    const isRegistration = msgType === 'text' && messageDoc.body && (
                        messageDoc.body.includes('Me acabo de registrar') ||
                        messageDoc.body.includes('Folio:') ||
                        (contactDoc && !existingConsent)
                    );"""

replacement_1 = """                    const isRegistration = msgType === 'text' && messageDoc.body && (
                        messageDoc.body.includes('Me acabo de registrar') ||
                        messageDoc.body.includes('Folio:') ||
                        (contactData && contactData.justRegistered === true)
                    );"""

content = content.replace(target_1, replacement_1)

# 2. Update sendConsentPromptIfNeeded logic
target_2 = """                    const sendConsentPromptIfNeeded = async () => {
                        if (contactDoc && existingConsent !== 'yes' && !isRegistration && !isButtonSelection && msgType === 'text') {
                            const firstName = name.split(' ')[0] || 'Hola';
                            const consentPrompt = isTournamentReg 
                                ? `Para brindarte la mejor atención y asegurar una comunicación fluida sobre horarios, sedes y roles de juego, por favor realiza dos sencillas acciones:\\n\\n1️⃣ **Guarda este número** en tus contactos como **Actividades del Aspirante a la Coordinación Estatal en Defensa de la Transformación y Soberanía Nacional en Sonora, Javier Lamarque** 📲.\\n\\n2️⃣ **Autorización de Difusión:** ¿Nos das tu consentimiento para enviarte mensajes informativos sobre el torneo y actividades comunitarias del Aspirante a la Coordinación Estatal en Defensa de la Transformación y Soberanía Nacional en Sonora, Javier Lamarque? ✅`
                                : `Para brindarte la mejor atención y asegurar una comunicación fluida, por favor realiza dos sencillas acciones:\\n\\n1️⃣ **Guarda este número** en tus contactos como **Enlace del Aspirante a la Coordinación Estatal en Defensa de la Transformación y Soberanía Nacional en Sonora, Javier Lamarque** 📲.\\n\\n2️⃣ **Autorización de Difusión:** Para compartirte información de interés sobre el movimiento y las actividades del Aspirante a la Coordinación Estatal en Defensa de la Transformación y Soberanía Nacional en Sonora, Javier Lamarque, ¿nos das tu consentimiento para enviarte mensajes informativos y de difusión? ✅`;
                            
                            const payload = {
                                messaging_product: 'whatsapp',
                                to: cleanTo,
                                type: 'interactive',
                                interactive: {
                                    type: 'button',
                                    body: { text: consentPrompt },
                                    action: {
                                        buttons: [
                                            { type: 'reply', reply: { id: 'consent_yes', title: 'Sí, acepto ✅' } },
                                            { type: 'reply', reply: { id: 'consent_no', title: 'No, gracias' } }
                                        ]
                                    }
                                }
                            };
                            try {
                                const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
                                    method: 'POST',
                                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                    body: JSON.stringify(payload)
                                });
                                if (response.ok) {
                                    await setDoc(chatRef, { lastMessage: '🤖 Auto-respuesta con botones de consentimiento enviada' }, { merge: true });
                                }
                            } catch (err) {
                                console.error('Error sending secondary consent prompt:', err);
                            }
                        }
                    };"""

replacement_2 = """                    const sendConsentPromptIfNeeded = async () => {
                        // Always send prompt if they haven't explicitly said 'yes' (even if 'no', so we can ask again as requested, or if empty)
                        // But don't send if they are currently clicking a button.
                        if (contactDoc && existingConsent !== 'yes' && !isRegistration && !isButtonSelection && msgType === 'text') {
                            const consentPrompt = `Para brindarte la mejor atención y mantenerte al tanto, por favor confirma lo siguiente:\\n\\n¿Nos das tu consentimiento para enviarte mensajes informativos y de difusión sobre nuestras actividades? ✅`;
                            
                            const payload = {
                                messaging_product: 'whatsapp',
                                to: cleanTo,
                                type: 'interactive',
                                interactive: {
                                    type: 'button',
                                    body: { text: consentPrompt },
                                    action: {
                                        buttons: [
                                            { type: 'reply', reply: { id: 'consent_yes', title: 'Sí, acepto ✅' } },
                                            { type: 'reply', reply: { id: 'consent_no', title: 'No, gracias' } }
                                        ]
                                    }
                                }
                            };
                            try {
                                const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
                                    method: 'POST',
                                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                    body: JSON.stringify(payload)
                                });
                                if (response.ok) {
                                    // Don't overwrite lastMessage so the dashboard still sees their last real message
                                }
                            } catch (err) {
                                console.error('Error sending secondary consent prompt:', err);
                            }
                        }
                    };"""

content = content.replace(target_2, replacement_2)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
