'use client';

import React from 'react';
import { EventItem, ContactItem } from '../types';
import { MultiSelect } from '../MultiSelect';

interface EventFormModalProps {
    eventForm: Partial<EventItem>;
    setEventForm: (v: any) => void;
    editingEventId: string | null;
    saveEvent: () => void;
    isSaving: boolean;
    isUploadingImage: boolean;
    uploadProgress: number;
    handleEventImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClose: () => void;
    contacts: ContactItem[];
    uniqueSeccionales: string[];
    uniqueColonias: string[];
}

export default function EventFormModal({
    eventForm, setEventForm, editingEventId, saveEvent, isSaving,
    isUploadingImage, uploadProgress, handleEventImageUpload, onClose,
    contacts, uniqueSeccionales, uniqueColonias
}: EventFormModalProps) {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[48px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-8 bg-slate-50 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                        <span className="text-2xl">➕</span> {editingEventId ? 'Editar Asamblea' : 'Nueva Asamblea'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl font-black">×</button>
                </div>
                <div className="p-8 space-y-5 max-h-[70vh] overflow-y-auto no-scrollbar">
                    {/* Nombre */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Nombre *</label>
                        <input type="text" value={eventForm.name || ''} onChange={e => setEventForm({...eventForm, name: e.target.value})}
                            placeholder="Ej. Asamblea Vecinal" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-red-400 outline-none transition-all font-bold text-slate-700" />
                    </div>

                    {/* Fecha */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Fecha</label>
                        <input type="date" value={eventForm.date || ''} onChange={e => setEventForm({...eventForm, date: e.target.value})}
                            className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-red-400 outline-none transition-all font-bold text-slate-700" />
                    </div>

                    {/* Hora */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Hora</label>
                        <input type="text" value={eventForm.time || ''} onChange={e => setEventForm({...eventForm, time: e.target.value})}
                            placeholder="Ej. 6:00 PM" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-red-400 outline-none transition-all font-bold text-slate-700" />
                    </div>

                    {/* Lugar */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Lugar</label>
                        <input type="text" value={eventForm.location || ''} onChange={e => setEventForm({...eventForm, location: e.target.value})}
                            placeholder="Ej. Plaza" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-red-400 outline-none transition-all font-bold text-slate-700" />
                    </div>

                    {/* Descripción */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Descripción (Opcional)</label>
                        <textarea value={eventForm.description || ''} onChange={e => setEventForm({...eventForm, description: e.target.value})}
                            placeholder="Breve descripción del evento..." rows={2}
                            className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-red-400 outline-none transition-all font-bold text-slate-700 resize-none" />
                    </div>

                    {/* Fotografía del Evento */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Fotografía del Evento (Poster)</label>
                        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-red-300 transition-colors relative">
                            {eventForm.image ? (
                                <div className="relative">
                                    <img src={eventForm.image} alt="Preview" className="w-full h-32 object-cover rounded-xl" />
                                    <button onClick={() => setEventForm({...eventForm, image: ''})} className="absolute top-2 right-2 bg-rose-500 text-white w-6 h-6 rounded-full text-xs font-black hover:bg-rose-600">×</button>
                                </div>
                            ) : isUploadingImage ? (
                                <div className="py-4">
                                    <div className="w-10 h-10 border-4 border-slate-200 border-t-red-500 rounded-full animate-spin mx-auto mb-2" />
                                    <p className="text-xs text-slate-400 font-bold">{uploadProgress}%</p>
                                </div>
                            ) : (
                                <label className="cursor-pointer">
                                    <span className="text-slate-400 font-bold text-sm">📸 Seleccionar Imagen (Opcional)</span>
                                    <input type="file" accept="image/*" onChange={handleEventImageUpload} className="hidden" />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Perfil de Invitados */}
                    <div className="pt-4 border-t border-slate-100">
                        <h4 className="font-black text-slate-700 text-sm mb-4 flex items-center gap-2">👥 Perfil de Invitados (Opcional)</h4>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Por Seccional</label>
                                <MultiSelect 
                                    placeholder={`Todos los seccionales (${uniqueSeccionales.length})`}
                                    options={uniqueSeccionales.map(s => ({label: `Seccional ${s}`, value: s}))} 
                                    selected={eventForm.targetSeccionales || []} 
                                    onChange={(val) => setEventForm({...eventForm, targetSeccionales: val})} 
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Por Colonia</label>
                                <MultiSelect 
                                    placeholder={`Todas las colonias (Sin filtro)`}
                                    options={uniqueColonias.map(c => ({label: c, value: c}))} 
                                    selected={eventForm.targetColonias || []} 
                                    onChange={(val) => setEventForm({...eventForm, targetColonias: val})} 
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Por Persona Individual</label>
                                <MultiSelect 
                                    placeholder={`Seleccionar contactos e...`}
                                    options={contacts.map(c => ({label: `${c.name} (${c.phone})`, value: c.id}))} 
                                    selected={eventForm.targetContacts || []} 
                                    onChange={(val) => setEventForm({...eventForm, targetContacts: val})} 
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-8 bg-slate-50 border-t border-gray-100">
                    <button onClick={saveEvent} disabled={isSaving || !eventForm.name} 
                        className="w-full py-5 rounded-3xl bg-slate-900 text-white font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50">
                        {isSaving ? 'Guardando...' : editingEventId ? 'Actualizar Asamblea' : 'Crear Asamblea ✅'}
                    </button>
                </div>
            </div>
        </div>
    );
}
