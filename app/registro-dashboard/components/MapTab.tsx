'use client';

import React, { useState, useEffect } from 'react';
import { GoogleMap, Polygon, Marker, InfoWindow } from '@react-google-maps/api';
import { ContactItem, LEVEL_STYLES, SONORA_CENTER } from './types';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface MapTabProps {
    contacts: ContactItem[];
    accent: string;
    isMapLoaded: boolean;
}

export default function MapTab({ contacts, accent, isMapLoaded }: MapTabProps) {
    const [mapData, setMapData] = useState<any>(null);
    const [selectedSector, setSelectedSector] = useState<any>(null);
    const [isLoadingMap, setIsLoadingMap] = useState(true);
    const [media, setMedia] = useState<any[]>([]);
    const [selectedMedia, setSelectedMedia] = useState<any>(null);

    // LAZY LOAD: Fetch map data
    useEffect(() => {
        setIsLoadingMap(true);
        fetch('/map_data.json')
            .then(res => res.json())
            .then(data => { setMapData(data); setIsLoadingMap(false); })
            .catch(err => { console.error(err); setIsLoadingMap(false); });
    }, []);

    // Fetch media for markers
    useEffect(() => {
        const mediaRef = collection(db, 'campaigns', 'main_campaign', 'media');
        const q = query(mediaRef, orderBy('timestamp', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
            // Only keep media with lat/lng
            setMedia(fetched.filter((m: any) => m.lat && m.lng));
        });
        return () => unsub();
    }, []);

    return (
        <div className="flex flex-col gap-6 overflow-y-auto pb-10">
            <div className="h-[750px] flex flex-col md:flex-row animate-in slide-in-from-right duration-500 rounded-2xl overflow-hidden shadow-sm border border-slate-200">
                <div className="flex-1 bg-slate-100 relative">
                {isMapLoaded && mapData ? (
                    <GoogleMap mapContainerStyle={{width:'100%', height:'100%'}} center={SONORA_CENTER} zoom={7} options={{disableDefaultUI:true, styles:[{featureType:'poi', elementType:'labels', stylers:[{visibility:'off'}]}]}}>
                        {mapData.targets?.map((t:any, idx:number) => {
                            const isSelected = selectedSector?.['Sector Comunitario'] === t['Sector Comunitario'];
                            const hasContacts = contacts.some(c => c.seccional && String(c.seccional).trim() === String(t['Sector Comunitario']).trim());
                            
                            const fillOpacity = isSelected ? 0.4 : (hasContacts ? 0.18 : 0);
                            const strokeOpacity = isSelected ? 0.9 : (hasContacts ? 0.75 : 0.25);
                            const strokeWeight = isSelected ? 2.5 : (hasContacts ? 1.2 : 0.8);

                            return (
                                <Polygon 
                                    key={`poly-${idx}`} 
                                    paths={t.geometry} 
                                    options={{
                                        fillColor: accent, 
                                        fillOpacity, 
                                        strokeColor: accent, 
                                        strokeWeight,
                                        strokeOpacity
                                    }} 
                                    onClick={() => setSelectedSector(t)} 
                                />
                            );
                        })}
                        
                        {/* Media Markers */}
                        {media.map((m) => (
                            <Marker
                                key={`marker-${m.id}`}
                                position={{ lat: m.lat, lng: m.lng }}
                                onClick={() => setSelectedMedia(m)}
                                icon={{
                                    url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                                }}
                            />
                        ))}

                        {selectedMedia && (
                            <InfoWindow
                                position={{ lat: selectedMedia.lat, lng: selectedMedia.lng }}
                                onCloseClick={() => setSelectedMedia(null)}
                            >
                                <div className="p-2 max-w-[200px]">
                                    <p className="text-xs font-bold mb-2">Subido por: {selectedMedia.uploaderName || 'Brigadista'}</p>
                                    <img src={selectedMedia.url} alt="Evidencia" className="w-full h-auto rounded shadow" />
                                </div>
                            </InfoWindow>
                        )}
                    </GoogleMap>
                ) : <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 font-black text-slate-300 gap-4"><div className="w-10 h-10 border-4 border-slate-200 border-t-theme rounded-full animate-spin"/>DIBUJANDO CARTOGRAFIA...</div>}
            </div>
            <div className="w-full md:w-[400px] p-6 bg-white border-l border-gray-100 overflow-y-auto">
                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">📊 Estadísticas de Sector</h3>

                {/* Selector de Sector */}
                <div className="mb-6">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Selecciona Sector Comunitario</label>
                    <select 
                        value={selectedSector?.['Sector Comunitario'] || ''} 
                        onChange={(e) => {
                            const target = mapData?.targets?.find((t: any) => String(t['Sector Comunitario']) === e.target.value);
                            if (target) setSelectedSector(target);
                        }}
                        className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-700 outline-none focus:border-red-400 transition-colors"
                    >
                        <option value="">— Seleccionar —</option>
                        {mapData?.targets?.map((t: any, idx: number) => (
                            <option key={idx} value={t['Sector Comunitario']}>Sector {t['Sector Comunitario']}</option>
                        ))}
                    </select>
                </div>

                {selectedSector ? (() => {
                    const sectorId = String(selectedSector['Sector Comunitario']);
                    const sectorContacts = contacts.filter(c => c.seccional === sectorId);
                    const brigadistasCount = sectorContacts.filter(c => (c.level || 1) >= 1 && (c.level || 1) <= 6).length;
                    const totalParticipantes = sectorContacts.length;

                    return (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-5">
                            {/* Población Estimada */}
                            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Población Estimada</p>
                                    <p className="text-3xl font-black text-slate-800 mt-1">{selectedSector['Población Estimada (Padrón)']?.toLocaleString() || '0'}</p>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 text-xl">👥</div>
                            </div>

                            {/* Impacto Anterior */}
                            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Impacto Anterior</p>
                                    <p className="text-3xl font-black text-slate-800 mt-1">{selectedSector['Impacto Anteriores (Votos 2024)']?.toLocaleString() || '0'}</p>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 text-xl">📊</div>
                            </div>

                            {/* Objetivo de Cobertura */}
                            <div className="p-5 rounded-2xl border-2 border-red-200 bg-red-50/50 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-2 h-full" style={{ background: accent }} />
                                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: accent }}>Objetivo de Cobertura</p>
                                <p className="text-4xl font-black text-slate-800">{Math.round(selectedSector['Objetivo de Cobertura (Meta)'])?.toLocaleString() || '0'}</p>
                                <p className="text-[9px] text-slate-400 font-bold mt-1">Enlaces requeridos para el voto</p>
                            </div>

                            {/* Brigadistas en Seccional */}
                            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Brigadistas en Seccional {sectorId}</p>
                                    <span className="text-2xl font-black" style={{ color: accent }}>{brigadistasCount}</span>
                                </div>
                                {brigadistasCount > 0 ? (
                                    <div className="space-y-1.5">
                                        {[6, 5, 4, 3, 2, 1].map(lvl => {
                                            const count = sectorContacts.filter(c => (c.level || 1) === lvl).length;
                                            if (count === 0) return null;
                                            const style = LEVEL_STYLES[lvl] || LEVEL_STYLES[1];
                                            return (
                                                <div key={lvl} className="flex items-center justify-between py-1.5 px-3 rounded-xl" style={{ background: `${style.bg}15` }}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ background: style.bg }}>{lvl}</span>
                                                        <span className="text-[10px] font-bold text-slate-600">{style.label}</span>
                                                    </div>
                                                    <span className="text-sm font-black text-slate-700">{count}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 font-medium">No hay brigadistas asignados a este seccional.</p>
                                )}
                            </div>

                            {/* Total de Participantes */}
                            <div className="pt-4 border-t border-slate-100 text-center">
                                <h4 className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-4">Total de Participantes</h4>
                                <div className="w-28 h-28 mx-auto rounded-full border-[8px] border-slate-50 flex items-center justify-center bg-white shadow-xl relative">
                                    <span className="text-4xl font-black" style={{ color: accent }}>{totalParticipantes}</span>
                                </div>
                                <p className="text-[9px] text-slate-400 font-bold mt-3">Conteo real de teléfonos únicos asignados al Seccional / Sector {sectorId}.</p>
                            </div>
                        </div>
                    );
                })() : (
                    <div className="py-16 text-center opacity-30 grayscale saturate-0">
                        <span className="text-6xl block mb-6">🖱️</span>
                        <p className="font-black text-slate-400 uppercase text-xs tracking-[0.2em] leading-relaxed">Selecciona un sector<br/>en el mapa o en el<br/>dropdown para ver<br/>analíticas de campo</p>
                    </div>
                )}
            </div>
            </div>
            
            {/* Gallery Section */}
            {media.length > 0 && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-5">
                    <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">📸 Galería de Evidencias en Campo</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {media.map((m) => (
                            <div key={`gallery-${m.id}`} className="group relative rounded-xl overflow-hidden shadow border border-slate-100 aspect-square cursor-pointer hover:shadow-lg transition-all" onClick={() => window.open(m.url, '_blank')}>
                                <img src={m.url} alt="Evidencia" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                    <p className="text-white text-[10px] font-bold line-clamp-2">{m.uploaderName || 'Brigadista'}</p>
                                    <p className="text-white/70 text-[8px] mt-1">{new Date(m.timestamp).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
