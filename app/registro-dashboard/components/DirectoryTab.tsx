'use client';

import React, { useState, useEffect } from 'react';
import { ContactItem, LEVEL_STYLES, LEVEL_ROLES } from './types';
import { MultiSelect } from './MultiSelect';
import * as XLSX from 'xlsx';

interface DirectoryTabProps {
    contacts: ContactItem[];
    sortedContacts: ContactItem[];
    filteredContacts: ContactItem[];
    searchQuery: string;
    setSearchQuery: (v: string) => void;
    filterLevels: number[];
    setFilterLevels: (v: number[]) => void;
    filterSeccionales: string[];
    setFilterSeccionales: (v: string[]) => void;
    filterColonias: string[];
    setFilterColonias: (v: string[]) => void;
    filterEvents: string[];
    setFilterEvents: (v: string[]) => void;
    filterOnlyOrphans: boolean;
    setFilterOnlyOrphans: (v: boolean) => void;
    uniqueSeccionales: string[];
    uniqueColonias: string[];
    uniqueEventNames: string[];
    config: any;
    handleWhatsApp: (c: ContactItem) => void;
    handleSendQR: (c: ContactItem) => void;
    handlePromote: (c: ContactItem) => void;
    handleDemote: (c: ContactItem) => void;
    handleReassign: (id: string, newParentId: string) => void;
    setEditingContact: (c: ContactItem | null) => void;
    setSelectedQRContact: (c: ContactItem | null) => void;
    deleteContact: (id: string) => void;
    handleImportContacts?: (contacts: any[]) => void;
}

export default function DirectoryTab({
    contacts, sortedContacts, filteredContacts, searchQuery, setSearchQuery,
    filterLevels, setFilterLevels, filterSeccionales, setFilterSeccionales,
    filterColonias, setFilterColonias, filterEvents, setFilterEvents,
    filterOnlyOrphans, setFilterOnlyOrphans, uniqueSeccionales, uniqueColonias,
    uniqueEventNames, config, handleWhatsApp, handleSendQR, handlePromote,
    handleDemote, handleReassign, setEditingContact, setSelectedQRContact, deleteContact, handleImportContacts
}: DirectoryTabProps) {
    // --- Pagination ---
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 50;
    const totalPages = Math.ceil(sortedContacts.length / pageSize);
    const paginatedContacts = sortedContacts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterLevels, filterSeccionales, filterColonias, filterEvents, filterOnlyOrphans]);

    const exportToExcel = () => {
        if (filteredContacts.length === 0) {
            alert('No hay contactos para exportar.');
            return;
        }

        const contactsMap = new Map(contacts.map(item => [item.id, item]));

        const rows = filteredContacts.map(c => {
            let fecha = '---';
            if (c.timestamp) {
                const dt = (c.timestamp as any)?.toDate ? (c.timestamp as any).toDate() : new Date(c.timestamp);
                if (!isNaN(dt.getTime())) {
                    fecha = dt.toLocaleString('es-MX');
                }
            }

            // Inicializar la cadena jerárquica para niveles del 1 al 5
            const levelsPath: Record<number, string> = {
                1: '---',
                2: '---',
                3: '---',
                4: '---',
                5: '---',
            };

            // Poner el nombre en su respectivo nivel
            if (c.level && c.level >= 1 && c.level <= 5) {
                levelsPath[c.level] = c.name;
            }

            // Subir por el árbol de referidos
            let current = c;
            let depth = 0;
            while (current.parentId && depth < 20) {
                const parent = contactsMap.get(current.parentId);
                if (!parent) break;
                if (parent.level && parent.level >= 1 && parent.level <= 5) {
                    levelsPath[parent.level] = parent.name;
                }
                current = parent;
                depth++;
            }

            const colNivel5 = LEVEL_ROLES[5] ? `Nivel 5: ${LEVEL_ROLES[5]}` : 'Nivel 5';
            const colNivel4 = LEVEL_ROLES[4] ? `Nivel 4: ${LEVEL_ROLES[4]}` : 'Nivel 4';
            const colNivel3 = LEVEL_ROLES[3] ? `Nivel 3: ${LEVEL_ROLES[3]}` : 'Nivel 3';
            const colNivel2 = LEVEL_ROLES[2] ? `Nivel 2: ${LEVEL_ROLES[2]}` : 'Nivel 2';
            const colNivel1 = LEVEL_ROLES[1] ? `Nivel 1: ${LEVEL_ROLES[1]}` : 'Nivel 1';

            return {
                'ID': c.id,
                'Nombre': c.name,
                'WhatsApp': c.phone,
                'Calle': c.calle || '',
                'Num Ext': c.numExt || '',
                'Num Int': c.numInt || '',
                'Colonia': c.colonia || '',
                'Código Postal': c.cp || '',
                'Municipio': c.municipio || '',
                'Seccional': c.seccional || '',
                'Distrito': c.distrito || '',
                'Invitado Por': c.invitedBy || '',
                'Consentimiento': c.consent || 'no_definido',
                'Origen': c.source || '',
                'Fecha Registro': fecha,
                'Rol': LEVEL_ROLES[c.level || 1] || `Nivel ${c.level || 1}`,
                [colNivel5]: levelsPath[5],
                [colNivel4]: levelsPath[4],
                [colNivel3]: levelsPath[3],
                [colNivel2]: levelsPath[2],
                [colNivel1]: levelsPath[1]
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Directorio");
        XLSX.writeFile(workbook, `directorio-${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    const exportToVCF = () => {
        const vcards = filteredContacts.map(c => {
            const nameParts = c.name.trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            const cleanPhone = c.phone?.replace(/\D/g, '') || '';
            const seccional = c.seccional ? `Seccional ${c.seccional}` : '';
            const rol = LEVEL_ROLES[c.level || 1] || 'Ciudadano';
            const calle = c.calle ? `${c.calle}${c.numExt ? ' #' + c.numExt : ''}` : '';
            const colonia = c.colonia || '';
            return [
                'BEGIN:VCARD',
                'VERSION:3.0',
                `N:${lastName};${firstName};;;`,
                `FN:${c.name}`,
                cleanPhone ? `TEL;TYPE=CELL:+52${cleanPhone}` : '',
                `ORG:${config.name || 'Red Ciudadana'}`,
                `TITLE:${rol}${seccional ? ' - ' + seccional : ''}`,
                seccional || calle || colonia ? `NOTE:${[rol, seccional, calle, colonia].filter(Boolean).join(' | ')}` : '',
                calle || colonia ? `ADR;TYPE=HOME:;;${calle};${colonia};;;;México` : '',
                'END:VCARD',
            ].filter(Boolean).join('\r\n');
        }).join('\r\n');
        const blob = new Blob([vcards], { type: 'text/vcard;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `contactos-${config.name?.replace(/\s+/g, '-') || 'red'}-${new Date().toISOString().slice(0,10)}.vcf`;
        link.click();
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([{
            Nombre: '',
            Celular: '',
            Nivel: '',
            Seccion: '',
            Colonia: '',
            Calle: '',
            NumExt: '',
            Municipio: '',
            'Celular Lider': '',
            'Invitado Por': ''
        }]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla Importacion");
        XLSX.writeFile(wb, "Plantilla_Contactos.xlsx");
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);
            if (handleImportContacts) {
                handleImportContacts(data);
            }
            e.target.value = ''; // Reset input
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500">
            <div className="p-8 bg-gray-50/50 border-b border-gray-100 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-4 flex-1">
                    <div className="flex-1 min-w-[300px]">
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Filtrar por nombre o celular..." className="w-full px-8 py-4 rounded-3xl bg-white border border-gray-200 outline-none focus:border-red-400 font-bold text-gray-700 shadow-inner" />
                    </div>
                    <MultiSelect placeholder="Filtro de Nivel" options={Object.entries(LEVEL_ROLES).map(([level, role]) => ({label: `Nivel ${level} - ${role}`, value: Number(level)}))} selected={filterLevels} onChange={setFilterLevels} />
                    <MultiSelect placeholder="Filtro de Seccion" options={uniqueSeccionales.map(s => ({label: `Seccional ${s}`, value: s}))} selected={filterSeccionales} onChange={setFilterSeccionales} />
                    <MultiSelect placeholder="Filtro de Colonia" options={uniqueColonias.map(c => ({label: c, value: c}))} selected={filterColonias} onChange={setFilterColonias} />
                    <MultiSelect placeholder="Filtro de Evento" options={uniqueEventNames.map(e => ({label: e, value: e}))} selected={filterEvents} onChange={setFilterEvents} />
                    <button onClick={() => setFilterOnlyOrphans(!filterOnlyOrphans)} className={`px-6 py-4 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all shadow-sm ${filterOnlyOrphans ? 'bg-orange-600 text-white' : 'bg-white text-gray-400 border border-gray-100'}`}>👤 Sin Lider</button>
                </div>
                <div className="flex gap-3">
                    <button onClick={downloadTemplate} className="px-6 py-4 rounded-3xl bg-gray-600 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-gray-700 transition-all shadow-xl shadow-gray-200">Plantilla</button>
                    <label className="px-6 py-4 rounded-3xl bg-green-600 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-green-700 transition-all shadow-xl shadow-green-200 cursor-pointer flex items-center">
                        IMPORTAR
                        <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} />
                    </label>
                    <button onClick={exportToExcel} className="px-8 py-4 rounded-3xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-100">Exportar Excel</button>
                    <button onClick={exportToVCF} className="px-8 py-4 rounded-3xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center gap-2">📱 Exportar Contactos</button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-white text-gray-300 text-[10px] font-black uppercase tracking-[0.2em] border-b border-gray-100">
                        <tr>
                            <th className="px-10 py-6">ID / Nombre</th>
                            <th className="px-6 py-6">Red / Nivel</th>
                            <th className="px-6 py-6">Estructura Superior</th>
                            <th className="px-6 py-6">Geo / Contacto</th>
                            <th className="px-10 py-6 text-center">Gestion</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {paginatedContacts.map(c => {
                            const lStyle = LEVEL_STYLES[c.level || 1] || LEVEL_STYLES[1];
                            const isChild = !!c.parentId;
                            const indent = Math.max(0, (10 - (c.level || 1)) * 16);

                            return (
                                <tr key={c.id} className="group hover:bg-slate-50/60 transition-all border-b border-gray-50 last:border-0">
                                    <td className="px-10 py-6">
                                        <div className="flex items-start gap-3" style={{ paddingLeft: `${indent}px` }}>
                                            {isChild && <span className="text-gray-300 font-mono mt-1 text-lg">└─</span>}
                                            <div>
                                                <p className="font-black text-slate-800 text-sm group-hover:text-theme transition-colors">{c.name}</p>
                                                
                                                {/* Roles de Participación */}
                                                {c.roles && c.roles.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                        {c.roles.map((r, i) => (
                                                            <span key={i} className="text-[7.5px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                                                                {r}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Registro y Asistencia */}
                                                <div className="flex flex-col gap-0.5 mt-2">
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase truncate max-w-[200px]">
                                                        📅 Alta: {(() => {
                                                            if (!c.timestamp) return '---';
                                                            const dt = (c.timestamp as any)?.toDate ? (c.timestamp as any).toDate() : new Date(c.timestamp);
                                                            return isNaN(dt.getTime()) ? '---' : dt.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
                                                        })()}
                                                    </p>
                                                    {c.eventNames && c.eventNames.length > 0 && (
                                                        <div className="relative group/events">
                                                            <p className="text-[9px] text-emerald-500 font-black uppercase cursor-help hover:text-emerald-600 transition-colors">
                                                                🚩 {c.eventNames.length} Evento(s) asistidos
                                                            </p>
                                                            {/* Tooltip elegante */}
                                                            <div className="invisible group-hover/events:visible absolute left-0 top-full mt-1 z-50 w-64 bg-white p-3 rounded-2xl shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
                                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b pb-1">Historial de Asistencia</p>
                                                                <div className="space-y-1.5">
                                                                    {c.eventNames.map((ev, i) => (
                                                                        <div key={i} className="flex items-start gap-2">
                                                                            <span className="text-emerald-500 text-[10px] mt-0.5">✓</span>
                                                                            <p className="text-[10px] font-bold text-slate-700 leading-tight">{ev}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <p className="text-[8px] text-slate-300 font-mono tracking-tighter uppercase">ID: {c.id}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="flex flex-col gap-1.5">
                                            <span className="px-3 py-1 rounded-full font-black text-[9px] w-fit border shadow-sm transition-all" style={{ backgroundColor: lStyle.bg, borderColor: lStyle.border, color: lStyle.text }}>
                                                NIVEL {c.level || 1}
                                            </span>
                                            <p className="font-bold text-slate-500 text-[10px] uppercase tracking-wide">{lStyle.label}</p>
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded w-fit ${c.pyramidType === 'defense' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                {c.pyramidType === 'defense' ? 'Defensa del Voto' : 'Movilización Voto'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <p className="font-black text-slate-600 text-xs">{c.parentName || '---'}</p>
                                        <p className="text-[9px] text-slate-300 uppercase font-bold tracking-widest mt-1">Lider Directo</p>
                                    </td>
                                    <td className="px-6 py-6">
                                        <p className="font-black text-slate-800 text-xs">{c.phone}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">SEC: {c.seccional || 'S/D'}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase mb-2">{c.colonia || 'COL. NO ASIG.'}</p>
                                        
                                        {/* Consentimiento WhatsApp */}
                                        {c.consent === 'yes' ? (
                                            <div className="flex items-center gap-1 mt-1">
                                                <span className="text-emerald-500 text-[10px]">✅</span>
                                                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-wider bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 shadow-sm">WA Confirmado</span>
                                            </div>
                                        ) : c.consent === 'no' ? (
                                            <div className="flex items-center gap-1 mt-1">
                                                <span className="text-rose-500 text-[10px]">🚫</span>
                                                <span className="text-[8px] font-black text-rose-600 uppercase tracking-wider bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 shadow-sm">Rechazado</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 mt-1">
                                                <span className="text-amber-500 text-[10px]">⏳</span>
                                                <span className="text-[8px] font-black text-amber-600 uppercase tracking-wider bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 shadow-sm">Pendiente</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="flex items-center justify-center gap-2 flex-wrap">
                                            <button onClick={() => handleWhatsApp(c)} className="p-3 bg-green-50 text-green-600 rounded-2xl hover:bg-green-600 hover:text-white transition-all shadow-sm" title="WhatsApp Directo">💬</button>
                                            {c.level && c.level > 1 && (
                                                c.qrSent ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <button onClick={() => setSelectedQRContact(c)} className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shadow-sm border border-emerald-200" title="QR ya enviado — click para ver">
                                                            ✅
                                                        </button>
                                                        <span className="text-[7px] font-black text-emerald-500 uppercase">QR Enviado</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <button onClick={() => handleSendQR(c)} className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm animate-pulse" title="Enviar QR por WhatsApp">
                                                            📲
                                                        </button>
                                                        <span className="text-[7px] font-black text-indigo-400 uppercase">Enviar QR</span>
                                                    </div>
                                                )
                                            )}
                                            <div className="flex flex-col gap-1">
                                                <button onClick={() => handlePromote(c)} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm text-xs" title="Subir Nivel">🔼</button>
                                                <button onClick={() => handleDemote(c)} className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm text-xs" title="Bajar Nivel">🔽</button>
                                            </div>
                                            <button onClick={() => setEditingContact(c)} className="p-3 bg-sky-50 text-sky-600 rounded-2xl hover:bg-sky-600 hover:text-white transition-all shadow-sm" title="Corregir Datos">✏️</button>
                                            <button onClick={() => { const id = prompt('Nuevo ID Lider:'); if(id) handleReassign(c.id, id); }} className="p-3 bg-amber-50 text-amber-600 rounded-2xl hover:bg-amber-600 hover:text-white transition-all shadow-sm" title="Reasignar Red">👤</button>
                                            <button onClick={() => deleteContact(c.id)} className="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-sm" title="Borrar">🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Pagination Bar */}
                {sortedContacts.length > pageSize && (
                    <div className="flex items-center justify-between px-10 py-6 bg-slate-50 border-t border-gray-100">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-30 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm"
                        >
                            ← Anterior
                        </button>
                        <div className="text-center">
                            <p className="text-sm font-black text-slate-700">Página {currentPage} de {totalPages}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Mostrando {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, sortedContacts.length)} de {sortedContacts.length}</p>
                        </div>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-30 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm"
                        >
                            Siguiente →
                        </button>
                    </div>
                )}

                {filteredContacts.length === 0 && <div className="py-20 text-center grayscale opacity-50"><span className="text-6xl block mb-4">🔍</span><p className="font-black text-slate-300 uppercase tracking-widest">Sin resultados en la red</p></div>}
            </div>
        </div>
    );
}
