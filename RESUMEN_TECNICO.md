# Resumen Técnico: Sonorenses al 100 🚀

Este documento sirve como registro completo de todo el contexto, la arquitectura y las configuraciones realizadas durante la Fase 1 del proyecto. **Conserva este archivo para dárselo como contexto a cualquier asistente de IA en el futuro.**

## 1. Arquitectura General
- **Framework:** Next.js (App Router) con TypeScript y Tailwind CSS.
- **Base de Datos:** Firebase Firestore (Almacena registros de ciudadanos, chats y logs).
- **Inteligencia Artificial:** Google Gemini (gemini-2.5-flash) para procesamiento de lenguaje natural y extracción de datos del INE.
- **Canal de Comunicación:** WhatsApp Business API oficial conectada mediante Webhooks.
- **Hosting:** Vercel (Dominio oficial: `sonorensesal100.com`).
- **Repositorio:** GitHub (`Envapa08241978/sonorenses_al_100`).

## 2. Configuración de WhatsApp y Vercel
El bot funciona leyendo variables de entorno seguras alojadas en Vercel. Nunca se debe codificar (hardcodear) ninguna llave en el código público.

**Variables configuradas en Vercel:**
- `WEBHOOK_VERIFY_TOKEN`: `Sonorenses2027`
- `GEMINI_API_KEY`: Llave de Google AI Studio.
- `WHATSAPP_TOKEN`: Token de acceso de Meta Developers.
- `WHATSAPP_PHONE_NUMBER_ID`: Identificador del número de Meta.
- *Variables estándar de Firebase (`NEXT_PUBLIC_FIREBASE_API_KEY`, etc).*

**Configuración en Meta Developers:**
- **App:** Sonorenses al 100 (Business App).
- **Webhook URL:** `https://sonorenses-al-cien.vercel.app/api/whatsapp/webhook`
- **Suscripción:** Campo `messages` activado.

## 3. Flujo del Chatbot de WhatsApp
El código que controla al bot vive en `app/api/whatsapp/webhook/route.ts`. 

**Habilidades del Bot:**
1. **Atención General:** Responde dudas sobre los eventos del candidato Javier Lamarque.
2. **Registro de Enlaces:** Si el usuario quiere unirse, solicita Nombre, o permite enviar una foto de la credencial del INE.
3. **Visión Artificial:** Si recibe una imagen, se la envía a Gemini para que transcriba la dirección, clave de elector, nombre y demás datos, y los guarde automáticamente en Firebase (colección `contacts`).
4. **Registro a Eventos:** Inscribe ciudadanos al "Torneo de Dominadas en mi Barrio" y les genera un folio.
5. **Re-conexión:** Detecta si un usuario cambia de teléfono vinculando su registro anterior de 10 dígitos.

## 4. Próximos Pasos Recomendados (Backlog)
- **Token Permanente de Meta:** El token que sacaste hoy es "Temporal" y caduca en 24 horas. Para que el bot nunca deje de mandar mensajes, tendrás que generar un Token Permanente (desde Facebook Business Settings > System Users) y actualizar ese valor en Vercel.
- Extender la página web con las fotos oficiales y calendarios dinámicos.
- Crear un panel de administración (Dashboard) privado para ver a todos los ciudadanos registrados directamente desde la web.

---
*Fin del reporte de la Fase 1. ¡Gran trabajo!*
