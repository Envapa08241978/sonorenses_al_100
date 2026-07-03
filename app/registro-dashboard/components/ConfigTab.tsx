'use client';

import React from 'react';
import { BrigadistaItem } from './types';

interface ConfigTabProps {
    config: any;
    configForm: any;
    setConfigForm: (v: any) => void;
    isEditingConfig: boolean;
    setIsEditingConfig: (v: boolean) => void;
    saveConfig: () => void;
    brigadistas: BrigadistaItem[];
    syncBrigadistasToContacts: () => void;
    accent: string;
}

export default function ConfigTab({
    config, configForm, setConfigForm, isEditingConfig, setIsEditingConfig,
    saveConfig, brigadistas, syncBrigadistasToContacts, accent
}: ConfigTabProps) {
    return (
        <div className="p-12 max-w-4xl mx-auto animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-2xl font-black text-slate-800">Identidad de Campaña</h3>
                    <p className="text-sm text-slate-400 font-medium mt-1">Personaliza cómo los ciudadanos ven tu plataforma de registro.</p>
                </div>
                {!isEditingConfig ? (
                    <button onClick={() => setIsEditingConfig(true)} className="px-6 py-3 bg-slate-100 text-slate-600 font-black text-xs rounded-2xl hover:bg-slate-200 transition-all border border-slate-200 flex items-center gap-2">✏️ Habilitar Edición</button>
                ) : (
                    <div className="flex gap-4">
                        <button onClick={() => setIsEditingConfig(false)} className="px-6 py-3 text-slate-400 font-black text-xs uppercase">Cancelar</button>
                        <button onClick={saveConfig} className="px-8 py-3 bg-theme text-white font-black text-xs rounded-2xl shadow-xl shadow-red-100">Guardar Cambios</button>
                    </div>
                )}
            </div>

            <div className="space-y-6 mb-12">
                {[
                    { key: 'name', label: 'Nombre Formal', type: 'text', placeholder: 'Ej. Javier Lamarque' },
                    { key: 'title', label: 'Cargo o Título', type: 'text', placeholder: 'Ej. Aspirante a la Coordinación Estatal en Defensa de la Transformación y Soberanía Nacional en Sonora' },
                    { key: 'party', label: 'Partido', type: 'text', placeholder: 'Ej. Morena' },
                    { key: 'phone', label: 'WhatsApp de Enlace Institucional (10 dígitos)', type: 'tel', placeholder: 'Ej. 6621234567' },
                    { key: 'dashboardPassword', label: 'Contraseña de este Panel', type: 'password', placeholder: '••••••••' },
                ].map(f => (
                    <div key={f.key}>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">{f.label}</label>
                        <input type={f.type} value={configForm[f.key] || ''} onChange={e => setConfigForm({...configForm, [f.key]: e.target.value})} disabled={!isEditingConfig} placeholder={f.placeholder} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-red-400 outline-none font-bold text-slate-700 transition-all disabled:opacity-60 uppercase" />
                    </div>
                ))}

                {/* Noticias y Redes Sociales */}
                <div className="pt-8 border-t border-slate-100">
                    <h4 className="text-lg font-black text-slate-800 mb-6">Información para Inteligencia Artificial</h4>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Noticias Recientes y Redes Sociales</label>
                        <textarea
                            value={configForm.newsAndSocials || ''}
                            onChange={e => setConfigForm({...configForm, newsAndSocials: e.target.value})}
                            disabled={!isEditingConfig}
                            placeholder="Ej. El Facebook oficial es facebook.com/javierlamarque. Esta semana estuvimos en Cajeme entregando apoyos..."
                            className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-red-400 outline-none font-bold text-slate-700 transition-all disabled:opacity-60 min-h-[120px]"
                        />
                        <p className="text-xs text-slate-400 mt-2 ml-4">Esta información será leída por el Chatbot automáticamente al contestar preguntas en WhatsApp.</p>
                    </div>
                </div>

                {/* Diseño Visual */}
                <div className="pt-8 border-t border-slate-100">
                    <h4 className="text-lg font-black text-slate-800 mb-6">Diseño Visual</h4>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Acento Principal</label>
                        <div className="flex items-center gap-3">
                            <input type="color" value={configForm.accentColor || '#A60321'} onChange={e => setConfigForm({...configForm, accentColor: e.target.value})} disabled={!isEditingConfig} className="w-12 h-12 rounded-xl border-2 border-slate-200 cursor-pointer disabled:opacity-60" />
                            <input type="text" value={configForm.accentColor || '#A60321'} onChange={e => setConfigForm({...configForm, accentColor: e.target.value})} disabled={!isEditingConfig} className="px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-red-400 outline-none font-bold text-slate-700 transition-all disabled:opacity-60 w-40" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Migration tool - one-time sync */}
            {brigadistas.length > 0 && (
                <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-black text-blue-800 flex items-center gap-2">🔄 Migración de Movilizadores</h4>
                            <p className="text-xs text-blue-500 font-medium mt-1">{brigadistas.length} movilizadores pendientes de sincronizar al Directorio. Sus QR seguirán funcionando.</p>
                        </div>
                        <button onClick={syncBrigadistasToContacts} className="px-6 py-3 bg-blue-600 text-white text-[10px] font-black uppercase rounded-2xl hover:bg-blue-700 transition-all tracking-widest shadow-lg shadow-blue-100 whitespace-nowrap">Sincronizar Ahora</button>
                    </div>
                    <p className="text-[9px] text-blue-400 font-bold mt-3 uppercase tracking-widest">Después de sincronizar, gestiona QR y niveles desde el Directorio.</p>
                </div>
            )}
        </div>
    );
}
