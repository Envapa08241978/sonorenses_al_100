'use client';

import React from 'react';
import { ContactItem } from '../types';
import SearchableSelect from '@/app/components/SearchableSelect';
import { useSonoraGeo } from '@/hooks/useSonoraGeo';

interface EditContactModalProps {
    contact: ContactItem;
    setContact: (c: ContactItem) => void;
    handleSaveEdit: () => void;
    isSavingEdit: boolean;
    onClose: () => void;
    uniqueSeccionales?: string[];
}

export default function EditContactModal({
    contact,
    setContact,
    handleSaveEdit,
    isSavingEdit,
    onClose,
    uniqueSeccionales = []
}: EditContactModalProps) {
    const { municipiosList, getColoniasForMunicipio, getCpsForMunicipio } = useSonoraGeo();

    const selectedMunicipio = contact.municipio || '';
    const coloniasForMun = getColoniasForMunicipio(selectedMunicipio);
    const cpsForMun = getCpsForMunicipio(selectedMunicipio);

    const coloniaOptions = coloniasForMun.map(c => ({
        label: `${c.colonia} (${c.tipo}) - CP ${c.cp}`,
        value: c.colonia,
        subtext: `CP ${c.cp}`
    }));

    const handleMunicipioChange = (newMun: string) => {
        setContact({
            ...contact,
            municipio: newMun,
            colonia: '',
            cp: ''
        });
    };

    const handleColoniaChange = (newCol: string, item?: any) => {
        const matchedCol = coloniasForMun.find(c => c.colonia === newCol);
        const autoCp = matchedCol ? matchedCol.cp : contact.cp;
        setContact({
            ...contact,
            colonia: newCol,
            cp: autoCp || contact.cp
        });
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-xl rounded-[48px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-8 bg-slate-50 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-800">Corregir Registro ✏️</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl font-black">×</button>
                </div>
                <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Nombre Completo</label>
                            <input value={contact.name} onChange={e => setContact({...contact, name: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-transparent focus:border-red-400 outline-none transition-all font-bold" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">WhatsApp</label>
                            <input value={contact.phone} onChange={e => setContact({...contact, phone: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-transparent focus:border-red-400 outline-none transition-all font-bold" />
                        </div>
                        <div>
                            <SearchableSelect
                                label="Municipio / Ciudad *"
                                placeholder="Selecciona Ciudad..."
                                value={selectedMunicipio}
                                onChange={handleMunicipioChange}
                                options={municipiosList}
                            />
                        </div>
                        <div>
                            <SearchableSelect
                                label="Seccional Electoral"
                                placeholder="Selecciona Seccional..."
                                value={contact.seccional || ''}
                                onChange={(val) => setContact({...contact, seccional: val})}
                                options={uniqueSeccionales}
                                allowCustom={true}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                            <SearchableSelect
                                label="Colonia / Asentamiento"
                                placeholder={selectedMunicipio ? "Selecciona Colonia..." : "Primero elige Ciudad"}
                                value={contact.colonia || ''}
                                onChange={handleColoniaChange}
                                options={coloniaOptions}
                                disabled={!selectedMunicipio}
                                allowCustom={true}
                            />
                        </div>
                        <div>
                            <SearchableSelect
                                label="Código Postal (CP)"
                                placeholder="CP..."
                                value={contact.cp || ''}
                                onChange={(val) => setContact({...contact, cp: val})}
                                options={cpsForMun}
                                disabled={!selectedMunicipio}
                                allowCustom={true}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Calle</label>
                            <input value={contact.calle || ''} onChange={e => setContact({...contact, calle: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-transparent focus:border-red-400 outline-none transition-all font-bold" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Núm Ext</label>
                            <input value={contact.numExt || ''} onChange={e => setContact({...contact, numExt: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-transparent focus:border-red-400 outline-none transition-all font-bold" />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Tipo de Red</label>
                        <select value={contact.pyramidType} onChange={e => setContact({...contact, pyramidType: e.target.value as any})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-transparent focus:border-red-400 outline-none transition-all font-bold">
                            <option value="votation">Red de Votación</option>
                            <option value="defense">Red de Defensa del Voto</option>
                        </select>
                    </div>
                </div>
                <div className="p-8 bg-slate-50 border-t border-gray-100">
                    <button onClick={handleSaveEdit} disabled={isSavingEdit} className="w-full py-5 rounded-3xl bg-slate-900 text-white font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50">
                        {isSavingEdit ? 'Guardando...' : 'Guardar Cambios Correctos'}
                    </button>
                </div>
            </div>
        </div>
    );
}
