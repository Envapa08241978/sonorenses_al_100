'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ContactItem, EventItem } from './types';
import { MultiSelect } from './MultiSelect';

interface BroadcastTabProps {
    contacts: ContactItem[];
    totalContacts: number;
    broadcastVariables: string[];
    setBroadcastVariables: (v: string[]) => void;
    broadcastHeaderImage: string;
    setBroadcastHeaderImage: (v: string) => void;
    broadcastTemplate: string;
    setBroadcastTemplate: (v: string) => void;
    broadcastTestPhone: string;
    setBroadcastTestPhone: (v: string) => void;
    isBroadcasting: boolean;
    broadcastProgress: number;
    broadcastSeccionalFilters: string[];
    setBroadcastSeccionalFilters: (v: string[]) => void;
    broadcastRoleFilters: string[];
    setBroadcastRoleFilters: (v: string[]) => void;
    broadcastSegmentFilters: string[];
    setBroadcastSegmentFilters: (v: string[]) => void;
    uniqueSeccionales: string[];
    handleMetaBroadcast: (contacts: ContactItem[]) => void;
    handleTestBroadcast: () => void;
}

export default function BroadcastTab({
    contacts: initialContacts, totalContacts: initialTotalCount, broadcastVariables, setBroadcastVariables, 
    broadcastHeaderImage, setBroadcastHeaderImage, broadcastTemplate, setBroadcastTemplate,
    broadcastTestPhone, setBroadcastTestPhone, isBroadcasting, broadcastProgress,
    broadcastSeccionalFilters, setBroadcastSeccionalFilters,
    handleMetaBroadcast, handleTestBroadcast
}: BroadcastTabProps) {
    // --- Data state for ALL contacts (bypasses directory pagination) ---
    const [allContacts, setAllContacts] = useState<ContactItem[]>([]);
    const [isLoadingAll, setIsLoadingAll] = useState(true);

    // --- New Updated Filters ---
    const [ciudadFilters, setCiudadFilters] = useState<string[]>([]);
    const [eventoFilters, setEventoFilters] = useState<string[]>([]);
    const [coordinatorFilters, setCoordinatorFilters] = useState<string[]>([]); // Level 4 contact IDs

    const [excludeAlreadySent, setExcludeAlreadySent] = useState(false);
    const [onlyConfirmed, setOnlyConfirmed] = useState(true);

    // --- Fetch ALL contacts on mount ---
    const fetchAllContacts = async () => {
        setIsLoadingAll(true);
        try {
            const res = await fetch('/api/broadcastContacts');
            if (res.ok) {
                const data = await res.json();
                if (data.contacts && Array.isArray(data.contacts)) {
                    setAllContacts(data.contacts);
                }
            }
        } catch (err) {
            console.error('Error fetching broadcast contacts:', err);
        } finally {
            setIsLoadingAll(false);
        }
    };

    useEffect(() => {
        fetchAllContacts();
    }, []);

    // Use loaded allContacts if available, otherwise fallback to prop
    const dataset = allContacts.length > 0 ? allContacts : initialContacts;

    // --- Build Lookup Map & Lists for Filters ---
    const { contactsMap, uniqueCiudades, uniqueSeccionalesList, uniqueEventsList, level4Coordinators } = useMemo(() => {
        const cMap = new Map<string, ContactItem>();
        const ciudadesSet = new Set<string>();
        const seccionalesSet = new Set<string>();
        const eventsSet = new Set<string>();
        const l4List: { label: string; value: string; count: number }[] = [];
        const l4SubordinatesCount = new Map<string, number>();

        dataset.forEach(c => {
            cMap.set(c.id, c);
            if (c.municipio && c.municipio.trim()) ciudadesSet.add(c.municipio.trim());
            if (c.seccional && c.seccional.trim()) seccionalesSet.add(c.seccional.trim());
            if (c.eventName && c.eventName.trim()) eventsSet.add(c.eventName.trim());
            if (Array.isArray(c.eventNames)) {
                c.eventNames.forEach(ev => { if (ev && ev.trim()) eventsSet.add(ev.trim()); });
            }
        });

        // Calculate subordinates per level 4
        dataset.forEach(c => {
            if (c.level === 4) {
                if (!l4SubordinatesCount.has(c.id)) l4SubordinatesCount.set(c.id, 0);
            }
            let curr = c;
            let depth = 0;
            while (curr.parentId && depth < 10) {
                const parent = cMap.get(curr.parentId);
                if (!parent) break;
                if (parent.level === 4) {
                    l4SubordinatesCount.set(parent.id, (l4SubordinatesCount.get(parent.id) || 0) + 1);
                    break;
                }
                curr = parent;
                depth++;
            }
        });

        dataset.forEach(c => {
            if (c.level === 4 || (c.roles && c.roles.includes('Coordinador Territorial'))) {
                const subCount = l4SubordinatesCount.get(c.id) || 0;
                const secText = c.seccional ? ` (Sec. ${c.seccional})` : '';
                l4List.push({
                    label: `👔 ${c.name}${secText} — ${subCount} en red`,
                    value: c.id,
                    count: subCount
                });
            }
        });

        // Sort Coordinadores by subordinates count desc, then name asc
        l4List.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

        return {
            contactsMap: cMap,
            uniqueCiudades: Array.from(ciudadesSet).sort(),
            uniqueSeccionalesList: Array.from(seccionalesSet).sort((a, b) => Number(a) - Number(b) || a.localeCompare(b)),
            uniqueEventsList: Array.from(eventsSet).sort(),
            level4Coordinators: l4List
        };
    }, [dataset]);

    // --- Helper: Check if contact belongs to any selected Level 4 Coordinator ---
    const belongsToSelectedCoordinator = (c: ContactItem, selectedL4Ids: string[]) => {
        if (selectedL4Ids.length === 0) return true;
        if (selectedL4Ids.includes(c.id)) return true;
        
        let curr = c;
        let depth = 0;
        while (curr.parentId && depth < 10) {
            if (selectedL4Ids.includes(curr.parentId)) return true;
            const parent = contactsMap.get(curr.parentId);
            if (!parent) break;
            curr = parent;
            depth++;
        }
        return false;
    };

    // --- Apply Filters ---
    const filteredForBroadcast = useMemo(() => {
        return dataset.filter(c => {
            // 1. Por Ciudad (Municipio)
            const matchCiudad = ciudadFilters.length === 0 || (c.municipio && ciudadFilters.includes(c.municipio.trim()));

            // 2. Por Seccional
            const matchSeccional = broadcastSeccionalFilters.length === 0 || (c.seccional && broadcastSeccionalFilters.includes(c.seccional.trim()));

            // 3. Por Evento
            const contactEvents = [c.eventName, ...(c.eventNames || [])].filter(Boolean);
            const matchEvento = eventoFilters.length === 0 || contactEvents.some(ev => eventoFilters.includes(ev));

            // 4. Por Coordinador Territorial (Nivel 4)
            const matchCoordinator = coordinatorFilters.length === 0 || belongsToSelectedCoordinator(c, coordinatorFilters);

            // Exclusión de plantilla previa
            let matchExcl = true;
            if (excludeAlreadySent && broadcastTemplate) {
                matchExcl = c.lastBroadcastTemplate !== broadcastTemplate.trim();
            }

            // Consentimiento WhatsApp
            const matchConsent = !onlyConfirmed || c.consent === 'yes';

            return matchCiudad && matchSeccional && matchEvento && matchCoordinator && matchExcl && matchConsent;
        });
    }, [dataset, ciudadFilters, broadcastSeccionalFilters, eventoFilters, coordinatorFilters, excludeAlreadySent, broadcastTemplate, onlyConfirmed, contactsMap]);

    const total = filteredForBroadcast.length;

    const handleVariableChange = (index: number, value: string) => {
        const newVars = [...broadcastVariables];
        newVars[index] = value;
        setBroadcastVariables(newVars);
    };

    const addVariable = () => setBroadcastVariables([...broadcastVariables, '']);
    const removeVariable = (index: number) => {
        const newVars = [...broadcastVariables];
        newVars.splice(index, 1);
        setBroadcastVariables(newVars);
    };

    return (
        <div className="p-6 md:p-10 max-w-4xl mx-auto animate-in fade-in duration-500">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 rounded-[40px] shadow-2xl shadow-blue-100 text-white mb-10 relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"/>
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-black mb-2 flex items-center gap-3">
                            <span>📣</span> Difusión Estratégica API Meta
                        </h3>
                        <p className="text-blue-100 text-xs font-bold leading-relaxed opacity-90">
                            Envíe actualizaciones masivas oficiales directamente a la red vía WhatsApp API usando Plantillas aprobadas por Meta.
                        </p>
                    </div>
                    <button 
                        onClick={fetchAllContacts} 
                        disabled={isLoadingAll}
                        className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-2xl text-xs font-black uppercase tracking-wider backdrop-blur transition-all flex items-center gap-2"
                        title="Actualizar lista completa de contactos"
                    >
                        {isLoadingAll ? '⏳ Cargando...' : '🔄 Actualizar Todo'}
                    </button>
                </div>
            </div>

            <div className="space-y-8">
                {/* Configuration: Template & Variables */}
                <div className="bg-white p-8 rounded-[32px] border-2 border-slate-100 shadow-sm">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-3 block">
                        Nombre de la Plantilla (Template Meta)
                    </label>
                    <input 
                        type="text" 
                        value={broadcastTemplate} 
                        onChange={e => setBroadcastTemplate(e.target.value)} 
                        placeholder="Ej. invitacion_eventos" 
                        className="w-full px-8 py-4 rounded-3xl bg-slate-50 border-2 border-transparent focus:border-blue-400 focus:bg-white outline-none font-bold text-slate-700 shadow-inner transition-all mb-4" 
                    />
                    
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-3 block">
                        URL Imagen del Encabezado (Opcional)
                    </label>
                    <input 
                        type="text" 
                        value={broadcastHeaderImage} 
                        onChange={e => setBroadcastHeaderImage(e.target.value)} 
                        placeholder="https://..." 
                        className="w-full px-8 py-4 rounded-3xl bg-slate-50 border-2 border-transparent focus:border-blue-400 focus:bg-white outline-none font-bold text-slate-700 shadow-inner transition-all mb-6" 
                    />

                    <div className="flex items-center justify-between ml-4 mb-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                            Variables de Plantilla (Cuerpo)
                        </label>
                        <button 
                            onClick={addVariable} 
                            className="text-[10px] font-black text-blue-500 uppercase px-3 py-1 bg-blue-50 rounded-full hover:bg-blue-100 transition-all"
                        >
                            + Añadir Variable
                        </button>
                    </div>
                    
                    {broadcastVariables.map((v, i) => (
                        <div key={i} className="flex gap-2 mb-3">
                            <span className="flex items-center justify-center w-12 bg-slate-100 rounded-2xl font-black text-slate-400 text-xs">{`{{${i+1}}}`}</span>
                            <input 
                                type="text" 
                                value={v} 
                                onChange={e => handleVariableChange(i, e.target.value)} 
                                placeholder={i === 0 ? "Ej. {nombre}" : "Valor de la variable"} 
                                className="flex-1 px-6 py-3 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-400 focus:bg-white outline-none font-bold text-slate-700 shadow-inner transition-all" 
                            />
                            <button 
                                onClick={() => removeVariable(i)} 
                                className="w-12 flex items-center justify-center bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 font-bold transition-all"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                    
                    <p className="text-[10px] text-slate-400 mt-2 ml-4 font-bold uppercase tracking-tight">
                        Etiqueta dinámica: <span className="text-blue-600 font-black">{'{nombre}'}</span> será reemplazado por el nombre del contacto en cualquier variable.
                    </p>
                </div>

                {/* --- NUEVOS FILTROS ESTRATÉGICOS --- */}
                <div className="bg-white p-8 rounded-[32px] border-2 border-slate-100 shadow-sm space-y-6">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                            <span>🎯</span> Filtros de Segmentación
                        </h4>
                        <span className="text-[10px] font-bold text-slate-400">
                            Base Total: {dataset.length} contactos
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-20">
                        {/* 1. Por Ciudad (Municipio) */}
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-3 mb-2 flex items-center gap-1 block">
                                <span>🏙️</span> 1. Por Ciudad / Municipio
                            </label>
                            <MultiSelect 
                                placeholder="Todas las ciudades" 
                                options={uniqueCiudades.map(c => ({ label: c, value: c }))} 
                                selected={ciudadFilters} 
                                onChange={setCiudadFilters} 
                            />
                        </div>

                        {/* 2. Por Seccional */}
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-3 mb-2 flex items-center gap-1 block">
                                <span>📍</span> 2. Por Seccional
                            </label>
                            <MultiSelect 
                                placeholder="Todas las seccionales" 
                                options={uniqueSeccionalesList.map(s => ({ label: `Seccional ${s}`, value: s }))} 
                                selected={broadcastSeccionalFilters} 
                                onChange={setBroadcastSeccionalFilters} 
                            />
                        </div>

                        {/* 3. Por Evento */}
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-3 mb-2 flex items-center gap-1 block">
                                <span>⚽</span> 3. Por Evento
                            </label>
                            <MultiSelect 
                                placeholder="Todos los eventos" 
                                options={uniqueEventsList.map(e => ({ label: e, value: e }))} 
                                selected={eventoFilters} 
                                onChange={setEventoFilters} 
                            />
                        </div>

                        {/* 4. Por Coordinador Territorial (Nivel 4) */}
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-3 mb-2 flex items-center gap-1 block">
                                <span>👔</span> 4. Por Coordinador Territorial (Nivel 4)
                            </label>
                            <MultiSelect 
                                placeholder="Todos los coordinadores (Nivel 4)" 
                                options={level4Coordinators.map(c => ({ label: c.label, value: c.value }))} 
                                selected={coordinatorFilters} 
                                onChange={setCoordinatorFilters} 
                            />
                        </div>
                    </div>
                </div>

                {/* Exclusions & Consent Flags */}
                <div className="flex flex-col gap-4 p-6 bg-slate-50 border-2 border-slate-100 rounded-[28px]">
                    <div className="flex items-center gap-3">
                        <input 
                            id="excludeSent" 
                            type="checkbox" 
                            checked={excludeAlreadySent} 
                            onChange={e => setExcludeAlreadySent(e.target.checked)} 
                            className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                        />
                        <label htmlFor="excludeSent" className="text-xs font-black text-slate-600 cursor-pointer select-none">
                            Excluir contactos que ya recibieron la plantilla "{broadcastTemplate || 'ninguna'}"
                        </label>
                    </div>

                    <div className="flex items-center gap-3 pt-3 border-t border-slate-200/60">
                        <input 
                            id="onlyConfirmedCheck" 
                            type="checkbox" 
                            checked={onlyConfirmed} 
                            onChange={e => setOnlyConfirmed(e.target.checked)} 
                            className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                        />
                        <label htmlFor="onlyConfirmedCheck" className="text-xs font-black text-slate-600 cursor-pointer select-none flex items-center gap-2">
                            <span>✅</span> Solo enviar a contactos con WhatsApp Confirmado (Consentimiento Aceptado)
                        </label>
                    </div>
                </div>

                {/* Segmented Counter & Actions */}
                <div className="bg-white border-2 border-slate-50 rounded-[32px] shadow-xl p-8">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
                        <h4 className="font-black text-slate-400 text-[10px] uppercase tracking-widest">
                            PÚBLICO SEGMENTADO
                        </h4>
                        <span className="px-5 py-2 bg-emerald-100 text-emerald-700 font-black text-xs rounded-full uppercase shadow-sm">
                            {isLoadingAll ? '⏳ Cargando base...' : `${total} Contactos`}
                        </span>
                    </div>
                    
                    {isBroadcasting ? (
                        <div className="space-y-4">
                            <div className="flex justify-between text-xs font-bold text-slate-500">
                                <span>Enviando mensajes masivos...</span>
                                <span>{broadcastProgress} / {total}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                                <div 
                                    className="bg-blue-500 h-full transition-all duration-300" 
                                    style={{ width: `${(broadcastProgress / (total || 1)) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Test Box */}
                            <div className="p-6 bg-blue-50/70 rounded-2xl border border-blue-100">
                                <h4 className="font-black text-blue-800 text-[10px] uppercase tracking-widest mb-3">
                                    🛠️ Prueba de Plantilla
                                </h4>
                                <div className="flex gap-2">
                                    <input 
                                        type="tel" 
                                        placeholder="Tu número (Ej. 6629346577)" 
                                        value={broadcastTestPhone}
                                        onChange={e => setBroadcastTestPhone(e.target.value)}
                                        className="flex-1 px-4 py-3 rounded-xl bg-white border border-blue-200 focus:border-blue-500 outline-none font-bold text-sm"
                                    />
                                    <button 
                                        onClick={handleTestBroadcast}
                                        disabled={!broadcastTemplate || !broadcastTestPhone}
                                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-xs hover:bg-blue-700 disabled:opacity-50 uppercase tracking-wider transition-all"
                                    >
                                        Enviar Prueba
                                    </button>
                                </div>
                                <p className="text-[10px] text-blue-600/70 mt-2 font-bold uppercase tracking-tight">
                                    Envíate la plantilla a ti mismo antes de realizar el envío masivo.
                                </p>
                            </div>

                            {/* Main Broadcast Button */}
                            <button 
                                onClick={() => handleMetaBroadcast(filteredForBroadcast)}
                                disabled={total === 0 || !broadcastTemplate || isLoadingAll}
                                className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-200 transition-all uppercase tracking-widest flex items-center justify-center gap-3"
                            >
                                <span>🚀</span> Iniciar Difusión Masiva por Meta API ({total} destinatarios)
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
