'use client';

import React, { useState, useEffect, useRef } from 'react';

export const MultiSelect = <T extends string | number>({ options, selected, onChange, placeholder }: { options: {label: string, value: T}[], selected: T[], onChange: (val: T[]) => void, placeholder: string }) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggle = (val: T) => {
        if (selected.includes(val)) onChange(selected.filter(v => v !== val));
        else onChange([...selected, val]);
    };

    return (
        <div className="relative" ref={containerRef}>
            <button onClick={() => setOpen(!open)} className="px-4 py-2 w-full md:w-56 text-left rounded-xl text-sm border border-gray-200 bg-white shadow-sm flex justify-between items-center transition-all hover:border-red-200">
                <span className="truncate text-gray-600 font-medium">
                    {selected.length === 0 ? placeholder : `${selected.length} seleccionado(s)`}
                </span>
                <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
            </button>
            {open && (
                <div className="absolute top-full mt-1 left-0 z-[100] w-64 max-h-60 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-xl p-2 font-medium animate-in fade-in zoom-in-95 duration-100">
                    {options.map((opt) => (
                        <label key={opt.value} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                            <input type="checkbox" checked={selected.includes(opt.value)} onChange={() => toggle(opt.value)} className="w-4 h-4 text-red-500 rounded focus:ring-red-500" />
                            <span className="text-sm text-gray-700 truncate">{opt.label}</span>
                        </label>
                    ))}
                    {options.length === 0 && <div className="p-2 text-xs text-gray-400 text-center">Sin opciones</div>}
                </div>
            )}
        </div>
    );
};
