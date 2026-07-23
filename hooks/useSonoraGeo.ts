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

export function useSonoraGeo() {
    const [catalog, setCatalog] = useState<SonoraCatalog | null>(cachedCatalog);
    const [isLoading, setIsLoading] = useState(!cachedCatalog);

    useEffect(() => {
        if (cachedCatalog) {
            setCatalog(cachedCatalog);
            setIsLoading(false);
            return;
        }

        const fetchCatalog = async () => {
            try {
                const res = await fetch('/data/sonora_catalog.json');
                if (res.ok) {
                    const data: SonoraCatalog = await res.json();
                    cachedCatalog = data;
                    setCatalog(data);
                }
            } catch (err) {
                console.error("Error loading Sonora catalog:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCatalog();
    }, []);

    const municipiosList = catalog ? Object.keys(catalog.municipios).sort() : [];

    const getColoniasForMunicipio = (municipio: string): ColoniaItem[] => {
        if (!catalog || !municipio) return [];
        const mKey = Object.keys(catalog.municipios).find(
            k => k.toLowerCase() === municipio.trim().toLowerCase()
        );
        return mKey ? catalog.municipios[mKey].colonias : [];
    };

    const getCpsForMunicipio = (municipio: string): string[] => {
        if (!catalog || !municipio) return [];
        const mKey = Object.keys(catalog.municipios).find(
            k => k.toLowerCase() === municipio.trim().toLowerCase()
        );
        return mKey ? catalog.municipios[mKey].codigos_postales : [];
    };

    const findCpForColonia = (municipio: string, colonia: string): string => {
        const colonias = getColoniasForMunicipio(municipio);
        const matched = colonias.find(c => c.colonia.toLowerCase() === colonia.trim().toLowerCase());
        return matched ? matched.cp : '';
    };

    return {
        catalog,
        isLoading,
        municipiosList,
        getColoniasForMunicipio,
        getCpsForMunicipio,
        findCpForColonia,
    };
}
