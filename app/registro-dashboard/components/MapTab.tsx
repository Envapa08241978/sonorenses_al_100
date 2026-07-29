'use client';

import React, { useState, useEffect } from 'react';
import { GoogleMap, Polygon, Marker, InfoWindow } from '@react-google-maps/api';
import { ContactItem, LEVEL_STYLES, SONORA_CENTER } from './types';
import { collection, query, onSnapshot, orderBy, doc, deleteDoc, limit } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, deleteObject } from 'firebase/storage';
import * as XLSX from 'xlsx';

interface MapTabProps {
    contacts: ContactItem[];
    accent: string;
    isMapLoaded: boolean;
    statsBySeccional?: Record<string, number> | Record<number, number>;
}

export default function MapTab({ contacts, accent, isMapLoaded, statsBySeccional }: MapTabProps) {
    const [mapData, setMapData] = useState<any>(null);
    const [selectedSector, setSelectedSector] = useState<any>(null);
    const [isLoadingMap, setIsLoadingMap] = useState(true);
    const [media, setMedia] = useState<any[]>([]);
    const [selectedMedia, setSelectedMedia] = useState<any>(null);

    const getSectorCount = (secIdRaw: any): number => {
        if (!statsBySeccional || secIdRaw === undefined || secIdRaw === null) return 0;
        const secStr = String(secIdRaw).trim();
        const secNum = parseInt(secStr, 10);

        if ((statsBySeccional as any)[secStr] !== undefined) {
            return Number((statsBySeccional as any)[secStr]) || 0;
        }
        if (!isNaN(secNum) && (statsBySeccional as any)[secNum] !== undefined) {
            return Number((statsBySeccional as any)[secNum]) || 0;
        }
        return 0;
    };

    const exportEvidenciasToExcel = () => {
        if (media.length === 0) {
            alert('No hay evidencias para exportar.');
            return;
        }

        const rows = media.map(m => {
            let fecha = '---';
            if (m.timestamp) {
                const dt = (m.timestamp as any)?.toDate ? (m.timestamp as any).toDate() : new Date(m.timestamp);
                if (!isNaN(dt.getTime())) {
                    fecha = dt.toLocaleString('es-MX');
                }
            }
            return {
                'Nombre del Brigadista': m.uploaderName || 'Anónimo',
                'ID del Brigadista': m.uploaderId || '---',
                'Tipo': m.type === 'photo' ? 'Foto' : (m.type === 'video' ? 'Video' : m.type || 'Foto'),
                'Latitud': m.lat || '',
                'Longitud': m.lng || '',
                'ID del Evento': m.eventId || '',
                'Nombre de Archivo': m.fileName || '',
                'URL de la Imagen': m.url || '',
                'Fecha de Carga': fecha
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Evidencias');
        XLSX.writeFile(workbook, `Evidencias_en_Campo_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    // LAZY LOAD: Fetch map data
    useEffect(() => {
        setIsLoadingMap(true);
        fetch('/map_data.json')
            .then(res => res.json())
            .then(data => { setMapData(data); setIsLoadingMap(false); })
            .catch(err => { console.error(err); setIsLoadingMap(false); });
    }, []);

    // Fetch media for markers (limited to 150 most recent)
    useEffect(() => {
        const mediaRef = collection(db, 'campaigns', 'main_campaign', 'media');
        const q = query(mediaRef, orderBy('timestamp', 'desc'), limit(150));
        const unsub = onSnapshot(q, (snap) => {
            const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
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
                            const secId = String(t['Sector Comunitario']).trim();
                            const isSelected = selectedSector?.['Sector Comunitario'] === t['Sector Comunitario'];
                            const count = getSectorCount(secId);
                            const hasLocalContacts = contacts.some(c => c.seccional && String(c.seccional).trim() === secId);

                            let fillOpacity = 0;
                            let strokeOpacity = 0.25;
                            let strokeWeight = 0.8;

                            if (isSelected) {
                                fillOpacity = 0.55;
                                strokeOpacity = 0.95;
                                strokeWeight = 3.0;
                            } else if (count > 0) {
                                strokeOpacity = 0.85;
                                strokeWeight = 1.6;
                                if (count >= 100) fillOpacity = 0.65;
                                else if (count >= 30) fillOpacity = 0.48;
                                else if (count >= 10) fillOpacity = 0.32;
                                else fillOpacity = 0.20;
                            } else if (hasLocalContacts) {
                                fillOpacity = 0.18;
                                strokeOpacity = 0.75;
                                strokeWeight = 1.2;
                            }

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
                                <div className="p-2 max-w-[200px] flex flex-col gap-2">
                                    <p className="text-xs font-bold">Subido por: {selectedMedia.uploaderName || 'Brigadista'}</p>
                                    <img src={selectedMedia.url} alt="Evidencia" className="w-full h-auto rounded shadow cursor-pointer" onClick={() => window.open(selectedMedia.url, '_blank')} />
                                    <button 
                                        onClick={async () => {
                                            if (window.confirm('¿Seguro que deseas eliminar esta evidencia? Se borrará la foto y su pin en el mapa.')) {
                                                try {
                                                    await deleteDoc(doc(db, 'campaigns', 'main_campaign', 'media', selectedMedia.id));
                                                    if (selectedMedia.fileName) {
                                                        const sRef = ref(storage, `campaigns/main_campaign/media/${selectedMedia.fileName}`);
                                                        await deleteObject(sRef).catch(() => {});
                                                    }
                                                    setSelectedMedia(null);
                                                } catch (err) {
                                                    console.error('Error deleting:', err);
                                                    alert('Error al borrar la imagen');
                                                }
                                            }
                                        }}
                                        className="w-full py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] shadow-sm transition-colors text-center"
                                    >
                                        🗑️ BORRAR PIN
                                    </button>
                                </div>
                            </InfoWindow>
                        )}
                    </GoogleMap>
                ) : <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 font-black text-slate-300 gap-4"><div className="w-10 h-10 border-4 border-slate-200 border-t-theme rounded-full animate-spin"/>DIBUJANDO CARTOGRAFIA...</div>}
            </div>

            <div className="w-full md:w-[400px] p-6 bg-white border-l border-gray-100 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">📊 Estadísticas de Sector</h3>
                    {media.length > 0 && (
                        <button onClick={exportEvidenciasToExcel} className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold shadow hover:bg-emerald-800 transition-all">
                            📥 Excel Evidencias
                        </button>
                    )}
                </div>

                {/* Selector de Sector */}
                <div className="mb-6">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Selecciona Seccional Electoral</label>
                    <select 
                        value={selectedSector?.['Sector Comunitario'] || ''} 
                        onChange={(e) => {
                            const target = mapData?.targets?.find((t: any) => String(t['Sector Comunitario']) === e.target.value);
                            if (target) setSelectedSector(target);
                        }}
                        className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-700 outline-none focus:border-red-400 transition-colors text-sm"
                    >
                        <option value="">— Seleccionar Seccional —</option>
                        {mapData?.targets?.map((t: any, idx: number) => {
                            const secId = String(t['Sector Comunitario']);
                            const cnt = getSectorCount(secId);
                            return (
                                <option key={idx} value={secId}>
                                    Sección {secId} {cnt > 0 ? `(${cnt} registros)` : ''}
                                </option>
                            );
                        })}
                    </select>
                </div>

                {selectedSector ? (() => {
                    const sectorId = String(selectedSector['Sector Comunitario']);
                    const globalCount = getSectorCount(sectorId);
                    const localContacts = contacts.filter(c => c.seccional && String(c.seccional).trim() === String(sectorId).trim());
                    const displayCount = Math.max(globalCount, localContacts.length);
                    const metaGoal = Math.round(selectedSector['Objetivo de Cobertura (Meta)']) || 0;
                    const progressPercent = metaGoal > 0 ? Math.min(100, Math.round((displayCount / metaGoal) * 100)) : 0;

                    return (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-5">
                            {/* Registrados en Seccional */}
                            <div className="p-5 rounded-2xl bg-gradient-to-br from-red-900 to-amber-900 text-white shadow-lg relative overflow-hidden">
                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-200">Sección Electoral #{sectorId}</p>
                                <div className="flex items-baseline justify-between mt-1">
                                    <p className="text-4xl font-black">{displayCount.toLocaleString()}</p>
                                    <span className="text-xs font-bold text-amber-100">Simpatizantes Registrados</span>
                                </div>
                                {metaGoal > 0 && (
                                    <div className="mt-3">
                                        <div className="flex justify-between text-[10px] font-bold mb-1 text-amber-200">
                                            <span>Avance sobre meta ({metaGoal} req.)</span>
                                            <span>{progressPercent}%</span>
                                        </div>
                                        <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
                                            <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Población Estimada */}
                            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Población Estimada (Padrón)</p>
                                    <p className="text-3xl font-black text-slate-800 mt-1">{selectedSector['Población Estimada (Padrón)']?.toLocaleString() || '0'}</p>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 text-xl">👥</div>
                            </div>

                            {/* Impacto Anterior */}
                            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Votos Anteriores 2024</p>
                                    <p className="text-3xl font-black text-slate-800 mt-1">{selectedSector['Impacto Anteriores (Votos 2024)']?.toLocaleString() || '0'}</p>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 text-xl">📊</div>
                            </div>

                            {/* Objetivo de Cobertura */}
                            <div className="p-5 rounded-2xl border-2 border-red-200 bg-red-50/50 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-2 h-full" style={{ background: accent }} />
                                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: accent }}>Objetivo de Cobertura</p>
                                <p className="text-4xl font-black text-slate-800">{metaGoal.toLocaleString()}</p>
                                <p className="text-[9px] text-slate-400 font-bold mt-1">Enlaces requeridos para el voto en Sección #{sectorId}</p>
                            </div>
                        </div>
                    );
                })() : (
                    <div className="p-8 text-center text-slate-400 rounded-2xl border-2 border-dashed border-slate-200">
                        <span className="text-3xl block mb-2">🗺️</span>
                        <p className="text-sm font-bold">Haz clic en cualquier sección del mapa o elígela en el menú desplegable para ver sus estadísticas de cobertura.</p>
                    </div>
                )}
            </div>
            </div>
        </div>
    );
}
