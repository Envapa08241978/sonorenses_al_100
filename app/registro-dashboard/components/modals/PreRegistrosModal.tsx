'use client';

import React from 'react';
import * as XLSX from 'xlsx';
import { EventItem } from '../types';

interface PreRegistrosModalProps {
    eventId: string;
    events: EventItem[];
    preRegistrosList: any[];
    isLoadingPreRegistros: boolean;
    onClose: () => void;
}

export default function PreRegistrosModal({ eventId, events, preRegistrosList, isLoadingPreRegistros, onClose }: PreRegistrosModalProps) {
    const exportToExcel = () => {
        if (preRegistrosList.length === 0) {
            alert('No hay pre-registros para exportar.');
            return;
        }
        const wsData = preRegistrosList.map((pr) => ({
            'Folio': pr.folio || '',
            'Nombre': pr.name || '',
            'WhatsApp': pr.phone || '',
            'Estatus': pr.status === 'confirmado' ? 'Confirmado ✅' : pr.status === 'no_asistira' ? 'No Asistirá ❌' : pr.status === 'invitado' ? 'Invitado 📨' : 'Registrado 📝',
            'Calle': pr.calle || '',
            'Num. Ext': pr.numExt || '',
            'Seccional': pr.seccional || '',
            'Roles': (pr.roles || []).join(', '),
            'Invitado Por': pr.parentName || '',
            'Tipo': pr.isNew ? 'Nuevo' : 'Existente',
            'Fecha de Registro': (pr.timestamp || pr.createdAt) ? new Date((pr.timestamp || pr.createdAt).seconds * 1000).toLocaleString() : ''
        }));

        const ws = XLSX.utils.json_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'PreRegistros');
        XLSX.writeFile(wb, `PreRegistros_Evento_${eventId}.xlsx`);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl rounded-[48px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-8 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-3"><span className="text-2xl">📋</span> Pre-registros</h3>
                        <p className="text-xs font-bold text-indigo-600 mt-1">{events.find(e => e.id === eventId)?.name} — {preRegistrosList.length} registros</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl font-black">×</button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto no-scrollbar">
                    {isLoadingPreRegistros ? (
                        <div className="flex justify-center py-20">
                            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {preRegistrosList.length === 0 ? (
                                <div className="py-10 text-center opacity-50 grayscale">
                                    <span className="text-4xl block mb-3">📭</span>
                                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">No hay pre-registros aún</p>
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                        <tr>
                                            <th className="p-4 rounded-l-2xl">Folio</th>
                                            <th className="p-4">Nombre / WhatsApp</th>
                                            <th className="p-4">Estatus</th>
                                            <th className="p-4">Ubicación</th>
                                            <th className="p-4">Roles</th>
                                            <th className="p-4 rounded-r-2xl">Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {preRegistrosList.map((pr) => (
                                            <tr key={pr.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-4">
                                                    <span className="bg-indigo-50 text-indigo-600 font-black px-3 py-1 rounded-lg border border-indigo-100">{pr.folio}</span>
                                                </td>
                                                <td className="p-4">
                                                    <p className="font-bold text-slate-800">{pr.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400">{pr.phone}</p>
                                                    {pr.isNew && <span className="inline-block mt-1 bg-amber-100 text-amber-700 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">NUEVO</span>}
                                                </td>
                                                <td className="p-4">
                                                    {pr.status === 'confirmado' && (
                                                        <span className="inline-block bg-emerald-100 text-emerald-800 text-[9px] font-black px-2.5 py-1 rounded-full border border-emerald-200">CONFIRMADO ✅</span>
                                                    )}
                                                    {pr.status === 'no_asistira' && (
                                                        <span className="inline-block bg-rose-100 text-rose-800 text-[9px] font-black px-2.5 py-1 rounded-full border border-rose-200">NO ASISTIRÁ ❌</span>
                                                    )}
                                                    {pr.status === 'invitado' && (
                                                        <span className="inline-block bg-amber-50 text-amber-700 text-[9px] font-black px-2.5 py-1 rounded-full border border-amber-200">INVITADO 📨</span>
                                                    )}
                                                    {(pr.status === 'registrado' || !pr.status) && (
                                                        <span className="inline-block bg-blue-100 text-blue-800 text-[9px] font-black px-2.5 py-1 rounded-full border border-blue-200">REGISTRADO 📝</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-xs font-medium">
                                                    <p>Calle {pr.calle} #{pr.numExt}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold">SEC: {pr.seccional}</p>
                                                </td>
                                                <td className="p-4 text-[10px] font-bold text-slate-500">
                                                    {(pr.roles || []).join(', ')}
                                                </td>
                                                <td className="p-4 text-[10px] font-medium text-slate-400">
                                                    {(pr.timestamp || pr.createdAt) ? new Date((pr.timestamp || pr.createdAt).seconds * 1000).toLocaleString() : 'N/A'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <button onClick={onClose} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 text-xs font-black rounded-2xl hover:bg-slate-100 transition-all">Cerrar</button>
                    <button onClick={exportToExcel} disabled={isLoadingPreRegistros || preRegistrosList.length === 0} className="px-6 py-3 bg-indigo-600 text-white text-xs font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50">
                        📥 Exportar a Excel
                    </button>
                </div>
            </div>
        </div>
    );
}
