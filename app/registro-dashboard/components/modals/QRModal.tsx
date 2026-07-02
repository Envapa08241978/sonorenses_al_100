'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ContactItem } from '../types';

interface QRModalProps {
    contact: ContactItem;
    config: any;
    onClose: () => void;
}

export default function QRModal({ contact, config, onClose }: QRModalProps) {
    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[60px] shadow-2xl p-10 max-w-sm w-full relative text-center border-4 border-slate-50 overflow-y-auto no-scrollbar max-h-[90vh]">
                <button onClick={onClose} className="absolute top-8 right-8 w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-full hover:bg-slate-900 hover:text-white transition-all font-black text-xl">×</button>
                
                <div className="mb-6">
                    <div className="w-20 h-20 bg-theme/10 text-theme rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-inner">📱</div>
                    <h3 className="text-xl font-black text-slate-800 leading-tight">Codigo de Red</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">{contact.name}</p>
                </div>

                <div className="bg-white p-6 rounded-[40px] border-4 border-dashed border-slate-100 shadow-inner inline-block mb-6 relative group">
                    <QRCodeSVG id="qr-reclu-canvas" value={`${window.location.origin}/registro?ref=${contact.id}`} size={200} level="H" fgColor="#1e293b" />
                </div>

                <div className="space-y-4">
                    {/* Link de Referencia Directo */}
                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Enlace de Registro Directo</p>
                        <div className="flex items-center gap-2">
                            <input readOnly value={`${window.location.origin.replace('http://','').replace('https://','')}/registro?ref=${contact.id}`} 
                                className="bg-transparent text-[10px] font-mono font-bold text-slate-600 flex-1 outline-none truncate" />
                            <button onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/registro?ref=${contact.id}`);
                                alert('Enlace copiado al portapapeles 📋');
                            }} className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors" title="Copiar Enlace">📋</button>
                        </div>
                    </div>

                    {/* Botón WhatsApp */}
                    <button onClick={() => {
                        const link = `${window.location.origin}/registro?ref=${contact.id}`;
                        const msg = encodeURIComponent(`¡Hola! Te invito a registrarte en nuestra plataforma ciudadana para transformar Sonora. 🗳️✨\n\nEs muy fácil, solo entra a este link:\n${link}\n\nO si prefieres, escanea mi código QR. ¡Tu participación es muy importante! 💪`);
                        window.open(`https://wa.me/?text=${msg}`, '_blank');
                    }} className="w-full py-4 rounded-3xl bg-green-600 text-white font-black text-xs uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg flex items-center justify-center gap-3">
                        <span className="text-xl">💬</span> Enviar por WhatsApp
                    </button>

                    <button onClick={() => {
                        const svg = document.querySelector('#qr-reclu-canvas') as SVGSVGElement;
                        if(!svg) return;
                        const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
                        const data = new XMLSerializer().serializeToString(svg);
                        const img = new Image();
                        img.onload = () => {
                            canvas.width=1000; canvas.height=1000; ctx?.drawImage(img,0,0,1000,1000);
                            const a = document.createElement('a'); a.download=`QR-RED-${contact.name.replace(/\s+/g,'_')}.png`; a.href=canvas.toDataURL('image/png'); a.click();
                        };
                        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(data)));
                    }} className="w-full py-4 rounded-3xl bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Descargar Imagen QR</button>
                    
                    <p className="text-[9px] text-slate-300 font-bold uppercase leading-relaxed px-4">Instrucciones: Comparte el link para registro remoto o muestra el QR para registro presencial.</p>
                </div>
            </div>
        </div>
    );
}
