from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT

def create_carta():
    doc = SimpleDocTemplate("public/Carta_Responsiva.pdf", pagesize=letter,
                            rightMargin=50, leftMargin=50,
                            topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    
    style_title = ParagraphStyle(
        name='TitleStyle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=12,
        alignment=TA_CENTER,
        spaceAfter=8
    )
    
    style_subtitle = ParagraphStyle(
        name='SubtitleStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        textColor='#8d2a1e',
        alignment=TA_CENTER,
        spaceAfter=4
    )
    
    style_date = ParagraphStyle(
        name='DateStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=10,
        alignment=TA_CENTER,
        spaceAfter=14
    )
    
    style_body = ParagraphStyle(
        name='BodyStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        alignment=TA_JUSTIFY,
        leading=12,
        spaceAfter=8
    )
    
    style_bold_body = ParagraphStyle(
        name='BoldBodyStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        alignment=TA_LEFT,
        spaceAfter=4
    )
    
    style_footer = ParagraphStyle(
        name='FooterStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7,
        alignment=TA_JUSTIFY,
        textColor='#666666',
        leading=9
    )

    Story = []

    Story.append(Paragraph("CARTA RESPONSIVA MENOR DE EDAD", style_title))
    Story.append(Paragraph('TORNEO ESTATAL "DOMINADAS EN MI BARRIO"', style_subtitle))
    Story.append(Paragraph("13 de Junio • Guaymas, Sonora", style_date))

    text1 = """Por medio del presente documento, autorizo al menor: _____________________________________ de _______ años, para que participe en el <b>Torneo Estatal “Dominadas en Mi Barrio”</b>, dirigido a residentes de Guaymas, Sonora, a celebrarse el <b>13 de junio</b>."""
    Story.append(Paragraph(text1, style_body))

    text2 = """Así mismo, hago constar que su estado de salud es óptimo para que pueda desempeñarse en la disciplina y que no padece de algún tipo de enfermedad que le impida realizar actividad física de tipo competitiva."""
    Story.append(Paragraph(text2, style_body))

    text3 = """Por tal motivo, libero de cualquier responsabilidad civil, penal o de cualquier naturaleza, al <b>Senador Heriberto Aguilar</b>, así como a cualquier persona que labore o participe en la organización del Torneo Estatal “Dominadas en Mi Barrio”."""
    Story.append(Paragraph(text3, style_body))

    text4 = """Estoy de acuerdo en asumir la responsabilidad total de cualquier lesión o daño de cualquier tipo, que pueda suscitarse y que resulte de la participación del menor."""
    Story.append(Paragraph(text4, style_body))
    
    Story.append(Spacer(1, 10))
    
    Story.append(Paragraph("DATOS DE LA MADRE, PADRE Y/O TUTOR(A):", style_bold_body))
    Story.append(Spacer(1, 4))
    Story.append(Paragraph("NOMBRE COMPLETO: ______________________________________________________________", style_body))
    Story.append(Paragraph("DIRECCIÓN, NÚMERO Y COLONIA: _________________________________________________", style_body))
    Story.append(Paragraph("TELÉFONO: ____________________________________________________________________", style_body))
    Story.append(Paragraph("TELÉFONO DE EMERGENCIA: ____________________________________________________", style_body))
    Story.append(Paragraph("EMAIL: _______________________________________________________________________", style_body))
    Story.append(Paragraph("CURP: ________________________________________________________________________", style_body))
    
    Story.append(Spacer(1, 14))
    
    footer_text = """<b>AVISO DE PRIVACIDAD:</b> Se me informa que los datos personales que se reciben con el objeto del presente formato, serán utilizados para la finalidad que me fueron requeridos y en cumplimiento de las atribuciones legales que le confieren los artículos 13, fracción III, y 30, de la Ley de Protección de Datos Personales en Posesión de los Sujetos Obligados del Estado de Sonora y sus Municipios."""
    Story.append(Paragraph(footer_text, style_footer))

    doc.build(Story)

def create_autorizacion():
    doc = SimpleDocTemplate("public/Autorizacion.pdf", pagesize=letter,
                            rightMargin=72, leftMargin=72,
                            topMargin=72, bottomMargin=72)
    styles = getSampleStyleSheet()
    
    style_title = ParagraphStyle(
        name='TitleStyle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=14,
        alignment=TA_CENTER,
        spaceAfter=12
    )
    
    style_subtitle = ParagraphStyle(
        name='SubtitleStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        textColor='#8d2a1e',
        alignment=TA_CENTER,
        spaceAfter=6
    )
    
    style_date = ParagraphStyle(
        name='DateStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=10,
        alignment=TA_CENTER,
        spaceAfter=24
    )
    
    style_body = ParagraphStyle(
        name='BodyStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        alignment=TA_JUSTIFY,
        leading=16,
        spaceAfter=12
    )
    
    style_bold = ParagraphStyle(
        name='BoldBodyStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        alignment=TA_LEFT,
        textColor='#8d2a1e',
        spaceAfter=6
    )
    
    style_center = ParagraphStyle(
        name='CenterStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        alignment=TA_CENTER,
        spaceAfter=6
    )

    style_list = ParagraphStyle(
        name='ListStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        alignment=TA_LEFT,
        leading=14,
        leftIndent=20,
        spaceAfter=4
    )

    Story = []

    Story.append(Spacer(1, 24))
    Story.append(Paragraph("AUTORIZACIÓN DE PARTICIPACIÓN", style_title))
    Story.append(Paragraph('TORNEO ESTATAL "DOMINADAS EN MI BARRIO"', style_subtitle))
    Story.append(Paragraph("13 de Junio • Guaymas, Sonora", style_date))
    Story.append(Spacer(1, 12))

    text1 = """Yo, ______________________________________________________________________, en mi carácter de madre, padre y/o tutor(a), por medio del presente documento <b>autorizo</b> al menor ______________________________________________________________________ de _______ años de edad, para que participe en el <b>Torneo Estatal “Dominadas en Mi Barrio”</b>, a celebrarse el <b>13 de junio</b> en Guaymas, Sonora."""
    Story.append(Paragraph(text1, style_body))

    text2 = """Manifiesto que su estado de salud es óptimo para realizar la actividad y asumo cualquier responsabilidad derivada de su participación durante el evento."""
    Story.append(Paragraph(text2, style_body))

    Story.append(Spacer(1, 60))
    Story.append(Paragraph("____________________________________________________________________", style_center))
    Story.append(Paragraph("FIRMA DE LA MADRE, PADRE Y/O TUTOR(A)", style_center))
    Story.append(Paragraph("<font color='gray'><i>Fecha: _____ / _____ / _________</i></font>", style_center))
    
    Story.append(Spacer(1, 40))
    
    Story.append(Paragraph("REQUISITOS PARA EL DÍA DEL EVENTO:", style_bold))
    Story.append(Paragraph("• Acta de nacimiento del menor (original o copia).", style_list))
    Story.append(Paragraph("• Copia de credencial del INE de la madre, padre y/o tutor(a).", style_list))
    Story.append(Paragraph("• Esta carta de autorización debidamente firmada.", style_list))
    Story.append(Paragraph("• Carta responsiva firmada por la madre, padre y/o tutor(a).", style_list))

    doc.build(Story)

if __name__ == '__main__':
    create_carta()
    create_autorizacion()
