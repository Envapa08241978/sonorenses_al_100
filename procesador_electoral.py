import csv
import os
import math

def load_data(filepath):
    data = {}
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            sec = int(row['SECCION'])
            data[sec] = {
                'MUNICIPIO': row['MUNICIPIO'],
                'LISTA_NOMINAL': int(row['LISTA_NOMINAL']),
                'VOTOS_MORENA': int(row['VOTOS_MORENA_Y_ALIADOS']),
                'VOTOS_OPOSICION': int(row['VOTOS_OPOSICION']),
                'VOTOS_NULOS': int(row['VOTOS_NULOS'])
            }
    return data

def process_data():
    try:
        d2009 = load_data('datos_electorales/resultados_2009.csv')
        d2015 = load_data('datos_electorales/resultados_2015.csv')
        d2021 = load_data('datos_electorales/resultados_2021.csv')
    except Exception as e:
        print(f"Error cargando datos: {e}")
        return

    intermediate_data = []
    municipio_votes = {}
    
    # Process each section based on 2021 as the baseline
    for sec, data21 in d2021.items():
        data15 = d2015.get(sec, {})
        data09 = d2009.get(sec, {})
        
        # Demographic Projections (Listado Nominal)
        nom21 = data21.get('LISTA_NOMINAL', 0)
        nom15 = data15.get('LISTA_NOMINAL', nom21) # fallback if missing
        nom09 = data09.get('LISTA_NOMINAL', nom15)
        
        # Average growth rate per period (6 years)
        growth_1 = (nom15 - nom09) / max(nom09, 1)
        growth_2 = (nom21 - nom15) / max(nom15, 1)
        avg_growth = (growth_1 + growth_2) / 2
        
        # Projected Listado Nominal for 2027
        proj_nom27 = int(nom21 * (1 + avg_growth))
        
        # Historical Turnout (Participación)
        votes21 = data21.get('VOTOS_MORENA', 0) + data21.get('VOTOS_OPOSICION', 0) + data21.get('VOTOS_NULOS', 0)
        turnout21 = votes21 / max(nom21, 1)
        
        # Expected votes in 2027 based on 2021 turnout
        expected_votes27 = int(proj_nom27 * turnout21)
        
        # Threshold for victory (50% + 1 of expected votes)
        meta_2027 = int((expected_votes27 / 2) + 1)
        
        # Trend / Classification
        morena21 = data21.get('VOTOS_MORENA', 0)
        opp21 = data21.get('VOTOS_OPOSICION', 0)
        morena15 = data15.get('VOTOS_MORENA', 0)
        
        if morena21 > opp21 and morena21 > morena15 * 1.1:
            tendencia = "Segura (Crecimiento Alto)"
        elif morena21 > opp21:
            tendencia = "Favorable (Estable)"
        elif opp21 > morena21 * 1.5:
            tendencia = "Crítica (Oposición Fuerte)"
        else:
            tendencia = "Competida (Swing)"
            
        municipio = data21.get('MUNICIPIO', '')
        if municipio not in municipio_votes:
            municipio_votes[municipio] = 0
        municipio_votes[municipio] += expected_votes27
            
        intermediate_data.append({
            'Seccion': sec,
            'Municipio': municipio,
            'Nominal_2009': nom09,
            'Nominal_2015': nom15,
            'Nominal_2021': nom21,
            'Proyeccion_Nominal_2027': proj_nom27,
            'Morena_2009': data09.get('VOTOS_MORENA', 0),
            'Oposicion_2009': data09.get('VOTOS_OPOSICION', 0),
            'Morena_2015': morena15,
            'Oposicion_2015': data15.get('VOTOS_OPOSICION', 0),
            'Morena_2021': morena21,
            'Oposicion_2021': opp21,
            'Participacion_2021_Pct': f"{(turnout21*100):.1f}%",
            'Votos_Esperados_Totales_2027': expected_votes27,
            'Votos_Necesarios_50_Mas_1_2027': meta_2027,
            'Clasificacion': tendencia
        })

    # Balance 2 Coordinadores Estatales by Municipality expected votes
    sorted_muns = sorted(municipio_votes.items(), key=lambda x: x[1], reverse=True)
    coord1_votes, coord2_votes = 0, 0
    municipio_to_coord = {}
    
    for mun, votes in sorted_muns:
        if coord1_votes <= coord2_votes:
            municipio_to_coord[mun] = "Coordinador Estatal 1"
            coord1_votes += votes
        else:
            municipio_to_coord[mun] = "Coordinador Estatal 2"
            coord2_votes += votes

    print(f"Balance de Votos Esperados 2027:")
    print(f"Coordinador Estatal 1: {coord1_votes:,} votos")
    print(f"Coordinador Estatal 2: {coord2_votes:,} votos")

    # Add Coordinator Estatal and Distrital Federal to report data
    report_data = []
    for row in intermediate_data:
        # Assign Coordinador Estatal
        row['Coordinador_Estatal'] = municipio_to_coord.get(row['Municipio'], 'Sin Asignar')
        
        # Simulate Federal District Assignment (Level 7)
        mun = row['Municipio']
        sec = row['Seccion']
        if mun == 'San Luis Rio Colorado':
            distrito = 'Distrito Federal 1'
        elif mun == 'Nogales':
            distrito = 'Distrito Federal 2'
        elif mun == 'Hermosillo':
            distrito = 'Distrito Federal 3' if sec % 2 == 0 else 'Distrito Federal 5'
        elif mun == 'Guaymas':
            distrito = 'Distrito Federal 4'
        elif mun == 'Cajeme':
            distrito = 'Distrito Federal 6'
        elif mun == 'Navojoa':
            distrito = 'Distrito Federal 7'
        else:
            distrito = 'Distrito Federal Genérico'
            
        row['Coordinador_Distrital_Federal'] = f"Coordinador {distrito}"
        
        # Simulate Municipal Coordinator Assignment (Level 6)
        if mun == 'Hermosillo':
            # Split into 4 zones based on section logic to balance massive electorate
            if sec % 4 == 0:
                coord_mun = 'Coordinador Municipal Hermosillo (Zona Norte)'
            elif sec % 4 == 1:
                coord_mun = 'Coordinador Municipal Hermosillo (Zona Sur)'
            elif sec % 4 == 2:
                coord_mun = 'Coordinador Municipal Hermosillo (Zona Este)'
            else:
                coord_mun = 'Coordinador Municipal Hermosillo (Zona Oeste)'
        elif mun == 'Cajeme':
            # Split into 3 zones
            if sec % 3 == 0:
                coord_mun = 'Coordinador Municipal Cajeme (Zona Centro)'
            elif sec % 3 == 1:
                coord_mun = 'Coordinador Municipal Cajeme (Zona Valle)'
            else:
                coord_mun = 'Coordinador Municipal Cajeme (Zona Periferia)'
        else:
            # Normal municipalities have 1 coordinator
            coord_mun = f'Coordinador Municipal {mun}'
            
        row['Coordinador_Municipal'] = coord_mun
        
        # Simulate Coordinador de Brigada Requirement (Level 5)
        # Math: 1 CB = 2500 votes
        req_coord_brigada = math.ceil(row['Votos_Necesarios_50_Mas_1_2027'] / 2500)
        row['Coordinadores_De_Brigada_Requeridos'] = req_coord_brigada
        
        # Simulate Brigadista Requirement (Level 4)
        # Math: 1 B = 500 votes
        req_brigadista = math.ceil(row['Votos_Necesarios_50_Mas_1_2027'] / 500)
        row['Brigadistas_Requeridos'] = req_brigadista
        
        # Simulate Coordinador Seccional Requirement (Level 3)
        # Math: 1 CS = 100 votes
        req_coord_seccional = math.ceil(row['Votos_Necesarios_50_Mas_1_2027'] / 100)
        row['Coordinadores_Seccionales_Requeridos'] = req_coord_seccional
        
        # Simulate Protagonista Movilizador Requirement (Level 2)
        # Math: 1 PM = 10 votes
        req_protagonista = math.ceil(row['Votos_Necesarios_50_Mas_1_2027'] / 10)
        row['Protagonistas_Movilizadores_Requeridos'] = req_protagonista
        
        # Level 1: Voto
        # Math: Exactly equal to the needed votes
        row['Votos_Nivel_1_Requeridos'] = row['Votos_Necesarios_50_Mas_1_2027']
        
        report_data.append(row)
        
    # Write Final Report
    with open('Reporte_Electoral_Sonora_2027_V10.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=report_data[0].keys())
        writer.writeheader()
        writer.writerows(report_data)
        
    print("Reporte Final generado exitosamente: Reporte_Electoral_Sonora_2027_V10.csv")

if __name__ == '__main__':
    process_data()
