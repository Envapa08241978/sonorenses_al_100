# -*- coding: utf-8 -*-
import sys
import os

# Agregar la ruta del módulo herramientas_rh.py
sys.path.append(r"C:\Users\ENRIQ\OneDrive\Documents\Recursos Humanos Navojoa\2026\PROYECTOS CON IA Y RH")

try:
    from herramientas_rh import crear_presentacion
except ImportError as e:
    print(f"Error al importar herramientas_rh: {e}")
    sys.exit(1)

# Estructurar las diapositivas con el manual de brigadeo
diapositivas = [
    {
        "titulo": "El Rol del Brigadista en Territorio",
        "puntos": [
            "Facilitar el registro organizado de ciudadanos y enlaces territoriales.",
            "Capturar datos demográficos reales de la zona de brigadeo.",
            "Canalizar de forma inmediata y automática las gestiones ciudadanas."
        ],
        "destacado": "Objetivo:\nOrganización\ny Confianza"
    },
    {
        "titulo": "Paso 1: Acceso y Escaneo del QR",
        "puntos": [
            "Cada brigadista tiene un enlace de red único con su ID (ref) de coordinador.",
            "El ciudadano debe escanear el QR con la cámara de su propio teléfono celular.",
            "NUNCA uses tu celular de brigadista para escanear el QR ni registrar al votante."
        ],
        "destacado": "¡Muy Importante!\nEl celular del votante\nes la llave del sistema"
    },
    {
        "titulo": "Paso 2: Registro en la Web",
        "puntos": [
            "El ciudadano abre el link y verá la confirmación: 'Te invita el Enlace: [Tu Nombre]'.",
            "Completa los campos obligatorios: Nombre, WhatsApp, Calle, Sección.",
            "Verifica que el número de WhatsApp contenga exactamente 10 dígitos."
        ],
        "destacado": "Validación INE:\nSección Electoral\nde 3 o 4 dígitos"
    },
    {
        "titulo": "Paso 3: Sincronización del Chatbot",
        "puntos": [
            "Al presionar 'Registrar', se abrirá automáticamente WhatsApp en el celular del votante.",
            "El votante debe ENVIAR el mensaje pre-llenado de confirmación en su chat.",
            "El Chatbot saludará y vinculará formalmente al ciudadano en el Directorio."
        ],
        "destacado": "Sincronización:\nEl votante debe\nenviar el mensaje"
    },
    {
        "titulo": "Paso 4 y 5: Gestión y Vinculación",
        "puntos": [
            "El chatbot preguntará al votante si necesita algún apoyo, petición o gestión social.",
            "Al detallar su caso, el bot le asignará un Folio de Gestión único (GS-XXXX).",
            "El caso se enviará al CRM y el equipo administrativo le dará seguimiento en /vinculacion."
        ],
        "destacado": "Gestión Social:\nFolio GS-XXXX\nen tiempo real"
    }
]

# Definir la ruta de salida en el espacio de trabajo del usuario
output_path = r"c:\Users\ENRIQ\SISTEMA DE VOTANTES PARA EL ESTADO DE SONORA\capacitacion_brigadistas.pptx"

print("Generando presentación en PowerPoint...")
crear_presentacion(
    titulo="Manual de Capacitacion para Brigadistas",
    subtitulo="Sistema de Registro y Vinculacion Territorial",
    diapositivas_contenido=diapositivas,
    nombre_archivo=output_path
)

print(f"Presentación generada correctamente en: {output_path}")
