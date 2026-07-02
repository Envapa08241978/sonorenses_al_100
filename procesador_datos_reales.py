import pandas as pd
import math
import warnings

warnings.simplefilter("ignore")

def process_real_data():
    print("Cargando datos reales de 2021...")
    df_2021 = pd.read_excel('TABLA_DE_RESULTADOS_GUBERNATURA (1).xlsx', header=1)
    df_2021.columns = df_2021.columns.str.strip()
    
    # Check column names carefully to avoid key errors
    morena_col = 'JUNTOS HAREMOS HISTORIA EN SONORA' if 'JUNTOS HAREMOS HISTORIA EN SONORA' in df_2021.columns else 'JUNTOS HAREMOS HISTORIA EN SONORA '
    if morena_col not in df_2021.columns:
        morena_col = [c for c in df_2021.columns if 'JUNTOS' in c][0]
        
    opp_col = 'VA X SONORA' if 'VA X SONORA' in df_2021.columns else 'VA X SONORA '
    if opp_col not in df_2021.columns:
        opp_col = [c for c in df_2021.columns if 'VA X' in c][0]
    
    grp_2021 = df_2021.groupby(['id_seccion', 'municipio']).agg({
        'lista_nominal': 'sum',
        'total_votos': 'sum',
        morena_col: 'sum',
        opp_col: 'sum'
    }).reset_index()
    
    print("Cargando datos reales de 2009...")
    df_2009 = pd.read_excel('resultados_casilla_gobernador2009.xls')
    df_2009.columns = df_2009.columns.str.strip()
    seccion_col_09 = [c for c in df_2009.columns if 'Secc' in c][0]
    
    grp_2009 = df_2009.groupby(seccion_col_09).agg({
        'Total': 'sum'
    }).reset_index()
    grp_2009.rename(columns={seccion_col_09: 'id_seccion', 'Total': 'total_votos_09'}, inplace=True)
    
    print("Cruzando información y calculando crecimiento histórico...")
    merged = pd.merge(grp_2021, grp_2009, on='id_seccion', how='left')
    
    report_data = []
    municipio_votes = {}
    
    for _, row in merged.iterrows():
        sec = int(row['id_seccion'])
        mun = str(row['municipio']).strip().title()
        
        nom21 = int(row['lista_nominal']) if pd.notna(row['lista_nominal']) else 0
        tot21 = int(row['total_votos']) if pd.notna(row['total_votos']) else 0
        tot09 = int(row['total_votos_09']) if pd.notna(row['total_votos_09']) else tot21
        
        morena21 = int(row[morena_col]) if pd.notna(row[morena_col]) else 0
        opp21 = int(row[opp_col]) if pd.notna(row[opp_col]) else 0
        
        # Calculate growth based on Total Votes cast
        if tot09 > 0:
            growth_12yr = (tot21 - tot09) / tot09
            growth_12yr = max(-0.2, min(0.5, growth_12yr)) # Cap growth to avoid extreme outliers
        else:
            growth_12yr = 0.1 
            
        growth_6yr = growth_12yr / 2
        proj_nom27 = int(nom21 * (1 + growth_6yr))
        
        turnout21 = tot21 / max(nom21, 1) if nom21 > 0 else 0.5
        expected_votes27 = int(proj_nom27 * turnout21)
        meta_2027 = int((expected_votes27 / 2) + 1)
        
        if morena21 > opp21:
            tendencia = "Segura / Favorable"
        else:
            tendencia = "Competida / Crítica"
            
        if mun not in municipio_votes:
            municipio_votes[mun] = 0
        municipio_votes[mun] += expected_votes27
            
        report_data.append({
            'Seccion': sec,
            'Municipio': mun,
            'Nominal_2021': nom21,
            'Proyeccion_Nominal_2027': proj_nom27,
            'Morena_2021': morena21,
            'Oposicion_2021': opp21,
            'Participacion_2021_Pct': f"{(turnout21*100):.1f}%",
            'Votos_Esperados_Totales_2027': expected_votes27,
            'Votos_Necesarios_50_Mas_1_2027': meta_2027,
            'Clasificacion': tendencia
        })

    # Balance 2 Coordinadores Estatales
    print("Balanceando Coordinadores Estatales...")
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

    final_report = []
    for row in report_data:
        mun = row['Municipio']
        sec = row['Seccion']
        
        row['Coordinador_Estatal'] = municipio_to_coord.get(mun, 'Sin Asignar')
        
        # Federal District assignment based on real INE 2024 map
        mun_norm = mun.lower().replace('á', 'a').replace('é', 'e').replace('í', 'i').replace('ó', 'o').replace('ú', 'u').strip()
        
        d1 = ['san luis rio colorado', 'puerto peñasco', 'puerto penasco', 'caborca', 'altar', 'atil', 'general plutarco elias calles', 'plutarco elias calles', 'oquitoa', 'pitiquito', 'san miguel de horcasitas', 'saric', 'trincheras', 'tubutama', 'benjamin hill']
        d2 = ['nogales', 'agua prieta', 'arizpe', 'bacoachi', 'cananea', 'cucurpe', 'fronteras', 'imuris', 'magdalena', 'naco', 'santa cruz', 'santa ana']
        d3 = ['carbo', 'la colorada', 'rayon', 'san felipe de jesus', 'san pedro de la cueva', 'soyopa', 'ures', 'villa pesqueira']
        d4 = ['guaymas', 'empalme', 'bacum', 'san ignacio rio muerto', 'alamos', 'bacanora', 'huasabas', 'quiriego', 'rosario', 'sahuaripa', 'san javier', 'suaqui grande', 'tepache', 'yecora', 'aconchi', 'bacerac', 'banamichi', 'baviacora', 'bavispe', 'huachinera', 'huepac', 'mazatan']
        d7 = ['navojoa', 'etchojoa', 'huatabampo', 'benito juarez', 'arivechi', 'bacadehuachi', 'cumpas', 'divisaderos', 'granados', 'moctezuma', 'nacori chico', 'nacozari de garcia', 'onavas', 'opodepe', 'villa hidalgo']
        
        if mun_norm in d1:
            distrito = 'Distrito Federal 1'
        elif mun_norm in d2:
            distrito = 'Distrito Federal 2'
        elif mun_norm in d4:
            distrito = 'Distrito Federal 4'
        elif mun_norm in d7:
            distrito = 'Distrito Federal 7'
        elif mun_norm in d3:
            distrito = 'Distrito Federal 3'
        elif mun_norm == 'cajeme':
            distrito = 'Distrito Federal 6'
        elif mun_norm == 'hermosillo':
            # Hermosillo splits into 3 (Norte) and 5 (Sur). 
            # We assign mathematically until the precise INE section-level catalog is available.
            distrito = 'Distrito Federal 3' if sec % 2 == 0 else 'Distrito Federal 5'
        else:
            # Fallback using historical generic assignment for any missing small town
            distrito = 'Distrito Federal (Pendiente Asignación Exacta)'
            
        row['Coordinador_Distrital'] = f"Coordinador {distrito}"
        
        # Municipal
        if mun == 'Hermosillo':
            if sec % 4 == 0: coord_mun = 'Coordinador Municipal Hermosillo (Norte)'
            elif sec % 4 == 1: coord_mun = 'Coordinador Municipal Hermosillo (Sur)'
            elif sec % 4 == 2: coord_mun = 'Coordinador Municipal Hermosillo (Este)'
            else: coord_mun = 'Coordinador Municipal Hermosillo (Oeste)'
        elif mun == 'Cajeme':
            if sec % 3 == 0: coord_mun = 'Coordinador Municipal Cajeme (Centro)'
            elif sec % 3 == 1: coord_mun = 'Coordinador Municipal Cajeme (Valle)'
            else: coord_mun = 'Coordinador Municipal Cajeme (Periferia)'
        else:
            coord_mun = f'Coordinador Municipal {mun}'
            
        row['Coordinador_Municipal'] = coord_mun
        
        # Requirements
        meta = row['Votos_Necesarios_50_Mas_1_2027']
        row['Coordinadores_De_Brigada_Requeridos'] = math.ceil(meta / 2500)
        row['Brigadistas_Requeridos'] = math.ceil(meta / 500)
        row['Coordinadores_Seccionales_Requeridos'] = math.ceil(meta / 100)
        row['Protagonistas_Movilizadores_Requeridos'] = math.ceil(meta / 10)
        row['Votos_Nivel_1_Requeridos'] = meta
        
        final_report.append(row)
        
    df_out = pd.DataFrame(final_report)
    df_out.to_csv('Reporte_Electoral_Sonora_2027_V13.csv', index=False, encoding='utf-8')
    print("Reporte V13 generado exitosamente.")
    
if __name__ == '__main__':
    process_real_data()
