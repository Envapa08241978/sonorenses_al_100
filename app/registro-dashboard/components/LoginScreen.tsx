'use client';

import React from 'react';
import Link from 'next/link';

interface LoginScreenProps {
    userEmail: string;
    setUserEmail: (v: string) => void;
    password: string;
    setPassword: (v: string) => void;
    loginError: string;
    handleLogin: () => void;
    accent: string;
}

export default function LoginScreen({ userEmail, setUserEmail, password, setPassword, loginError, handleLogin, accent }: LoginScreenProps) {
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
            <div className="w-full max-w-md bg-white p-10 rounded-[40px] shadow-2xl border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-3 bg-accent animate-pulse" />
                <div className="text-6xl mb-8 p-6 bg-slate-50 rounded-full inline-block shadow-inner">🏛️</div>
                <h1 className="text-3xl font-black text-slate-800 mb-2">Control Comunitario</h1>
                <p className="text-slate-400 text-sm mb-10 font-bold uppercase tracking-wider">Acceso a Panel Estrategico</p>
                
                <div className="space-y-6 text-left">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Identificador Digital</label>
                        <input type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="usuario@morena.com" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-red-400 focus:bg-white outline-none transition-all font-bold text-slate-700" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Clave de Seguridad</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} placeholder="••••••••" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-red-400 focus:bg-white outline-none transition-all font-bold text-slate-700" />
                    </div>
                </div>

                {loginError && <p className="text-red-500 text-xs mt-6 font-black bg-red-50 py-3 rounded-xl border border-red-100 animate-bounce">{loginError}</p>}
                
                <button onClick={handleLogin} data-btn className="w-full mt-10 py-5 rounded-3xl text-sm font-black tracking-[0.2em] text-white shadow-2xl hover:scale-[1.02] active:scale-95 transition-all bg-accent">ACCEDER AL PANEL</button>
                
                <Link href="/registro" className="inline-block mt-10 text-[10px] font-black text-slate-300 hover:text-slate-500 tracking-widest border-b-2 border-transparent hover:border-slate-200 transition-all uppercase">← Volver al Portal de Datos</Link>
            </div>
        </div>
    );
}
