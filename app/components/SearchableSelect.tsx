'use client';

import React, { useState, useRef, useEffect } from 'react';

interface OptionItem {
    label: string;
    value: string;
    subtext?: string;
}

interface SearchableSelectProps {
    value: string;
    onChange: (val: string, item?: OptionItem) => void;
    options: (string | OptionItem)[];
    placeholder: string;
    label?: string;
    disabled?: boolean;
    allowCustom?: boolean;
    className?: string;
}

export default function SearchableSelect({
    value,
    onChange,
    options,
    placeholder,
    label,
    disabled = false,
    allowCustom = true,
    className = ''
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Normalize options to OptionItem format
    const formattedOptions: OptionItem[] = options.map(opt => {
        if (typeof opt === 'string') {
            return { label: opt, value: opt };
        }
        return opt;
    });

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = formattedOptions.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opt.subtext && opt.subtext.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleSelect = (opt: OptionItem) => {
        onChange(opt.value, opt);
        setSearchTerm('');
        setIsOpen(false);
    };

    const handleCustomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setSearchTerm(newVal);
        if (allowCustom) {
            onChange(newVal);
        }
    };

    const selectedLabel = formattedOptions.find(o => o.value === value)?.label || value;

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && (
                <label className="text-[0.65rem] font-bold text-gray-500 uppercase tracking-widest block mb-0.5 ml-1">
                    {label}
                </label>
            )}

            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full px-3 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer flex items-center justify-between ${
                    disabled
                        ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                        : isOpen
                        ? 'bg-white border-red-400 ring-2 ring-red-100 text-gray-800'
                        : value
                        ? 'bg-gray-50 border-gray-200 text-gray-800 hover:bg-white'
                        : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-white'
                }`}
            >
                <span className="truncate">
                    {value ? selectedLabel : placeholder}
                </span>
                <span className="text-xs text-gray-400 ml-2">
                    {isOpen ? '▲' : '▼'}
                </span>
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-[300] left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-2xl max-h-60 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-2 border-b border-gray-100 bg-gray-50/80 sticky top-0">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={handleCustomInput}
                            placeholder="🔍 Buscar o escribir..."
                            autoFocus
                            className="w-full px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-gray-200 outline-none focus:border-red-400 text-gray-800"
                        />
                    </div>

                    <div className="overflow-y-auto max-h-48 p-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, idx) => (
                                <div
                                    key={`${opt.value}-${idx}`}
                                    onClick={() => handleSelect(opt)}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-between ${
                                        value === opt.value
                                            ? 'bg-red-50 text-red-700'
                                            : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                >
                                    <span className="truncate">{opt.label}</span>
                                    {opt.subtext && (
                                        <span className="text-[10px] text-gray-400 font-medium ml-2">
                                            {opt.subtext}
                                        </span>
                                    )}
                                </div>
                            ))
                        ) : allowCustom && searchTerm.trim() ? (
                            <div
                                onClick={() => {
                                    onChange(searchTerm.trim());
                                    setIsOpen(false);
                                }}
                                className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 cursor-pointer flex items-center gap-2"
                            >
                                <span>✏️</span> Usar "{searchTerm}"
                            </div>
                        ) : (
                            <div className="px-3 py-3 text-xs text-center text-gray-400 font-medium">
                                No se encontraron resultados
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
