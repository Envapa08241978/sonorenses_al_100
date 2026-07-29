'use client';

import { useState, useEffect } from 'react';

export interface ColoniaItem {
    colonia: string;
    tipo: string;
    cp: string;
    ciudad?: string;
}

export interface MunicipioData {
    municipio: string;
    total_colonias: number;
    codigos_postales: string[];
    colonias: ColoniaItem[];
}

export interface SonoraCatalog {
    estado: string;
    total_municipios: number;
    total_registros_colonias: number;
    municipios: Record<string, MunicipioData>;
}

let cachedCatalog: SonoraCatalog | null = null;
let cachedSectionsMap: Record<string, string[]> | null = null;

const CITY_MUNICIPIO_ALIASES: Record<string, string> = {
    'ciudad obregón': 'Cajeme',
    'heroica nogales': 'Nogales',
    'heroica guaymas': 'Guaymas',
    'heroica caborca': 'Caborca',
    'heroica ciudad de cananea': 'Cananea',
    'magdalena de kino': 'Magdalena',
    'sonoita': 'General Plutarco Elías Calles',
};

export function useSonoraGeo() {
    const [catalog, setCatalog] = useState<SonoraCatalog | null>(cachedCatalog);
    const [sectionsMap, setSectionsMap] = useState<Record<string, string[]> | null>(cachedSectionsMap);
    const [isLoading, setIsLoading] = useState(!cachedCatalog);

    useEffect(() => {
        if (cachedCatalog && cachedSectionsMap) {
            setCatalog(cachedCatalog);
            setSectionsMap(cachedSectionsMap);
            setIsLoading(false);
            return;
        }

        const fetchGeoData = async () => {
            try {
                const [catRes, secRes] = await Promise.all([
                    fetch('/data/sonora_catalog.json'),
                    fetch('/data/sonora_sections.json').catch(() => null)
                ]);

                if (catRes && catRes.ok) {
                    const data = await catRes.json();
                    if (data && data.municipios && typeof data.municipios === 'object') {
                        cachedCatalog = data as SonoraCatalog;
                        setCatalog(data as SonoraCatalog);
                    }
                }

                if (secRes && secRes.ok) {
                    const secData: Record<string, string[]> = await secRes.json();
                    if (secData && typeof secData === 'object') {
                        cachedSectionsMap = secData;
                        setSectionsMap(secData);
                    }
                }
            } catch (err) {
                console.error("Error loading Sonora geo data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchGeoData();
    }, []);

    const municipiosList = (catalog && catalog.municipios) ? Object.keys(catalog.municipios).sort() : [];

    const resolveMunicipioKey = (municipio: string): string => {
        if (!municipio) return '';
        const clean = municipio.trim().toLowerCase();
        if (CITY_MUNICIPIO_ALIASES[clean]) {
            return CITY_MUNICIPIO_ALIASES[clean];
        }
        if (catalog && catalog.municipios) {
            const matched = Object.keys(catalog.municipios).find(
                k => k.toLowerCase() === clean
            );
            if (matched) return matched;
        }
        if (sectionsMap) {
            const matchedSec = Object.keys(sectionsMap).find(
                k => k.toLowerCase() === clean
            );
            if (matchedSec) return matchedSec;
        }
        return municipio.trim();
    };

    const getColoniasForMunicipio = (municipio: string): ColoniaItem[] => {
        if (!catalog || !catalog.municipios || !municipio) return [];
        const mKey = resolveMunicipioKey(municipio);
        const match = Object.keys(catalog.municipios).find(
            k => k.toLowerCase() === mKey.toLowerCase()
        );
        return match ? catalog.municipios[match].colonias : [];
    };

    const getCpsForMunicipio = (municipio: string): string[] => {
        if (!catalog || !catalog.municipios || !municipio) return [];
        const mKey = resolveMunicipioKey(municipio);
        const match = Object.keys(catalog.municipios).find(
            k => k.toLowerCase() === mKey.toLowerCase()
        );
        return match ? catalog.municipios[match].codigos_postales : [];
    };

    const getSeccionesForMunicipio = (municipio: string): string[] => {
        if (!sectionsMap || !municipio) return [];
        const mKey = resolveMunicipioKey(municipio);
        const match = Object.keys(sectionsMap).find(
            k => k.toLowerCase() === mKey.toLowerCase()
        );
        return match ? sectionsMap[match] : [];
    };

    const findCpForColonia = (municipio: string, colonia: string): string => {
        const colonias = getColoniasForMunicipio(municipio);
        const matched = colonias.find(c => c.colonia.toLowerCase() === colonia.trim().toLowerCase());
        return matched ? matched.cp : '';
    };

    return {
        catalog,
        sectionsMap,
        isLoading,
        municipiosList,
        getColoniasForMunicipio,
        getCpsForMunicipio,
        getSeccionesForMunicipio,
        findCpForColonia,
    };
}
