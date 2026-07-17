# Contexto del Proyecto: Sonorenses al 100 - Bot de WhatsApp

Este archivo documenta las lógicas principales y flujos de trabajo implementados recientemente en el webhook de WhatsApp (`app/api/whatsapp/webhook/route.ts`), para que futuros desarrollos o agentes entiendan la arquitectura actual y no rompan la funcionalidad existente.

## 1. Envío de Liga Personal y Código QR a Ciudadanos

Se implementó una automatización para que los ciudadanos registrados puedan solicitar su propia liga de reclutamiento y su código QR para invitar a otros, interactuando directamente con el bot.

* **Trigger (Interceptador):** La variable `isRequestingLink` intercepta frases clave como *"mi qr"*, *"mi liga"*, *"dame mi enlace"*, *"reenviar mi qr"*, etc.
* **Flujo de Ejecución:**
  * Esta intercepción ocurre **antes** de que el mensaje sea procesado por la IA (Gemini) o por el sistema de peticiones (Gestiones).
  * **Seguridad:** El sistema verifica que el número de teléfono que escribe ya exista en la colección de `contacts`. Si el número no existe, el bot responde indicándole que primero debe registrarse en la página web.
  * Si el contacto existe, se ejecuta la función helper `sendPersonalRecruitmentLink` que envía la imagen generada del QR y el texto con la URL personal (`?ref=ID_DEL_CONTACTO`).
* **Objetivo:** Evitar que el bot se confunda y trate estas solicitudes como "Peticiones" (gestiones) y dar respuesta inmediata al usuario.

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



## 3. Actualización de Jerarquía de Roles y Exportación en Excel (Fase 2 - Julio 2026)

Se realizaron adecuaciones en el panel de control (`registro-dashboard`) relativas a los niveles organizativos del movimiento y la descarga de datos del directorio de contactos.

*   **Jerarquía de Roles (Niveles del 1 al 5):**
    *   Se reestructuraron las etiquetas y colores en [types.ts](file:///c:/Users/ENRIQ/OneDrive/Documents/Paginas%20web/Sonorenses_al_100/app/registro-dashboard/components/types.ts) reduciendo la escala activa de niveles al rango del 1 al 5.
    *   **Nivel 1:** Ciudadano Concientizado *(reemplaza al rol anterior "Voto")*
    *   **Nivel 2:** Ciudadano Movilizador *(reemplaza al rol anterior "Movilizador")*
    *   **Nivel 3:** Brigadista *(se mantiene)*
    *   **Nivel 4:** Coordinador Territorial *(se mantiene)*
    *   **Nivel 5:** Coordinador General *(reemplaza al rol anterior "Coordinador Distrital")*
    *   *Nota:* El nivel 6 (anteriormente "Coordinador General") y los niveles 7 y 8 se omitieron de la interfaz y de los filtros por el momento para mantener la estructura limpia y adaptada a la fase actual de campaña. El componente de red en [StatsPanel.tsx](file:///c:/Users/ENRIQ/OneDrive/Documents/Paginas%20web/Sonorenses_al_100/app/registro-dashboard/components/StatsPanel.tsx) se rediseñó de 6 a 5 columnas.
*   **Rediseño de la Descarga en Excel:**
    *   Se modificó la lógica en la función `exportToExcel` de [DirectoryTab.tsx](file:///c:/Users/ENRIQ/OneDrive/Documents/Paginas%20web/Sonorenses_al_100/app/registro-dashboard/components/DirectoryTab.tsx).
    *   **Campos Completos:** Se añadieron columnas para todos los datos del ciudadano que no se estaban exportando (`ID`, `Num Ext`, `Num Int`, `Colonia`, `Código Postal`, `Municipio`, `Distrito`, `Invitado Por`, `Consentimiento` y `Origen`).
    *   **Remociones:** Se eliminaron las columnas `Lider` y `Eventos Asistidos`.
    *   **Trazabilidad de Cadena Jerárquica:** Se programó una búsqueda recursiva ascendente a través del `parentId` para trazar la línea de mando completa de cada contacto del Nivel 5 al 1. El Excel resultante crea una columna dedicada para cada nivel (ej. `Nivel 5: Coordinador General`, `Nivel 4: Coordinador Territorial`, etc.) y escribe allí el nombre del superior respectivo. Esto permite agrupar y filtrar la estructura de referidos de forma directa en la hoja de cálculo.

---
**Nota para futuros asistentes:** 
*   Si se requieren realizar cambios al webhook (`route.ts`), es de suma importancia **NO modificar ni eliminar** las validaciones de intercepción rápida (`isRequestingLink` e `isRegistration`), ya que controlan el correcto flujo de onboarding y auto-servicio de los Enlaces Ciudadanos.
*   Al modificar el directorio o el flujo de carga, ten en cuenta que la base de datos almacena los niveles como enteros del 1 al 5. Los nombres legibles de cada rol están mapeados en `LEVEL_ROLES` (`types.ts`).

