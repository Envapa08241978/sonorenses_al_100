'use client';

import React from 'react';
import { EventItem } from './types';

interface EventsTabProps {
    events: EventItem[];
    config: any;
    handleSetActiveEvent: (id: string) => void;
    handleDifundir: (ev: EventItem) => void;
    setEditingEventId: (id: string | null) => void;
    setEventForm: (form: any) => void;
    setShowEventForm: (v: boolean) => void;
    setInvitationEventId: (id: string | null) => void;
    setInvitationSentContacts: (v: any) => void;
    handleOpenPreRegistros: (eventId: string) => void;
    exportDominadasToExcel: () => void;
    deleteEvent: (id: string) => void;
}

export default function EventsTab({
    events, config, handleSetActiveEvent, handleDifundir, setEditingEventId,
    setEventForm, setShowEventForm, setInvitationEventId, setInvitationSentContacts,
    handleOpenPreRegistros, exportDominadasToExcel, deleteEvent
}: EventsTabProps) {
    return (
        <div className="p-10 bg-slate-50/50 min-h-[700px] animate-in zoom-in-95 duration-500">
            <div className="flex gap-4 mb-12">
                <button onClick={() => { setEditingEventId(null); setEventForm({name:'', targetSeccionales:[]}); setShowEventForm(true); }} className="flex-1 bg-slate-900 shadow-2xl shadow-slate-200 text-white py-6 rounded-[32px] font-black text-sm hover:bg-black hover:scale-[1.01] active:scale-95 transition-all uppercase tracking-widest">Crear Nueva Asamblea</button>
                <button onClick={exportDominadasToExcel} className="flex-1 bg-emerald-600 shadow-2xl shadow-emerald-100 text-white py-6 rounded-[32px] font-black text-sm hover:bg-emerald-700 hover:scale-[1.01] active:scale-95 transition-all uppercase tracking-widest flex items-center justify-center gap-3">
                    <span>⚽</span> Descargar Registros Dominadas
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {events.map(e => (
                    <div key={e.id} className="bg-white border border-slate-100 rounded-[40px] overflow-hidden shadow-xl group hover:shadow-2xl transition-all duration-300 relative">
                        {config.activeEventId === e.id && <div className="absolute top-4 right-4 z-10 bg-emerald-500 text-white text-[8px] font-black px-4 py-1.5 rounded-full shadow-lg animate-pulse uppercase">Activo en Portal</div>}
                        <div className="h-48 bg-slate-200 relative overflow-hidden">
                            {e.image ? <img src={e.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /> : <div className="w-full h-full flex items-center justify-center text-5xl">🏛️</div>}
                        </div>
                        <div className="p-8">
                            <h4 className="font-black text-slate-800 text-xl mb-2 truncate">{e.name}</h4>
                            <div className="flex flex-col gap-1 mb-8">
                                <p className="text-xs text-slate-500 font-bold flex items-center gap-2"><span>📅</span> {e.date || 'Sin fecha'}</p>
                                <p className="text-xs text-slate-400 font-medium truncate">📍 {e.location}</p>
                            </div>
                            {/* Activate Toggle */}
                            <button onClick={() => handleSetActiveEvent(e.id)} className={`w-full py-3.5 text-[10px] font-black rounded-2xl border transition-all uppercase tracking-widest mb-3 ${config.activeEventId === e.id ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-100' : 'text-slate-400 border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}>
                                {config.activeEventId === e.id ? '✅ Evento Activo en Portal' : '⚡ Activar en Portal Público'}
                            </button>

                            {/* Permanent Link */}
                            {config.activeEventId === e.id && (
                                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 mb-3">
                                    <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1 text-center">🔗 Link de Registro Activo (QR Permanente)</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-[10px] font-mono text-emerald-700 font-bold truncate flex-1">{typeof window !== 'undefined' ? `${window.location.origin}/registro` : '/registro'}</p>
                                        <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/registro`); alert('Link copiado 📋'); }} className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded-lg text-[9px] font-black hover:bg-emerald-200 transition-colors">📋</button>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <button onClick={() => { setInvitationEventId(e.id); setInvitationSentContacts(new Set(e.sentInvitations || [])); }} className="flex-1 py-3 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-2xl hover:bg-emerald-600 hover:text-white transition-all uppercase border border-emerald-100">📨 Invitar</button>
                                    <button onClick={() => handleDifundir(e)} className="flex-1 py-3 text-[10px] font-black rounded-2xl border border-blue-200 text-blue-500 hover:bg-blue-500 hover:text-white transition-all uppercase bg-blue-50">📢 Difundir</button>
                                    <button onClick={() => { setEditingEventId(e.id); setEventForm(e); setShowEventForm(true); }} className="p-3 rounded-2xl bg-amber-50 text-amber-500 border border-amber-100 hover:bg-amber-500 hover:text-white transition-all" title="Editar Asamblea">✏️</button>
                                    <button onClick={() => deleteEvent(e.id)} className="p-3 rounded-2xl bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-500 hover:text-white transition-all" title="Eliminar Asamblea">🗑️</button>
                                </div>
                                <button onClick={() => handleOpenPreRegistros(e.id)} className="w-full py-3 text-[10px] font-black rounded-2xl border border-indigo-200 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all uppercase bg-indigo-50 flex items-center justify-center gap-2">
                                    <span>📋</span> Ver Pre-registros
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
