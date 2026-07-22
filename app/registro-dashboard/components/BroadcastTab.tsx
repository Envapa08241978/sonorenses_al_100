'use client';

import React, { useState } from 'react';
import { ContactItem } from './types';
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

const allRolesList = ['Protagonista del cambio verdadero', 'Activista digital', 'Defensa del voto'];

export default function BroadcastTab({
    contacts, totalContacts, broadcastVariables, setBroadcastVariables, broadcastHeaderImage, setBroadcastHeaderImage, broadcastTemplate, setBroadcastTemplate,
    broadcastTestPhone, setBroadcastTestPhone, isBroadcasting, broadcastProgress,
    broadcastSeccionalFilters, setBroadcastSeccionalFilters, broadcastRoleFilters,
    setBroadcastRoleFilters, broadcastSegmentFilters, setBroadcastSegmentFilters,
    uniqueSeccionales, handleMetaBroadcast, handleTestBroadcast
}: BroadcastTabProps) {
    const [excludeAlreadySent, setExcludeAlreadySent] = useState(false);
    const [onlyConfirmed, setOnlyConfirmed] = useState(true);

    const filteredForBroadcast = contacts.filter(c => {
        const mS = broadcastSeccionalFilters.length === 0 || broadcastSeccionalFilters.includes(c.seccional || '');
        const mR = broadcastRoleFilters.length === 0 || (c.roles?.some(r => broadcastRoleFilters.includes(r)));
        
        let mSeg = true;
        if (broadcastSegmentFilters.length > 0) {
            mSeg = false;
            if (broadcastSegmentFilters.includes('delfinario')) {
                const contactEvents = Array.from(new Set([...(c.eventNames || []), c.eventName].filter(Boolean)));
                if (contactEvents.includes('ESPECTACULO EN EL DELFINARIO')) {
                    mSeg = true;
                }
            }
            if (broadcastSegmentFilters.includes('hermosillo')) {
                if (c.municipio && c.municipio.toLowerCase().includes('hermosillo')) {
                    mSeg = true;
                }
            }
        }

        let mExcl = true;
        if (excludeAlreadySent && broadcastTemplate) {
            mExcl = c.lastBroadcastTemplate !== broadcastTemplate.trim();
        }

        const mConsent = !onlyConfirmed || c.consent === 'yes';

        return mS && mR && mSeg && mExcl && mConsent;
    });
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
        <div className="p-10 max-w-3xl mx-auto animate-in fade-in duration-500">
            <div className="bg-blue-600 p-8 rounded-[40px] shadow-2xl shadow-blue-100 text-white mb-10 relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"/>
                <h3 className="text-2xl font-black mb-2 flex items-center gap-4"><span>📣</span> Difusion Estrategica API Meta</h3>
                <p className="text-blue-100 text-xs font-bold leading-relaxed opacity-90">Envie actualizaciones masivas oficiales directamente a la red via WhatsApp API usando Plantillas (Templates) aprobadas por Meta.</p>
            </div>

            <div className="space-y-8">
                <div className="relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-3 block">Nombre de la Plantilla (Template Meta)</label>
                    <input type="text" value={broadcastTemplate} onChange={e => setBroadcastTemplate(e.target.value)} placeholder="Ej. invitacion_eventos" className="w-full px-8 py-4 rounded-3xl bg-slate-50 border-2 border-transparent focus:border-blue-400 focus:bg-white outline-none font-bold text-slate-700 shadow-inner transition-all mb-4" />
                    
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-3 block">URL Imagen del Encabezado (Opcional)</label>
                    <input type="text" value={broadcastHeaderImage} onChange={e => setBroadcastHeaderImage(e.target.value)} placeholder="https://..." className="w-full px-8 py-4 rounded-3xl bg-slate-50 border-2 border-transparent focus:border-blue-400 focus:bg-white outline-none font-bold text-slate-700 shadow-inner transition-all mb-6" />

                    <div className="flex items-center justify-between ml-4 mb-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Variables de Plantilla (Cuerpo)</label>
                        <button onClick={addVariable} className="text-[10px] font-black text-blue-500 uppercase px-3 py-1 bg-blue-50 rounded-full hover:bg-blue-100">+ Añadir Variable</button>
                    </div>
                    
                    {broadcastVariables.map((v, i) => (
                        <div key={i} className="flex gap-2 mb-3">
                            <span className="flex items-center justify-center w-12 bg-slate-100 rounded-2xl font-black text-slate-400 text-xs">{`{{${i+1}}}`}</span>
                            <input type="text" value={v} onChange={e => handleVariableChange(i, e.target.value)} placeholder={i === 0 ? "Ej. {nombre}" : "Valor de la variable"} className="flex-1 px-6 py-3 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-400 focus:bg-white outline-none font-bold text-slate-700 shadow-inner transition-all" />
                            <button onClick={() => removeVariable(i)} className="w-12 flex items-center justify-center bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 font-bold">✕</button>
                        </div>
                    ))}
                    
                    <p className="text-[10px] text-slate-400 mt-2 ml-4 font-bold uppercase tracking-tight">Etiqueta dinamica: {'{nombre}'} sera reemplazado por el nombre del contacto en cualquier variable.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-4 mb-2 block">Segmento Especial</label>
                        <MultiSelect placeholder="Todos" options={[
                            { label: 'Solo Hermosillo 📍', value: 'hermosillo' },
                            { label: 'Espectáculo Delfinario 🐬', value: 'delfinario' }
                        ]} selected={broadcastSegmentFilters} onChange={setBroadcastSegmentFilters} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-4 mb-2 block">Filtrar por Seccional</label>
                        <MultiSelect placeholder="Todos los sectores" options={uniqueSeccionales.map(s => ({label: `Seccional ${s}`, value: s}))} selected={broadcastSeccionalFilters} onChange={setBroadcastSeccionalFilters} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-4 mb-2 block">Filtrar por Rol</label>
                        <MultiSelect placeholder="Todos los roles" options={allRolesList.map(r => ({label: r, value: r}))} selected={broadcastRoleFilters} onChange={setBroadcastRoleFilters} />
                    </div>
                </div>

                <div className="flex flex-col gap-4 p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl">
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

                <div className="bg-white border-2 border-slate-50 rounded-[32px] shadow-xl p-8">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
                        <h4 className="font-black text-slate-400 text-[10px] uppercase tracking-widest">Publico Segmentado</h4>
                        <span className="px-4 py-1.5 bg-green-100 text-green-600 font-black text-[10px] rounded-full uppercase">{total} Contactos</span>
                    </div>
                    
                    {isBroadcasting ? (
                        <div className="space-y-4">
                            <div className="flex justify-between text-xs font-bold text-slate-500">
                                <span>Enviando mensajes...</span>
                                <span>{broadcastProgress} / {total}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                                <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${(broadcastProgress / (total || 1)) * 100}%` }}></div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                                <h4 className="font-black text-blue-800 text-[10px] uppercase tracking-widest mb-3">🛠️ Prueba de Plantilla</h4>
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
                                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-xs hover:bg-blue-700 disabled:opacity-50 uppercase tracking-wider"
                                    >
                                        Enviar Prueba
                                    </button>
                                </div>
                                <p className="text-[10px] text-blue-600/70 mt-2 font-bold uppercase tracking-tight">Envíate la plantilla a ti mismo antes de hacer el envío masivo.</p>
                            </div>

                            <button 
                                onClick={() => handleMetaBroadcast(filteredForBroadcast)}
                                disabled={total === 0 || !broadcastTemplate}
                                className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-200 transition-all uppercase tracking-widest flex items-center justify-center gap-3">
                                <span>🚀</span> Iniciar Difusion Masiva por Meta API
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

