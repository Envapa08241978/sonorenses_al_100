import csv
import random
import os

def get_municipio(sec):
    if sec <= 500: return 'Hermosillo'
    elif sec <= 800: return 'Cajeme'
    elif sec <= 1000: return 'Nogales'
    elif sec <= 1200: return 'San Luis Rio Colorado'
    elif sec <= 1350: return 'Guaymas'
    else: return 'Navojoa'

def generate_dummy_data(year, filename):
    sections = range(1, 1500) # Assuming ~1500 sections in Sonora
    
    with open(filename, 'w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(['SECCION', 'MUNICIPIO', 'LISTA_NOMINAL', 'VOTOS_MORENA_Y_ALIADOS', 'VOTOS_OPOSICION', 'VOTOS_NULOS'])
        
        # Use a seed based on section to keep base demographic size consistent across runs
        for section in sections:
            municipio = get_municipio(section)
            
            # Growth simulation
            random.seed(section) # Ensure base_nominal is consistent for the same section
            base_nominal = random.randint(500, 3000)
            
            random.seed(section + year) # Vary the turnout and votes per year
            if year == 2009: nominal = base_nominal
            elif year == 2015: nominal = int(base_nominal * 1.08)
            else: nominal = int(base_nominal * 1.15)
            
            turnout = random.uniform(0.40, 0.65)
            total_votes = int(nominal * turnout)
            
            # Simulated trends
            if year == 2009:
                morena_votes = int(total_votes * random.uniform(0.05, 0.15)) # Low in 2009
            elif year == 2015:
                morena_votes = int(total_votes * random.uniform(0.15, 0.35)) # Growing in 2015
            else: # 2021
                morena_votes = int(total_votes * random.uniform(0.40, 0.60)) # High in 2021
                
            opposition_votes = total_votes - morena_votes - int(total_votes * 0.03) # 3% nulos
            nulos = int(total_votes * 0.03)
            
            writer.writerow([section, municipio, nominal, morena_votes, opposition_votes, nulos])

if __name__ == '__main__':
    os.makedirs('datos_electorales', exist_ok=True)
    generate_dummy_data(2009, 'datos_electorales/resultados_2009.csv')
    generate_dummy_data(2015, 'datos_electorales/resultados_2015.csv')
    generate_dummy_data(2021, 'datos_electorales/resultados_2021.csv')
    print("Datos simulados generados correctamente (Geografía Corregida).")
