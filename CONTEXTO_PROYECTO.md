# Contexto de Proyecto: Sistema de Votantes para el Estado de Sonora

Este documento sirve como bitácora y guía técnica para futuras sesiones de desarrollo y mantenimiento. Contiene la arquitectura del sistema, el flujo de integración del chatbot, el funcionamiento del CRM de Vinculación y las configuraciones clave de bases de datos.

---

## 🏛️ Descripción General
El sistema es una plataforma integral diseñada para la campaña y vinculación comunitaria del **Senador Heriberto Aguilar** en el estado de Sonora. Permite:
1. El registro organizado de ciudadanos y enlaces territoriales (Estructuras de votación y defensa).
2. El seguimiento estratégico a través de un Dashboard Administrativo modular y georreferenciado.
3. La interacción automatizada e inteligente con la ciudadanía mediante un **Chatbot de WhatsApp (Meta Cloud API)**.
4. El procesamiento y resolución de peticiones ciudadanas a través de un **CRM de Vinculación y Gestión** en la ruta `/vinculacion`.

---

## 🛠️ Stack Tecnológico
*   **Framework Principal:** Next.js (App Router, React, TypeScript).
*   **Base de Datos y Seguridad:** Firebase (Firestore para base de datos NoSQL y Firebase Authentication para control de acceso administrativo).
*   **Estilos y UI:** TailwindCSS, CSS moderno con efectos premium (Glassmorphism, gradientes institucionales y animaciones sutiles).
*   **Procesamiento de Archivos:** `xlsx` para la exportación avanzada de reportes a Excel.
*   **Integración de Mensajería:** WhatsApp Business Cloud API (Meta) para envío y recepción de mensajes multimedia e interactivos.

---

## 📁 Estructura del Código y Rutas Clave

### 1. Panel de Vinculación (CRM)
*   **Ruta:** `/vinculacion`
*   **Archivo:** `app/vinculacion/page.tsx`
*   **Funcionalidades:**
    *   **Acceso Seguro:** Protegido mediante Firebase Auth.
    *   **Métricas en Tiempo Real:** Tarjetas con el total de casos, pendientes 🔴, en proceso 🟡 y resueltos 🟢.
    *   **Filtros Cruzados:** Búsqueda textual (folio, nombre, petición) combinada con Estatus, Prioridad, Municipio y Responsable.
    *   **Bloc de Notas de Seguimiento:** Notas internas persistentes para avances.
    *   **Exportador:** Descarga el listado filtrado en Excel (`.xlsx`).

### 2. Formularios de Registro (Web)
*   **Ruta:** `/e/[eventId]` y `/registro`
*   **Archivo:** `app/e/[eventId]/RegistroClient.tsx` y `app/registro/page.tsx`
*   **Funcionalidades:**
    *   **Re-registro y Actualización (Verificación):** Permite a ciudadanos ya registrados volver a llenar el formulario para actualizar sus datos (Nombre, Dirección, Seccional) y disparar el mensaje de WhatsApp. El sistema **protege** inteligentemente al brigadista original (`parentId`, `level`) para que la estructura territorial no se rompa aunque se registren con la liga de otra persona.
    *   **Manejo Inteligente de Folios:** 
        *   **Eventos:** Genera o reutiliza folios `PR-XXXX`.
        *   **Brigadeo:** Crea un registro de control interno sin folio visible, para mantener limpio el flujo de WhatsApp.
    *   **QR Global de Eventos (`/registro`):** Actúa como un switch maestro. Para evitar que se generen y filtren ligas permanentes (`/e/[eventId]`) que los usuarios puedan guardar y usar cuando el evento ya fue apagado, la ruta `/registro` **no redirige**. En su lugar, absorbe y renderiza dinámicamente el contenido del evento activo. Si el evento se apaga en el dashboard, `/registro` vuelve instantáneamente a su vista por defecto (`evento-demo`) sin cambiar la URL en el navegador del usuario.
    *   **Nota Técnica sobre Next.js y Redirecciones:** En Next.js, la función `redirect()` lanza un error interno llamado `NEXT_REDIRECT`. Si esta función se ejecuta dentro de un bloque `try/catch`, el `catch` atrapará silenciosamente la redirección, cancelándola y continuando la ejecución del código. Las llamadas a `redirect()` siempre deben ir fuera de los bloques `try/catch`.

### 3. Chatbot de WhatsApp y Meta API
*   **Ruta:** `/api/whatsapp/webhook`
*   **Privacidad y Contactos:** **La API de WhatsApp Cloud no almacena contactos como una agenda tradicional.** Todos los contactos se guardan de forma privada y segura en **Firebase Firestore**, lo que garantiza la propiedad total de la base de datos por parte de la campaña.
*   **Identidad en Meta:** 
    *   *Display Name:* Nombre público de la línea (Ej. "Heriberto Aguilar").
    *   *WABA Name:* Nombre interno de la cuenta comercial (Ej. "Heriberto Crm").
*   **Restricciones de Plantillas y Enlaces Multimedia (Imágenes):**
    *   Cuando una plantilla (ej. `invitacion_eventos`) es aprobada con un **Header de tipo Imagen**, es OBLIGATORIO enviarle una imagen. De lo contrario, Meta la rechaza (`#131009 Parameter value is not valid`).
    *   La URL de la imagen **debe terminar forzosamente en la extensión del archivo** (ej. `.png`, `.jpg`).
    *   La URL **no puede apuntar a servidores que bloqueen bots** (ej. WordPress con Wordfence o bloqueos anti-scrapping). Si Meta no puede acceder o descargar la imagen (por un Error 400 o un bloqueo HTTP), la API de Meta aceptará la solicitud con un código `200 OK` (aprobación silenciosa) pero **desechará el mensaje internamente** y el mensaje nunca llegará al usuario. Para pruebas seguras, usar imágenes en servidores públicos (`google.com`, `firebase`, `imgur`, etc.).
*   **Mensajería Masiva (Arquitectura Futura):** Para envíos masivos (difusión), el sistema requerirá el uso de **Plantillas Aprobadas por Meta**. El flujo consistirá en: segmentar la base de datos desde Firebase, seleccionar la plantilla aprobada, y orquestar el envío secuencial a través de la API, respetando los límites diarios (Tiers) y costos por conversación de Meta.

### 4. Dashboard Modularizado
*   **Ruta:** `/registro-dashboard`
*   **Subcomponentes (Modularizados):** Ubicados en `app/registro-dashboard/components/`.
    *   `DirectoryTab.tsx`: Tabla del directorio de votantes con paginación de 50 registros por página.
    *   `ChatTab.tsx`: Centro de mensajería bidireccional de WhatsApp en vivo.
    *   `MapTab.tsx`: Mapa georreferenciado con carga diferida del GeoJSON (7MB).
    *   `EventsTab.tsx`: Gestión de eventos, pre-registros y control territorial.
    *   `BroadcastTab.tsx`: Módulo proyectado para el envío de mensajes masivos con plantillas autorizadas.

---

## 🗃️ Estructura en Firebase Firestore

### Colección: `campaigns/main_campaign/gestiones`
Documentos representativos de casos del CRM de Vinculación. Formato de folio: `GS-XXXX`.

### Colección: `campaigns/main_campaign/contacts`
Base de datos central de ciudadanos y estructura territorial. Es la "agenda" oficial del sistema, independiente de Meta.

---

## 🚀 Despliegue y Mantenimiento

*   **Repositorio Git:** `https://github.com/Envapa08241978/sistema-votantes-sonora.git`
*   **Rama Principal:** `main` (Cualquier push a esta rama activa un pipeline automático en Vercel).
*   **Comando de Validación:**
    ```bash
    npx tsc --noEmit
    npm run build
    ```
*   **Variables de Entorno Requeridas:**
    *   `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WEBHOOK_VERIFY_TOKEN`
    *   Variables de configuración de Firebase (`NEXT_PUBLIC_FIREBASE_API_KEY`, etc.).

---

## 👥 Capacitación y Flujo de Brigadeo (Presentación PPTX)
Para la capacitación del equipo territorial, se cuenta con una presentación en PowerPoint `capacitacion_brigadistas.pptx` generada y mantenida con scripts locales. El flujo de brigadeo y sus especificaciones técnicas de cara al chatbot y CRM incluyen:
1. **Acceso con Enlace Único:** Cada brigadista comparte su liga personalizada (ej. `?ref=naXhG8Fn2Iso1qOlerf5`). El ciudadano debe escanear el QR o abrir el enlace **únicamente desde su propio teléfono celular** para evitar mezclar sesiones de WhatsApp. El formulario web muestra un banner superior confirmando quién es su líder (`parentName`).
2. **Sección Electoral:** Se debe indicar la sección electoral de 3 o 4 dígitos de la credencial INE omitiendo cualquier "0" a la izquierda.
3. **Flujo Conversacional de WhatsApp y Autorización:** Al registrarse, el ciudadano envía un mensaje al chatbot en WhatsApp. El chatbot saluda, valida y **solicita obligatoriamente la Autorización de Difusión**, la cual el votante debe aceptar para concluir el alta.
4. **Flujo de Peticiones y Gestión (Vinculación):** Para iniciar una petición, el ciudadano debe escribir la palabra clave **"petición"** (o similar) en el chat. El bot le solicitará los detalles, generará el folio `GS-XXXX` y enviará el caso de inmediato al CRM de Vinculación (`/vinculacion`).

---

## 🤖 Máquina de Estados del Chatbot (Bot State Machine)

El chatbot de WhatsApp (`app/api/whatsapp/webhook/route.ts`) opera con una **máquina de estados finitos** almacenada en Firestore (`chats/{phone}.botState`). Cada mensaje entrante se evalúa según el estado actual del bot para determinar la respuesta y la transición al siguiente estado.

### Estados del Bot (`botState`)

| Estado | Descripción |
|--------|-------------|
| `idle` | Estado base. El bot evalúa el intent del mensaje con Gemini para decidir el flujo. |
| `saludado` | Se envió un saludo al usuario. Espera respuesta casual o petición. |
| `esperando_motivo` | Se le preguntó al usuario por qué escribe. Evalúa intent para rutar. |
| `esperando_motivo_peticion` | **Estado crítico.** El bot ya pidió los detalles de la petición. Todo lo que el usuario escriba aquí se convierte en folio `GS-XXXX` y se envía a Vinculación, **excepto saludos triviales exactos** (hola, ok, gracias, etc.). |
| `confirmando_datos_existentes` | Se mostraron los datos actuales del contacto y se espera confirmación (Sí/No/Actualizar). |
| `confirmando_datos_ine` | Se extrajeron datos de una foto de INE con OCR Gemini y se espera confirmación. |
| `preguntando_que_actualizar` | Se le mostró el menú de opciones de qué campo actualizar (1-6). |
| `actualizando_nombre` | Esperando que escriba su nombre completo nuevo. |
| `esperando_invitado` / `esperando_invitado_nuevo` | Esperando quién lo invitó al movimiento. |
| `esperando_municipio` / `esperando_municipio_nuevo` | Esperando municipio de residencia. |
| `esperando_seccional` / `esperando_seccional_nuevo` | Esperando sección electoral (1-4 dígitos). |
| `esperando_colonia` / `esperando_colonia_nuevo` | Esperando colonia/localidad. |
| `esperando_calle` / `esperando_calle_nuevo` | Esperando calle y número exterior. |
| `esperando_numint` / `esperando_numint_nuevo` | Esperando número interior (o "No"). |
| `validando_telefono` | Preguntando si el usuario ya se registró con otro número o es nuevo. |
| `esperando_telefono_anterior` | Esperando el número de 10 dígitos con el que se registró antes. |
| `esperando_nombre_nuevo` | Esperando nombre completo para nuevo registro manual. |

### Flujo de Decisión por Mensaje Entrante

El webhook procesa los mensajes en este orden de prioridad:

1. **¿Es un registro web?** (`"Me acabo de registrar"` o `"Folio:"`) → Flujo de bienvenida + consentimiento.
2. **¿Es un clic en botón de consentimiento?** (`consent_yes` / `consent_no`) → Guardar consentimiento en Firestore.
3. **Todo lo demás** → Entra a la máquina de estados conversacional.

### Clasificación de Intenciones con Gemini (`gemini-2.5-flash`)

Cuando el bot está en estados conversacionales (`idle`, `saludado`, `esperando_motivo`, o sin estado), se usa **Google Gemini** para clasificar semánticamente el mensaje del usuario en una de 4 categorías:

| Intent | Descripción | Ejemplo |
|--------|-------------|---------|
| `peticion` | Solicitud de apoyo social, reporte de problema, gestión | "Quiero cambiar el nombre en mi recibo de agua" |
| `apoyo_saludo` | Saludos, bendiciones, felicitaciones, frases de aliento | "Ánimo senador, estamos con usted" |
| `actualizar_datos` | Petición explícita de editar datos personales de registro INE | "Quiero actualizar mi dirección de registro" |
| `charla_general` | Plática casual, preguntas generales | "Hola, cómo estás?" |

**⚠️ REGLA CRÍTICA:** La clasificación de Gemini **solo se aplica en estados conversacionales abiertos** (`idle`, `saludado`, `esperando_motivo`). En estados dirigidos como `esperando_motivo_peticion`, el contexto conversacional ya está establecido y NO se re-clasifica con Gemini. Esto previene que Gemini descarte peticiones legítimas como "charla_general".

**⚠️ DIFERENCIA CLAVE:** "Quiero cambiar el nombre en mi recibo de agua" es una **petición** (gestión ciudadana), NO `actualizar_datos`. El intent `actualizar_datos` es exclusivamente para cambiar los datos del INE del propio registro del ciudadano en el sistema.

### Protecciones Anti-Hijacking de Saludos

Para evitar que saludos simples ("HOLA", "COMO ESTAS?") generen folios de gestión o manden al usuario a Vinculación, se implementaron las siguientes protecciones:

1. **Estado `saludado`:** En vez de forzar `esperando_motivo` con un menú rígido, ahora responde naturalmente con Gemini. Solo ruta a peticiones si Gemini explícitamente clasifica como `peticion`.
2. **Estado `esperando_motivo`:** Acepta tanto `charla_general` como `apoyo_saludo` como categorías de no-petición y responde con Gemini de forma natural.
3. **Estado `esperando_motivo_peticion`:** Solo filtra saludos triviales **por coincidencia exacta** en una lista fija (`hola`, `ok`, `gracias`, `como estas`, etc.). Todo lo demás genera folio. No usa Gemini para re-clasificar.
4. **Rama `idle` (default):** Protección extra para mensajes triviales cortos (<20 caracteres) que estén en una lista de saludos comunes, evitando que entren al flujo de peticiones aunque Gemini los clasifique mal.

---

## 🏆 Soporte para Torneo de Dominadas ("En mi Barrio")

El chatbot detecta automáticamente registros provenientes del **Torneo de Dominadas** cuando el mensaje contiene `"Torneo de Dominadas"`:

*   **Saludo Personalizado:** En lugar del mensaje político estándar, se envía uno enfocado en el deporte y la convivencia juvenil.
*   **Consentimiento Adaptado:** El texto de autorización habla sobre "horarios, sedes y roles de juego" en vez de actividades políticas.
*   **Persistencia:** Se guarda `isTournament: true` en el chat de Firestore para que respuestas posteriores (como el clic en botones de consentimiento) también se adapten al contexto deportivo ("¡Nos vemos en la cancha! ⚽🏆").

---

## ✅ Sistema de Consentimiento Estructurado

El consentimiento de difusión se almacena de forma estructurada en Firestore:

*   **Campos:** `consent: 'yes' | 'no'` y `consentTimestamp` en ambos documentos: `contacts/{contactId}` y `chats/{phone}`.
*   **Prevención de Prompts Duplicados:** Antes de enviar botones interactivos de consentimiento, el bot verifica si ya existe un consentimiento previo. Si lo hay, se omiten los botones y se envía un texto plano de confirmación.
*   **Flujo de Botones Interactivos:** Se envían dos botones (`consent_yes` = "Sí, acepto ✅" y `consent_no` = "No, gracias") como `interactive/button` de la API de Meta.

---

## 📷 OCR de Credencial INE con Gemini Vision

El chatbot puede recibir una **foto de la credencial INE** y extraer automáticamente los datos usando Gemini Vision (`gemini-2.5-flash`):
*   **Campos extraídos:** Nombre completo, sección electoral (sin ceros a la izquierda), calle y número, colonia, municipio.
*   **Flujo:** La imagen se descarga desde la API de Meta, se convierte a base64, se envía a Gemini con un prompt de extracción JSON, y los datos se presentan al usuario para confirmación antes de guardarlos.

---

## 🧹 Sanitización de Campos con Gemini

*   **Campo `invitedBy` (Quién te invitó):** Si la respuesta del usuario tiene más de 50 caracteres, se usa Gemini para extraer únicamente el nombre propio del líder/brigadista, descartando párrafos conversacionales largos que podrían guardarse en el campo.

---

## 🔄 Bitácora de Sincronización de Base de Datos
*   **Alineación de campos Leader/Inviter:** Se sincronizaron en paralelo los campos `parentName` e `invitedBy` en Firestore. Toda creación o edición en el formulario web o en el chatbot de WhatsApp actualiza ambos campos por igual, garantizando que el Directorio muestre correctamente la estructura y líderes sin registros vacíos.

---

## 🐛 Bugs Conocidos y Resueltos (Bitácora)

### Bug 1: Saludos generaban Folios de Gestión (10 Jun 2026)
*   **Síntoma:** Un usuario escribía "HOLA" y "COMO ESTAS?" y el bot le creaba un Folio de Gestión `GS-XXXX` y lo mandaba a Vinculación.
*   **Causa Raíz:** El estado `saludado` forzaba siempre al estado `esperando_motivo` con un menú rígido. Si el usuario respondía algo que no era "apoyo_saludo" según Gemini, caía al flujo de peticiones. Además, el estado `esperando_motivo_peticion` era un "hoyo negro" que convertía CUALQUIER mensaje en un folio sin verificar nada.
*   **Solución:** (1) El estado `saludado` ahora responde naturalmente con Gemini. (2) `esperando_motivo` acepta `charla_general` como no-petición. (3) En `idle` se protegen mensajes triviales cortos. (4) Se añadió lista de saludos exactos en `esperando_motivo_peticion`.

### Bug 2: Peticiones legítimas descartadas en `esperando_motivo_peticion` (10 Jun 2026)
*   **Síntoma:** Juana escribió "Petición programa de fortalecimiento económico..." → bot pidió detalles → Juana escribió "Requiero información sobre los programas del bienestar para familias vulnerables" → bot respondió "Si necesitas una petición, escríbenos" en vez de crear el folio.
*   **Causa Raíz:** El fix del Bug 1 re-clasificaba con Gemini el mensaje de detalle de la petición, y Gemini lo clasificó como `charla_general`, descartándolo.
*   **Solución:** En `esperando_motivo_peticion`, **NO se re-clasifica con Gemini**. El contexto ya está establecido (el bot explícitamente pidió los detalles). Todo lo que el usuario escriba genera folio, excepto saludos triviales exactos por lista fija.

---

## 🚀 Despliegue y Mantenimiento

*   **Repositorio Git:** `https://github.com/Envapa08241978/sistema-votantes-sonora.git`
*   **Rama Principal:** `main` (Cualquier push a esta rama activa un pipeline automático en Vercel).
*   **Dominio Personalizado:** `https://www.heribertoaguilarcastillo.com` — configurado como alias en el dashboard de Vercel.
*   **Proyecto Vercel:** `volatile-filament` bajo el team `enriques-projects-448516ab`.
*   **Comando de Validación:**
    ```bash
    npx tsc --noEmit
    npm run build
    ```
*   **Variables de Entorno Requeridas:**
    *   `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WEBHOOK_VERIFY_TOKEN`
    *   `GEMINI_API_KEY` (para clasificación de intenciones y OCR de INE con Gemini)
    *   Variables de configuración de Firebase (`NEXT_PUBLIC_FIREBASE_API_KEY`, etc.).

---

## 📈 Difusión, Sistema RSVP y Coherencia de Eventos (13 Jun 2026)

Se implementó una arquitectura integral para la difusión segmentada y la gestión de confirmaciones de asistencia (RSVP) a eventos desde WhatsApp y el Dashboard:

### 1. Difusión Segmentada en Dashboard
*   Se agregó la pestaña de **Difusión** con filtros segmentados para el **Torneo de Dominadas** (`source === 'dominadas_registration'`) y el **Espectáculo Delfinario (Guaymas)** (asistentes registrados en ese evento).

### 2. Flujo RSVP y Estatus de Registros
*   **Botones Interactivos de Meta:** Respuestas rápidas de botones interactivos (`event_confirm_yes` y `event_confirm_no`) se capturan en el webhook de WhatsApp y actualizan o crean un registro de confirmación en la subcolección `pre_registros` bajo el evento activo de Firestore (`status: 'confirmado'` o `'no_asistira'`).
*   **Formulario Web:** El archivo `RegistroClient.tsx` registra con `status: 'registrado'`.
*   **Invitación Individual:** Al enviar una invitación desde el dashboard, se crea un pre-registro inicial con `status: 'invitado'`.
*   **Reportes en Dashboard:** El modal de pre-registros visualiza los estatus en insignias de colores e incluye la columna en la exportación de Excel.

### 3. Coherencia conversacional del Chatbot
*   **Contexto del Evento (`EVENT_CONTEXT`):** Se definió en el webhook toda la información oficial del Torneo de Dominadas (sedes Fátima, Centinela y Guaymas Norte, horarios, categorías y requisitos de responsiva, acta de nacimiento e INE del tutor) y del Delfinario.
*   **Clasificación `"pregunta_evento"`:** Se agregó esta intención a la clasificación de Gemini (`gemini-2.5-flash`) en el webhook.
*   **Desvío Inteligente (Bypass):** Si el usuario hace preguntas del evento, el webhook responde directamente con el contexto oficial del evento usando Gemini, evitando interrumpir al ciudadano con la confirmación de datos de su INE.
*   **RSVP por Mensajes de Texto:** Si un ciudadano escribe directamente confirmaciones (*"sí iré"*, *"no asistiré"*) por texto en estados conversacionales, el webhook actualiza su estatus en Firestore en segundo plano y responde de forma coherente.
*   **Enriquecimiento Conversacional:** El contexto de eventos se añadió a los prompts de charla general y saludos para que el chatbot sepa responder de forma oportuna.

### 4. Aclaración de Facturación de WhatsApp
*   Meta muestra los cobros estimados en la moneda en que fue configurada la cuenta (WABA). En cuentas configuradas por error en **ARS (Peso Argentino)**, las cifras altas acumuladas (ej. $11,182.93 ARS) son de muy bajo valor real (equivalen a aproximadamente **$134.19 MXN** o **$7.40 USD** en total por 615 mensajes), realizándose la conversión automática en el cobro a la tarjeta Mastercard.

---

## 🗺️ Optimización Visual del Mapa (13 Jun 2026)

Se rediseñó la experiencia visual del mapa de alcance georreferenciado (`/registro-dashboard` en la pestaña de Alcance):
*   **Coloreado Condicional de Seccionales:** Se implementó una lógica en `MapTab.tsx` para rellenar con el color de la campaña (`fillOpacity: 0.18`) únicamente aquellos seccionales que tienen al menos un contacto asignado. Los seccionales sin contactos permanecen sin relleno (`fillOpacity: 0`), reduciendo drásticamente la saturación visual.
*   **Visibilidad de Divisiones (Bordes):** Se ajustaron los grosores y opacidades de los bordes para que las divisiones seccionales sean más distinguibles en la cartografía:
    *   *Seccionales con contactos:* Grosor de `1.2` y opacidad de borde de `0.75`.
    *   *Seccionales vacíos:* Grosor de `0.8` y opacidad de borde de `0.25` (claramente visibles pero no invasivos).
    *   *Seccional Seleccionado:* Grosor de `2.5` y opacidad de borde de `0.9` con relleno `0.4` para destacar la zona activa seleccionada.

---

## 📝 Flexibilización de Registro y CRM Manual (19 Jun 2026)

Se flexibilizó el registro web y se implementó un flujo completo para la atención de casos sin WhatsApp desde el CRM de Vinculación:

### 1. Campos Opcionales en Registro Web
*   **Ajuste de Validación:** En el formulario de registro de asistencia (`/registro` y `/e/[eventId]` en [RegistroClient.tsx](file:///c:/Users/ENRIQ/SISTEMA%20DE%20VOTANTES%20PARA%20EL%20ESTADO%20DE%20SONORA/app/e/%5BeventId%5D/RegistroClient.tsx)), se modificó la lógica para que los campos **Calle**, **Número Exterior** y **Sección Electoral** sean opcionales. Ahora, solo el **Nombre completo** y el número de **WhatsApp** son obligatorios.
*   **Interfaz Gráfica:** Se removieron los asteriscos (`*`) de los campos opcionales en el modal de RSVP.

### 2. Registro de Casos Manuales en CRM
*   **Botón `➕ Registro Manual`:** Se añadió un botón en la barra superior del panel CRM en [app/vinculacion/page.tsx](file:///c:/Users/ENRIQ/SISTEMA%20DE%20VOTANTES%20PARA%20EL%20ESTADO%20DE%20SONORA/app/vinculacion/page.tsx) para permitir el ingreso manual de gestiones por parte de los agentes.
*   **Toma de Datos con Auto-llenado Inteligente:** Al ingresar un número de WhatsApp de 10 dígitos, el sistema consulta en tiempo real en la colección `contacts` si el votante ya está registrado. De existir, se auto-completan de inmediato sus datos demográficos (Nombre, Calle, Num Ext, Colonia, Municipio, Sección Electoral).
*   **Generador de ID Único para Usuarios sin WhatsApp:** Si el ciudadano no posee WhatsApp o teléfono, el sistema permite desactivar el campo telefónico y genera en su lugar un ID secuencial de 10 caracteres con el formato `VINxxxxxxx` (ej. `VIN0000001`, `VIN0000002`). La secuencia se calcula sumando 1 al número mayor de los registros existentes que inician con `"VIN"` en las colecciones `contacts` y `gestiones`.
*   **Impacto en Base de Datos:** El flujo manual registra/actualiza al votante en `campaigns/main_campaign/contacts` usando su teléfono o el ID `VINxxxxxxx` generado como identificador, y crea su folio de gestión con el formato `GS-XXXX` en `campaigns/main_campaign/gestiones`.

## ⚽ Expansión del Torneo de Dominadas (Hermosillo - 23 Jun 2026)

Se actualizó la landing page (`/dominadas`) para dar soporte a las nuevas fechas del evento en Hermosillo, introduciendo una lógica multi-sede y separación de teléfonos para evitar conflictos en el CRM:

### 1. Formulario Dinámico y Multi-Fecha
*   **Selector de Jornada:** En lugar de un selector estático de "Sede", se usa un selector de "Jornada" que mapea internamente la fecha, sede, dirección y hora (ej. `29 de Junio — Col. Hacienda de la Flor` y `01 de Julio — Col. Coloso`). Esto permite usar una sola URL (`/dominadas`) para múltiples fechas.
*   **Generación Dinámica de PDFs:** Los archivos `Carta_Responsiva.pdf` y `Autorizacion.pdf` fueron reconstruidos con un script en Python (`office-generator`) para mostrar ambas fechas y sedes de Hermosillo, manteniendo el diseño guinda y oro (evitando problemas de codificación).

### 2. Separación de Teléfonos (Participante vs Tutor)
Para solucionar el problema de un mismo tutor inscribiendo a varios hijos sin crear registros duplicados o sobreescribir el teléfono principal en la tabla de contactos:
*   Se piden **dos celulares distintos** en el formulario: `celular` (del niño/joven, solo como referencia) y `celularTutor` (del padre).
*   **Deduplicación en `contacts`:** El sistema usa el `celularTutor` para buscar en la colección `contacts`. Si el tutor no existe, crea un nuevo registro (Level 1 - Voto). Si ya existe, **solo actualiza** los campos `participantName` y `registrationId`, sin duplicar el nodo estructural.
*   **WhatsApp Redirect:** El redireccionamiento automático final (`wa.me`) se ejecuta utilizando el teléfono configurado en el sistema, pre-llenando el mensaje con los datos del participante y la fecha exacta seleccionada para que el bot lo detecte.

### 3. Exportación Inteligente a Excel
*   En el Dashboard (`/registro-dashboard`, pestaña Eventos), el botón de exportación de Excel ahora separa inteligentemente los registros históricos (Guaymas) y los nuevos (Hermosillo) en **diferentes pestañas (hojas) dentro del mismo archivo `.xlsx`** basándose en la coincidencia del string de sede/jornada, e incluye la nueva columna "Celular Tutor".

## 📁 Importación Masiva de Contactos (26 Jun 2026)

Se implementó un módulo para la carga masiva de contactos vía Excel dentro del Dashboard (pestaña Directorio), permitiendo a los administradores poblar la base de datos de manera eficiente.

### 1. Plantilla de Importación Estructurada
*   Se generó un formato descargable (`Plantilla_Contactos.xlsx`) que incluye las columnas estándar requeridas para la estructura territorial.
*   **Campos Obligatorios:** Únicamente `Nombre` y `Celular` son estrictamente requeridos para procesar una fila.
*   **Asignación de Líder Dinámica:** La plantilla cuenta con la columna `Celular Lider`. Si el usuario provee un teléfono en esta columna, el sistema busca en tiempo real (durante la carga) en la base de datos de Firestore. Si encuentra al líder, el nuevo contacto se vincula automáticamente (`parentId`, `parentName`). De lo contrario (o si se deja en blanco), el contacto se registra como "Sin Líder" con Nivel 1.

### 2. Procesamiento y Límites de Firebase
*   **Batch Writes (Lotes):** Para respetar el límite de la API de Firebase (máximo 500 operaciones por transacción), el sistema de carga segmenta automáticamente grandes volúmenes de contactos en "chunks" de 500 registros, realizando escrituras en bloque (`writeBatch`) asegurando velocidad y estabilidad.
*   **Sanitización de Datos:** Los números de teléfono se extraen y normalizan a 10 dígitos puros (eliminando guiones o espacios) para mantener la consistencia con el Chatbot de WhatsApp.

---

## 🖼️ Corrección de Recursos Visuales (29 Jun 2026)
*   **Ruta `/dominadas`:** Se corrigieron las referencias en el CSS y en los metadatos de Next.js (`page.tsx`) que apuntaban a un nombre de archivo desactualizado (`/Torneo Dominadas...`). Se estandarizó el uso de `/torneo-hmo.png` desde la carpeta `public` para garantizar la correcta visualización del flyer del torneo en Hermosillo.

---

*Última actualización: 29 de Junio de 2026 (Corrección de referencias de imágenes en Torneo de Dominadas).*

