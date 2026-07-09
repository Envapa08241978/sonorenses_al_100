'use client';

import React from 'react';
import { ContactItem, EventItem, LEVEL_ROLES } from './types';

interface StatsPanelProps {
    contacts: ContactItem[];
    events: EventItem[];
    accent: string;
    filterLevels: number[];
    setFilterLevels: (v: number[]) => void;
    setFilterLevelExact: (v: boolean) => void;
    setActiveTab: (tab: any) => void;
}

export default function StatsPanel({ contacts, events, accent, filterLevels, setFilterLevels, setFilterLevelExact, setActiveTab }: StatsPanelProps) {
    return (
        <div className="space-y-4 md:space-y-6 mb-6 md:mb-10">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-white p-4 md:p-6 rounded-[24px] md:rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                    <div className="absolute -right-4 -top-4 w-16 h-16 md:w-20 md:h-20 bg-red-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" />
                    <p className="text-3xl md:text-4xl font-black text-theme relative z-10">{contacts.length}</p>
                    <p className="text-[9px] md:text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1 md:mt-2 relative z-10">Directorio Total</p>
                </div>
                <div className="bg-white p-4 md:p-6 rounded-[24px] md:rounded-[32px] border border-gray-100 shadow-sm group hover:shadow-lg transition-all cursor-pointer" onClick={() => setActiveTab('map')}>
                    <div className="flex items-center gap-2 md:gap-3">
                        <span className="text-2xl md:text-3xl">🗺️</span>
                        <div>
                            <p className="text-lg md:text-xl font-bold text-gray-800 leading-tight">Mapa</p>
                            <p className="text-[9px] md:text-[10px] text-gray-400 font-black uppercase">Analisis en Vivo</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 md:p-6 rounded-[24px] md:rounded-[32px] border border-gray-100 shadow-sm">
                    <p className="text-3xl md:text-4xl font-black text-theme">{events.length}</p>
                    <p className="text-[9px] md:text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1 md:mt-2">Eventos Activos</p>
                </div>
                <div className="bg-white p-4 md:p-6 rounded-[24px] md:rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-center gap-2 md:gap-4 group" onClick={() => setActiveTab('config')}>
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gray-50 flex items-center justify-center text-xl md:text-2xl group-hover:bg-theme group-hover:text-white transition-all">⚙️</div>
                    <p className="text-[8px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-tight">Configuración</p>
                </div>
            </div>

            {/* Desglose por Nivel */}
            <div className="p-4 md:p-5 rounded-[24px] md:rounded-[32px] shadow-2xl relative overflow-hidden" style={{ background: '#91182e' }}>
                <div className="absolute top-0 right-0 w-40 h-40 md:w-64 md:h-64 bg-white opacity-5 blur-[100px]" />
                <h3 className="text-white font-black text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] mb-3 md:mb-4 flex items-center gap-2">
                    <span className="text-base md:text-lg">📊</span> Estructura de Red
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map(level => {
                        const count = contacts.filter(c => (c.level || 1) === level).length;
                        const levelLabel = LEVEL_ROLES[level] || `Nivel ${level}`;
                        const isActive = filterLevels.length === 1 && filterLevels[0] === level;
                        return (
                            <button
                                key={level}
                                onClick={() => {
                                    if (isActive) {
                                        setFilterLevels([]);
                                        setFilterLevelExact(false);
                                    } else {
                                        setFilterLevels([level]);
                                        setFilterLevelExact(true);
                                        setActiveTab('contacts');
                                    }
                                }}
                                className={`border p-3 rounded-2xl text-center transition-all cursor-pointer group relative ${
                                    isActive
                                        ? 'border-white/80 ring-2 ring-white/60 shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-[1.03]'
                                        : 'border-white/15 hover:bg-white/15 hover:scale-[1.02]'
                                }`}
                                style={{ background: isActive ? 'rgba(255,255,255,0.25)' : `rgba(255,255,255,${0.03 + level * 0.02})` }}
                            >
                                {isActive && (
                                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-lg">
                                        <span className="text-[#91182e] text-[10px] font-black">✓</span>
                                    </div>
                                )}
                                <div className="w-7 h-7 rounded-full mx-auto flex items-center justify-center font-black text-xs mb-1.5 shadow-inner" style={{ background: isActive ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)', color: '#fff' }}>
                                    {level}
                                </div>
                                <p className={`text-2xl font-black text-white mb-0.5 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>{count}</p>
                                <p className="text-white/60 text-[8px] font-black uppercase tracking-wider leading-tight">{levelLabel}</p>
                                {isActive && <p className="text-white/80 text-[7px] font-bold mt-1 uppercase tracking-wider animate-pulse">← Filtrando</p>}
                            </button>
                        );
                    })}
                </div>
                <div className="mt-4 flex items-center justify-center gap-3 text-white/40 text-[10px] font-bold uppercase tracking-widest">
                    {filterLevels.length === 1 ? (
                        <button
                            onClick={() => { setFilterLevels([]); setFilterLevelExact(false); }}
                            className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 rounded-full text-white/80 hover:text-white transition-all"
                        >
                            <span>✕</span>
                            <span>Mostrando: {LEVEL_ROLES[filterLevels[0]]} ({contacts.filter(c => (c.level || 1) === filterLevels[0]).length})</span>
                            <span>— Click para ver todos</span>
                        </button>
                    ) : (
                        <>
                            <span>Total en Red: {contacts.length}</span>
                            <span>•</span>
                            <span>Niveles activos: {new Set(contacts.map(c => c.level || 1)).size}</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
