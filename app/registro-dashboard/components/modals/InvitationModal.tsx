'use client';

import React, { useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { ContactItem, EventItem, LEVEL_ROLES } from '../types';
import { MultiSelect } from '../MultiSelect';

interface InvitationModalProps {
    event: EventItem;
    contacts: ContactItem[];
    invitationSentContacts: Set<string>;
    setInvitationSentContacts: (v: any) => void;
    config: any;
    uniqueSeccionales: string[];
    uniqueColonias: string[];
    uniqueEventNames: string[];
    onClose: () => void;
}

export default function InvitationModal({
    event, contacts, invitationSentContacts, setInvitationSentContacts,
    config, uniqueSeccionales, uniqueColonias, uniqueEventNames, onClose
}: InvitationModalProps) {
    const [invitationFilterSeccionales, setInvitationFilterSeccionales] = useState<string[]>([]);
    const [invitationFilterColonias, setInvitationFilterColonias] = useState<string[]>([]);
    const [invitationFilterEvents, setInvitationFilterEvents] = useState<string[]>([]);
    const [invitationFilterLevels, setInvitationFilterLevels] = useState<number[]>([]);

    const invTargets = contacts.filter(c => {
        let inTarget = true;
        const hasSec = !!(event.targetSeccionales && event.targetSeccionales.length > 0);
        const hasCol = !!(event.targetColonias && event.targetColonias.length > 0);
        const hasCon = !!(event.targetContacts && event.targetContacts.length > 0);
        
        if (hasSec || hasCol || hasCon) {
            if (hasCon && event.targetContacts!.includes(c.id)) {
                inTarget = true;
            } else {
                const mSec = !hasSec || event.targetSeccionales!.includes(c.seccional || '');
                const mCol = !hasCol || event.targetColonias!.includes(c.colonia || '');
                inTarget = (hasSec || hasCol) && mSec && mCol;
            }
        }

        if (!inTarget) return false;

        const dmSec = invitationFilterSeccionales.length === 0 || invitationFilterSeccionales.includes(c.seccional || '');
        const dmCol = invitationFilterColonias.length === 0 || invitationFilterColonias.includes(c.colonia || '');
        const dmLev = invitationFilterLevels.length === 0 || invitationFilterLevels.includes(c.level || 1);
        const contactEvents = Array.from(new Set([...(c.eventNames || []), c.eventName].filter(Boolean)));
        const dmEv = invitationFilterEvents.length === 0 || invitationFilterEvents.some(fe => contactEvents.includes(fe));

        return dmSec && dmCol && dmLev && dmEv;
    });

    const baseLink = typeof window !== 'undefined' ? window.location.origin : '';

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[48px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-8 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-3"><span className="text-2xl">📨</span> Invitaciones</h3>
                        <p className="text-xs font-bold text-emerald-600 mt-1">{event.name} — {invTargets.length} contactos objetivo</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl font-black">×</button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto no-scrollbar">
                    {/* Event Details */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                        <div className="flex flex-wrap gap-4 text-xs text-slate-500 font-bold">
                            <span>📅 {event.date || 'Sin fecha'}</span>
                            <span>🕐 {event.time || 'Sin hora'}</span>
                            <span>📍 {event.location || 'Sin lugar'}</span>
                        </div>
                        <div className="mt-3 flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-100">
                            <p className="text-[9px] font-mono text-slate-500 truncate flex-1">{baseLink}/e/{event.id}</p>
                            <button onClick={() => { navigator.clipboard.writeText(`${baseLink}/e/${event.id}`); alert('Link copiado 📋'); }} className="text-[9px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded-lg">Copiar</button>
                        </div>
                    </div>

                    {/* Dynamic Filters */}
                    <div className="mb-6 grid grid-cols-2 gap-3 p-4 bg-emerald-50/50 rounded-3xl border border-emerald-50">
                        <p className="col-span-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Filtros Avanzados</p>
                        <MultiSelect placeholder="Por Nivel" options={Object.entries(LEVEL_ROLES).map(([level, role]) => ({label: `Nivel ${level} - ${role}`, value: Number(level)}))} selected={invitationFilterLevels} onChange={setInvitationFilterLevels} />
                        <MultiSelect placeholder="Por Seccional" options={uniqueSeccionales.map(s => ({label: `Seccional ${s}`, value: s}))} selected={invitationFilterSeccionales} onChange={setInvitationFilterSeccionales} />
                        <MultiSelect placeholder="Por Colonia" options={uniqueColonias.map(c => ({label: c, value: c}))} selected={invitationFilterColonias} onChange={setInvitationFilterColonias} />
                        <MultiSelect placeholder="Por Evento Asistido" options={uniqueEventNames.map(e => ({label: e, value: e}))} selected={invitationFilterEvents} onChange={setInvitationFilterEvents} />
                    </div>

                    {/* Contacts List */}
                    <div className="space-y-2">
                        {invTargets.map(c => {
                            const isSent = invitationSentContacts.has(c.id);
                            const personalLink = `${baseLink}/e/${event.id}?c=${c.id}`;
                            const msgEnc = encodeURIComponent(`Hola, ${c.name.split(' ')[0]}, el candidato Javier Lamarque, te invita a participar en el evento:\n\n🏛️ *${event.name}*\n📅 ${event.date}\n🕐 ${event.time}\n📍 ${event.location}${event.description ? `\n\n"${event.description}"` : ''}\n\n✅ Registra tu asistencia aquí:\n${personalLink}`);
                            return (
                                <div key={c.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                    <div>
                                        <p className="font-black text-slate-700 text-sm">{c.name}</p>
                                        <p className="text-[9px] text-slate-400 font-bold">SEC: {c.seccional || 'S/D'} • {c.phone}</p>
                                    </div>
                                    {isSent ? (
                                        <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-full uppercase">✅ Enviado</span>
                                    ) : (
                                        <a href={`https://wa.me/52${c.phone.replace(/\D/g, '')}?text=${msgEnc}`} target="_blank" rel="noopener noreferrer"
                                            onClick={async () => {
                                                setInvitationSentContacts((prev: Set<string>) => new Set([...Array.from(prev), c.id]));
                                                
                                                try {
                                                    await updateDoc(doc(db, 'campaigns', 'main_campaign', 'events', event.id), {
                                                        sentInvitations: arrayUnion(c.id)
                                                    });

                                                    const cleanPhone = c.phone.replace(/\D/g, '').slice(-10);
                                                    const preRegRef = collection(db, 'campaigns', 'main_campaign', 'events', event.id, 'pre_registros');
                                                    const q = query(preRegRef, where('phone', '==', cleanPhone));
                                                    const qSnap = await getDocs(q);

                                                    if (qSnap.empty) {
                                                        await addDoc(preRegRef, {
                                                            contactId: c.id,
                                                            name: c.name,
                                                            phone: cleanPhone,
                                                            status: 'invitado',
                                                            folio: `PR-${Math.floor(1000 + Math.random() * 9000)}`,
                                                            calle: c.calle || '',
                                                            numExt: c.numExt || '',
                                                            seccional: c.seccional || '',
                                                            roles: c.roles || [],
                                                            parentName: c.parentName || '',
                                                            timestamp: serverTimestamp()
                                                        });
                                                    }
                                                } catch (err) {
                                                    console.error('Error recording invitation status:', err);
                                                }
                                            }}
                                            className="px-4 py-2 bg-green-500 text-white text-[10px] font-black rounded-xl shadow-lg shadow-green-100 hover:scale-105 active:scale-95 transition-all">WhatsApp</a>
                                    )}
                                </div>
                            );
                        })}
                        {invTargets.length === 0 && (
                            <div className="py-10 text-center">
                                <span className="text-4xl block mb-3">📭</span>
                                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No hay contactos que coincidan con el perfil de invitados configurado</p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-[9px] text-slate-400 font-bold">{invitationSentContacts.size} de {invTargets.length} enviados</p>
                    <button onClick={onClose} className="px-6 py-3 bg-slate-900 text-white text-xs font-black rounded-2xl hover:bg-black transition-all">Cerrar</button>
                </div>
            </div>
        </div>
    );
}
