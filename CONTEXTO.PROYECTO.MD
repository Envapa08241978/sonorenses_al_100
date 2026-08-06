# Contexto del Proyecto: Sonorenses al 100 - Bot de WhatsApp y Plataforma

Este archivo documenta las lógicas principales y flujos de trabajo implementados recientemente en el webhook de WhatsApp (`app/api/whatsapp/webhook/route.ts`), la plataforma web (`/registro`) y el panel de control (`registro-dashboard`), para que futuros desarrollos o agentes entiendan la arquitectura actual y no rompan la funcionalidad existente.

---

## 1. Envío de Liga Personal y Código QR a Ciudadanos

Se implementó una automatización para que los ciudadanos registrados puedan solicitar su propia liga de reclutamiento y su código QR para invitar a otros, interactuando directamente con el bot.

* **Trigger (Interceptador):** La variable `isRequestingLink` intercepta frases clave como *"mi qr"*, *"mi liga"*, *"dame mi enlace"*, *"reenviar mi qr"*, etc.
* **Flujo de Ejecución:**
  * Esta intercepción ocurre **antes** de que el mensaje sea procesado por la IA (Gemini) o por el sistema de peticiones (Gestiones).
  * **Seguridad:** El sistema verifica que el número de teléfono que escribe ya exista en la colección de `contacts`. Si el número no existe, el bot responde indicándole que primero debe registrarse en la página web.
  * Si el contacto existe, se ejecuta la función helper `sendPersonalRecruitmentLink` que envía la imagen generada del QR y el texto con la URL personal (`?ref=ID_DEL_CONTACTO`).
* **Objetivo:** Evitar que el bot se confunda y trate estas solicitudes como "Peticiones" (gestiones) y dar respuesta inmediata al usuario.

---

## 2. Plan B: Validación Alternativa de Consentimiento (Sin Código QR)

Normalmente, el flujo de validación arranca cuando un ciudadano abre una liga que contiene un texto prellenado (ej. *"Me acabo de registrar"* o *"Folio:"*). Sin embargo, algunos ciudadanos registrados por Brigadistas en campo no saben abrir ligas o escanear códigos. Se implementó una solución para ellos.

* **Trigger (Interceptador):** Se modificó la variable `isRegistration` para que también sea verdadera si ocurre lo siguiente:
  1. El mensaje es de texto (cualquier mensaje, por ejemplo: *"Hola"*).
  2. El documento del contacto **ya existe** en la base de datos (`contactDoc` es true).
  3. El estado de consentimiento del contacto está vacío (`!existingConsent`), es decir, aún no ha aceptado ni rechazado las políticas de difusión.
* **Flujo de Ejecución:**
  * Al cumplirse esto, el bot asume automáticamente que el ciudadano está intentando iniciar su flujo de validación.
  * Ignora el saludo casual y envía inmediatamente la **Tarjeta de Bienvenida** con los botones interactivos: *"Sí, acepto ✅"* y *"No, gracias"*.
* **Objetivo:** Permitir que las personas menos familiarizadas con la tecnología puedan completar su registro simplemente mandando un mensaje manual al número del bot (662 224 4979), tras haber sido dados de alta por un brigadista.

---

## 3. Actualización de Jerarquía de Roles y Exportación en Excel (Fase 2 - Julio 2026)

Se realizaron adecuaciones en el panel de control (`registro-dashboard`) relativas a los niveles organizativos del movimiento y la descarga de datos del directorio de contactos.

* **Jerarquía de Roles (Niveles del 1 al 5):**
  * Se reestructuraron las etiquetas y colores en `types.ts` reduciendo la escala activa de niveles al rango del 1 al 5.
  * **Nivel 1:** Ciudadano Concientizado *(reemplaza al rol anterior "Voto")*
  * **Nivel 2:** Ciudadano Movilizador *(reemplaza al rol anterior "Movilizador")*
  * **Nivel 3:** Brigadista *(se mantiene)*
  * **Nivel 4:** Coordinador Territorial *(se mantiene)*
  * **Nivel 5:** Coordinador General *(reemplaza al rol anterior "Coordinador Distrital")*
  * *Nota:* El nivel 6 y superiores se omitieron por el momento. El componente de red en `StatsPanel.tsx` se rediseñó a 5 columnas.
* **Rediseño de la Descarga en Excel:**
  * Se modificó la lógica en la función `exportToExcel` de `DirectoryTab.tsx`.
  * **Campos Completos:** Columnas para `ID`, `Num Ext`, `Num Int`, `Colonia`, `Código Postal`, `Municipio`, `Distrito`, `Invitado Por`, `Consentimiento` y `Origen`.
  * **Trazabilidad de Cadena Jerárquica:** Búsqueda recursiva ascendente a través del `parentId` para trazar la línea de mando completa del Nivel 5 al 1 en columnas dedicadas.

---

## 4. Limpieza y Depuración del Proyecto (Julio 2026)

* **Eliminación de Torneo de Dominadas:** Se removieron los archivos, referencias y componentes pertenecientes al proyecto secundario *"Torneo Estatal Dominadas en mi Barrio"*. El proyecto quedó limpio y exclusivo para las operaciones de **Sonorenses al 100**.

---

## 5. Difusión Masiva y Configuración de Imágenes de Cabecera (Meta API)

* **Manejo de Imágenes de Encabezado:** 
  * Se configuró el envío de plantillas de Meta con imagen en la cabecera (`headerImageUrl`).
  * Se vincularon URLs oficiales alojadas en Firebase Storage.
  * Se recomendó el uso de URLs de enlace directo terminadas en `.jpg` o `.png` requeridas por Meta Graph API.

---

## 6. Filtro de Consentimiento para Envíos Masivos (WhatsApp Confirmado)

* **Filtro `onlyConfirmed`:** Verificación que valida `c.consent === 'yes'` antes de incluir a un contacto en envíos masivos.
* **Casilla Activa por Defecto:** En `BroadcastTab.tsx` viene activada por defecto para proteger la cuenta de WhatsApp Business ante reportes de spam.

---

## 7. Reporte de Métricas y Registro de Difusiones

* **Rendimiento de Plantilla `asamblea_copacabana`:**
  * **Meta Analytics:** 650 mensajes entregados con una tasa de apertura del **73% (476 leídos)**.
  * **Base de Datos Firebase:** 1,345 envíos registrados acumulados sobre un padrón total de 1,440 contactos.

---

## 8. Control de Activación y Desactivación de Eventos en Portal Público (`/registro`)

Se corrigió un comportamiento en la página pública de registro (`app/registro/page.tsx`) y en el componente cliente (`app/e/[eventId]/RegistroClient.tsx`):

* **Problema Encontrado:** Al desactivar un evento en el panel (botón *"⚡ Activar en Portal Público"*), el evento desactivado seguía apareciendo en `sonorensesal100.com/registro`.
* **Causa:** Existía una consulta de *fallback* automática que, al detectar `activeEventId == null`, hacía un `orderBy('date', 'desc').limit(1)` en la colección `events`, forzando la carga del evento más reciente.
* **Solución Aplicada:**
  * Se eliminaron los queries de fallback en `app/registro/page.tsx` y `RegistroClient.tsx`.
  * **Comportamiento Actual:**
    - Si hay un `activeEventId` configurado en `campaigns/main_campaign/config/profile`, el portal `/registro` despliega la tarjeta y datos de ese evento.
    - Si el evento se desactiva (`activeEventId === null`), el portal regresa al formulario de **Registro General Permanente** (*Atención Comunitaria Permanente*), respetando la decisión del administrador.

---

## 9. Instructivo y Material de Capacitación para Voceros en Territorio

Se estandarizó el flujo de onboarding de 4 pasos para brigadistas y voceros de la Transformación:

1. **Paso 1 y 2 (Alta en Territorio):** Escaneo de código QR e ingreso de datos reales en la plataforma web.
2. **Paso 3 (Verificación en WhatsApp):** Clic en *"Verificar desde Mi teléfono"*, envío de mensaje inicial, selección de *"Sí, acepto ✅"* y envío del comando *"MÁNDAME MI QR"*.
3. **Paso 4 (Red de Simpatizantes):** Apertura de la liga personal (`?ref=...`) y escaneo del QR en pantalla por parte del nuevo simpatizante para finalizar su verificación.
* **Guión Técnico por Escenas:** Se creó el documento con tiempos, visuales, overlays y locución en audio para producir videos de capacitación profesional en plataformas como HeyGen, Canva Pro, CapCut e InVideo AI.

## 10. Campaña Carta Postal de Javier Lamarque (Agosto 2026)

Se implementó el flujo completo de rastreo, atribución y medición en tiempo real para las cartas postales impresas enviadas por correo postal.

* **Enlace y QR de Imprenta:**
  * **URL Parametrizada:** `https://www.sonorensesal100.com/registro?ref=carta_postal`
  * **Asset generado:** `public/qr_carta_postal.png` (código QR en HD listo para imprenta/diseño).
* **Captura de Registro (`RegistroClient.tsx`):**
  * Detecta automáticamente `ref === 'carta_postal'` o `origen === 'carta_postal'`.
  * Asigna los atributos de fondo:
    - `origen`: `'Carta Postal'`
    - `parentId`: `'carta_postal'`
    - `parentName` / `invitedBy`: `'Carta Postal (Javier Lamarque)'`
    - `level`: `1` (Ciudadano Concientizado)
* **Medición en Panel de Control (`registro-dashboard`):**
  * **Tarjeta Interactiva:** Nueva tarjeta dorada 📬 **Carta Postal** en la parte superior del dashboard que muestra el total acumulado en tiempo real y al darle clic despliega el directorio filtrado.
  * **Filtro Estricto API (`onlyCartaPostal`):** Botón `📬 Carta Postal` en la barra de filtros y parámetro API en `contactsApi`, `useContacts` y `exportContacts` para filtrar exactamente por `origen === 'Carta Postal'` (evitando falsos positivos de coincidencias de nombres como "Cartagena").

---

**Notas Importantes para Futuros Agentes / Desarrolladores:**
1. **Webhook (`route.ts`):** **NO eliminar ni modificar** las validaciones `isRequestingLink` e `isRegistration`.
2. **Eventos Activos:** Mantener la propiedad `activeEventId` en la colección `config/profile` como la única fuente de verdad para el evento público en `/registro`. No reinstaurar fallbacks automáticos por fecha.
3. **Difusiones Masivas:** Mantener `onlyConfirmed` activo por defecto y utilizar únicamente enlaces directos a imágenes (`.jpg`/`.png`).
4. **Carta Postal (`ref=carta_postal`):** Mantener el parámetro `onlyCartaPostal` en la API y el arreglo de dependencias de `useContacts` para asegurar la correcta actualización en tiempo real de la campaña postal.
