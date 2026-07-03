'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ContactItem } from './types';

/* ---- Emoji Data (curated, no dependencies) ---- */
const EMOJI_CATEGORIES: { name: string; emojis: string[] }[] = [
    { name: '😀 Caras', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😙','😚','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬'] },
    { name: '👋 Manos', emojis: ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','💪'] },
    { name: '❤️ Amor', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️','💋','💯','💢','💥','💫','💦','💨','🕊️','✨','⭐','🌟','💐','🌹','🌺','🌸','🌼','🌻'] },
    { name: '🎉 Objetos', emojis: ['🎉','🎊','🎈','🎁','🏆','🥇','🥈','🥉','⚽','🏀','🏈','⚾','🎯','🎮','🎲','🎭','🎬','🎤','🎧','🎵','🎶','📱','💻','📸','📹','📞','📧','✉️','📝','📋','📌','📍','🗳️','🏛️','🇲🇽'] },
    { name: '✅ Símbolos', emojis: ['✅','❌','⭕','❓','❗','‼️','⁉️','💯','🔴','🟡','🟢','🔵','⚪','⚫','🟤','🔶','🔷','▶️','⏸️','⏹️','🔔','🔕','📢','📣','💬','💭','🗯️','♻️','⚠️','🚫','🔒','🔓','🔑','📎','🔗'] }
];

/* ---- Timestamp Formatter ---- */
function formatMsgTime(timestamp: any): string {
    if (!timestamp) return '';
    let date: Date;
    if (timestamp?.toDate) {
        date = timestamp.toDate();
    } else if (timestamp?.seconds) {
        date = new Date(timestamp.seconds * 1000);
    } else if (typeof timestamp === 'number') {
        date = new Date(timestamp);
    } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
    } else {
        return '';
    }
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    const time = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    if (isToday) return time;
    if (isYesterday) return `Ayer ${time}`;
    return `${date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} ${time}`;
}

function formatChatListTime(timestamp: any): string {
    if (!timestamp) return '';
    let date: Date;
    if (timestamp?.toDate) date = timestamp.toDate();
    else if (timestamp?.seconds) date = new Date(timestamp.seconds * 1000);
    else if (typeof timestamp === 'number') date = new Date(timestamp);
    else if (typeof timestamp === 'string') date = new Date(timestamp);
    else return '';
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isToday) return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
    if (isYesterday) return 'Ayer';
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

interface ChatTabProps {
    contacts: ContactItem[];
    chats: any[];
    selectedChat: any;
    setSelectedChat: (v: any) => void;
    chatMessages: any[];
    chatInput: string;
    setChatInput: (v: string) => void;
    isSendingMsg: boolean;
    handleSendChatMessage: (e?: React.FormEvent) => void;
    attachedFile: File | null;
    setAttachedFile: (f: File | null) => void;
    attachedPreview: string | null;
    setAttachedPreview: (v: string | null) => void;
    handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    showNewChatPicker: boolean;
    setShowNewChatPicker: (v: boolean) => void;
    newChatSearch: string;
    setNewChatSearch: (v: string) => void;
    handleStartNewChat: (contact: ContactItem) => void;
    handleDeleteChat: (chatId: string) => void;
    normalizePhone: (phone: string) => string;
}

export default function ChatTab({
    contacts, chats, selectedChat, setSelectedChat, chatMessages, chatInput, setChatInput,
    isSendingMsg, handleSendChatMessage, attachedFile, setAttachedFile, attachedPreview,
    setAttachedPreview, handleFileSelect, showNewChatPicker, setShowNewChatPicker,
    newChatSearch, setNewChatSearch, handleStartNewChat, handleDeleteChat, normalizePhone
}: ChatTabProps) {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const chatInputRef = useRef<HTMLInputElement>(null);

    // Close emoji picker on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
                setShowEmojiPicker(false);
            }
        };
        if (showEmojiPicker) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showEmojiPicker]);

    const insertEmoji = (emoji: string) => {
        setChatInput(chatInput + emoji);
        chatInputRef.current?.focus();
    };

    return (
        <div className="flex h-[700px]">
            <div className="w-1/3 border-r border-gray-100 bg-gray-50 flex flex-col h-full overflow-hidden">
                <div className="p-3 bg-white border-b border-gray-100 flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                        <img 
                            src="/javier_lamarque.jpg" 
                            alt="Aspirante a la Coordinación Estatal en Defensa de la Transformación y Soberanía Nacional en Sonora, Javier Lamarque" 
                            className="w-10 h-10 rounded-full object-cover border-2 border-red-500 shadow-md"
                            onError={(e) => {
                                e.currentTarget.src = "https://via.placeholder.com/150";
                            }}
                        />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-black text-gray-800 text-xs truncate leading-tight">Aspirante a la Coordinación Estatal en Defensa de la Transformación y Soberanía Nacional en Sonora, Javier Lamarque</div>
                        <div className="text-[9px] text-green-600 font-bold flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-ping"></span>
                            <span>WhatsApp Conectado</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowNewChatPicker(!showNewChatPicker)} 
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm flex-shrink-0 ${showNewChatPicker ? 'bg-red-500 text-white rotate-45' : 'bg-slate-50 text-slate-600 hover:bg-red-500 hover:text-white border border-slate-100'}`}
                        title="Nuevo chat"
                    >
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    </button>
                </div>
                {/* New Chat Contact Picker */}
                {showNewChatPicker && (
                    <div className="bg-white border-b border-gray-200 shadow-inner">
                        <div className="p-2">
                            <input 
                                type="text" 
                                value={newChatSearch} 
                                onChange={e => setNewChatSearch(e.target.value)} 
                                placeholder="🔍 Buscar contacto por nombre o teléfono..." 
                                className="w-full p-2.5 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-red-400 text-sm" 
                                autoFocus 
                            />
                        </div>
                        <div className="max-h-[280px] overflow-y-auto">
                            {contacts
                                .filter(c => c.phone && (
                                    c.name.toLowerCase().includes(newChatSearch.toLowerCase()) ||
                                    c.phone.includes(newChatSearch)
                                ))
                                .slice(0, 50)
                                .map(contact => {
                                    const initials = (contact.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
                                    const colors = ['#EF4444','#F97316','#EAB308','#22C55E','#06B6D4','#3B82F6','#8B5CF6','#EC4899'];
                                    const colorIdx = contact.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
                                    const contactDigits = normalizePhone(contact.phone);
                                    const existingChat = chats.find(ch => normalizePhone(ch.phone || ch.id) === contactDigits);
                                    return (
                                        <button 
                                            key={contact.id} 
                                            onClick={() => {
                                                if (existingChat) {
                                                    setSelectedChat(existingChat);
                                                    setShowNewChatPicker(false);
                                                    setNewChatSearch('');
                                                } else {
                                                    handleStartNewChat(contact);
                                                }
                                            }} 
                                            className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-red-50 transition-all border-b border-slate-50"
                                        >
                                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-[10px] flex-shrink-0" style={{ backgroundColor: colors[colorIdx] }}>
                                                {initials}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-gray-800 text-xs truncate">{contact.name}</div>
                                                <div className="text-[10px] text-gray-400">{contact.phone}</div>
                                            </div>
                                            {existingChat && <span className="text-[9px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-bold">Chat activo</span>}
                                        </button>
                                    );
                                })}
                            {contacts.filter(c => c.phone && (c.name.toLowerCase().includes(newChatSearch.toLowerCase()) || c.phone.includes(newChatSearch))).length === 0 && (
                                <div className="p-4 text-center text-xs text-gray-400">No se encontraron contactos</div>
                            )}
                        </div>
                    </div>
                )}
                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                    {chats.map(chat => {
                        const chatDigits = normalizePhone(chat.phone || chat.id);
                        const directoryContact = contacts.find(c => normalizePhone(c.phone) === chatDigits);
                        const displayName = directoryContact?.name || chat.name || chat.phone;
                        const initials = (displayName || '?').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                        const colors = ['#EF4444','#F97316','#EAB308','#22C55E','#06B6D4','#3B82F6','#8B5CF6','#EC4899'];
                        const colorIdx = (displayName || '').split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % colors.length;
                        return (
                            <button key={chat.id} onClick={() => setSelectedChat({...chat, name: displayName})} className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 group ${selectedChat?.id === chat.id ? 'bg-red-50 border-l-4 border-red-500 shadow-sm' : 'hover:bg-white border-l-4 border-transparent'}`}>
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-xs flex-shrink-0 shadow-sm" style={{ backgroundColor: colors[colorIdx] }}>
                                    {initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="font-bold text-gray-800 text-sm truncate">{displayName}</div>
                                        {chat.lastMessageAt && (
                                            <span className="text-[9px] text-gray-400 font-semibold flex-shrink-0">{formatChatListTime(chat.lastMessageAt)}</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate mt-0.5">{chat.lastMessage}</div>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteChat(chat.id); }} 
                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-red-100 text-gray-300 hover:text-red-500 transition-all flex-shrink-0"
                                    title="Eliminar conversación"
                                >
                                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </button>
                        );
                    })}
                    {chats.length === 0 && <div className="text-center p-4 text-sm text-gray-400">No hay mensajes recientes.</div>}
                </div>
            </div>
            <div className="w-2/3 flex flex-col bg-white h-full relative">
                {selectedChat ? (
                    <>
                        <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-white z-10 shadow-sm">
                            {(() => {
                                const chatDigits = normalizePhone(selectedChat.phone || selectedChat.id);
                                const dirContact = contacts.find((c: ContactItem) => normalizePhone(c.phone) === chatDigits);
                                const displayName = dirContact?.name || selectedChat.name || selectedChat.phone;
                                const initials = (displayName || '?').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                                const colors = ['#EF4444','#F97316','#EAB308','#22C55E','#06B6D4','#3B82F6','#8B5CF6','#EC4899'];
                                const colorIdx = (displayName || '').split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % colors.length;
                                return (
                                    <>
                                        <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-sm shadow-md" style={{ backgroundColor: colors[colorIdx] }}>
                                            {initials}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-gray-800">{displayName}</div>
                                            <div className="text-xs text-gray-400">{selectedChat.phone}</div>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteChat(selectedChat.id)} 
                                            className="p-2 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all" 
                                            title="Eliminar conversación"
                                        >
                                            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </>
                                );
                            })()}
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 relative pb-32">
                            {chatMessages.map((msg: any) => (
                                <div key={msg.id} className={`flex flex-col ${msg.direction === 'outbound' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[70%] rounded-2xl text-sm shadow-sm overflow-hidden ${
                                        msg.type === 'sticker' 
                                            ? 'bg-transparent shadow-none' 
                                            : msg.direction === 'outbound' 
                                                ? 'bg-red-500 text-white rounded-br-none' 
                                                : 'bg-white border border-gray-100 text-gray-700 rounded-bl-none'
                                    }`}>
                                        {/* IMAGE */}
                                        {msg.type === 'image' && msg.mediaId && (
                                            <div>
                                                <img 
                                                    src={`/api/whatsapp/media?id=${msg.mediaId}`} 
                                                    alt={msg.caption || 'Imagen'} 
                                                    className="max-w-full rounded-t-2xl cursor-pointer hover:opacity-90 transition-opacity"
                                                    style={{ maxHeight: '300px', objectFit: 'cover', width: '100%' }}
                                                    onClick={() => window.open(`/api/whatsapp/media?id=${msg.mediaId}`, '_blank')}
                                                />
                                                {msg.caption && <div className="p-3 text-sm">{msg.caption}</div>}
                                            </div>
                                        )}
                                        {/* VIDEO */}
                                        {msg.type === 'video' && msg.mediaId && (
                                            <div>
                                                <video src={`/api/whatsapp/media?id=${msg.mediaId}`} controls className="max-w-full rounded-t-2xl" style={{ maxHeight: '300px' }} />
                                                {msg.caption && <div className="p-3 text-sm">{msg.caption}</div>}
                                            </div>
                                        )}
                                        {/* AUDIO */}
                                        {msg.type === 'audio' && msg.mediaId && (
                                            <div className="p-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-lg">🎵</span>
                                                    <span className="text-xs font-semibold opacity-80">Nota de voz</span>
                                                </div>
                                                <audio src={`/api/whatsapp/media?id=${msg.mediaId}`} controls className="w-full" style={{ height: '36px' }} />
                                            </div>
                                        )}
                                        {/* DOCUMENT */}
                                        {msg.type === 'document' && msg.mediaId && (
                                            <div className="p-3">
                                                <a href={`/api/whatsapp/media?id=${msg.mediaId}`} target="_blank" rel="noopener noreferrer"
                                                    className={`flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02] ${msg.direction === 'outbound' ? 'bg-red-400/30' : 'bg-slate-50'}`}
                                                >
                                                    <span className="text-2xl">📄</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-bold text-xs truncate">{msg.filename || 'Documento'}</div>
                                                        <div className="text-[10px] opacity-60 uppercase">{msg.mimeType || 'Archivo'}</div>
                                                    </div>
                                                    <span className="text-lg">⬇️</span>
                                                </a>
                                                {msg.caption && <div className="mt-2 text-sm">{msg.caption}</div>}
                                            </div>
                                        )}
                                        {/* STICKER */}
                                        {msg.type === 'sticker' && msg.mediaId && (
                                            <img src={`/api/whatsapp/media?id=${msg.mediaId}`} alt="Sticker" className="w-32 h-32 object-contain" />
                                        )}
                                        {/* LOCATION */}
                                        {msg.type === 'location' && (
                                            <div className="p-3">
                                                <a href={`https://www.google.com/maps?q=${msg.latitude},${msg.longitude}`} target="_blank" rel="noopener noreferrer"
                                                    className={`flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02] ${msg.direction === 'outbound' ? 'bg-red-400/30' : 'bg-slate-50'}`}
                                                >
                                                    <span className="text-2xl">📍</span>
                                                    <div>
                                                        <div className="font-bold text-xs">{msg.locationName || 'Ubicación'}</div>
                                                        <div className="text-[10px] opacity-60">{msg.locationAddress || `${msg.latitude}, ${msg.longitude}`}</div>
                                                    </div>
                                                </a>
                                            </div>
                                        )}
                                        {/* TEXT (default) */}
                                        {(msg.type === 'text' || msg.type === 'template' || (!msg.type && msg.body)) && (
                                            <div className="p-3">{msg.body}</div>
                                        )}
                                    </div>
                                    {/* TIMESTAMP */}
                                    {msg.timestamp && (
                                        <span className={`text-[10px] text-gray-400 mt-1 px-2 font-medium select-none ${
                                            msg.direction === 'outbound' ? 'text-right' : 'text-left'
                                        }`}>
                                            {formatMsgTime(msg.timestamp)}{msg.direction === 'outbound' && ' ✓'}
                                        </span>
                                    )}
                                </div>
                            ))}
                            {chatMessages.length === 0 && <div className="text-center text-gray-400 text-sm">Inicia la conversación</div>}
                        </div>
                        <div className="absolute bottom-0 w-full bg-white border-t border-gray-100">
                            {/* Attached file preview */}
                            {attachedFile && (
                                <div className="px-4 pt-3 pb-1 flex items-center gap-3 bg-slate-50 border-b border-gray-100">
                                    {attachedPreview ? (
                                        <img src={attachedPreview} alt="Preview" className="w-16 h-16 object-cover rounded-xl border-2 border-red-200 shadow-sm" />
                                    ) : (
                                        <div className="w-16 h-16 rounded-xl bg-red-50 border-2 border-red-200 flex items-center justify-center">
                                            <span className="text-2xl">{attachedFile.type.startsWith('video/') ? '🎥' : attachedFile.type.startsWith('audio/') ? '🎵' : '📄'}</span>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold text-gray-700 truncate">{attachedFile.name}</div>
                                        <div className="text-[10px] text-gray-400">{(attachedFile.size / 1024).toFixed(1)} KB</div>
                                    </div>
                                    <button onClick={() => { setAttachedFile(null); setAttachedPreview(null); }} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            )}
                            <form onSubmit={handleSendChatMessage} className="flex gap-2 p-4 items-center relative">
                                <input type="file" id="chatFileInput" className="hidden" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar" onChange={handleFileSelect} />
                                <button type="button" onClick={() => document.getElementById('chatFileInput')?.click()} className="p-3 rounded-full hover:bg-gray-100 text-gray-500 hover:text-red-500 transition-all flex-shrink-0" title="Adjuntar archivo">
                                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                </button>
                                {/* Emoji Picker Toggle */}
                                <div className="relative" ref={emojiPickerRef}>
                                    <button 
                                        type="button" 
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                                        className={`p-3 rounded-full transition-all flex-shrink-0 ${
                                            showEmojiPicker 
                                                ? 'bg-red-50 text-red-500' 
                                                : 'hover:bg-gray-100 text-gray-500 hover:text-red-500'
                                        }`} 
                                        title="Emojis"
                                    >
                                        <span className="text-xl leading-none">😊</span>
                                    </button>
                                    {/* Emoji Picker Popup */}
                                    {showEmojiPicker && (
                                        <div className="absolute bottom-14 left-0 w-[320px] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden" style={{ animation: 'fadeInUp 0.15s ease-out' }}>
                                            <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                                            <div className="max-h-[280px] overflow-y-auto p-3 space-y-3">
                                                {EMOJI_CATEGORIES.map(cat => (
                                                    <div key={cat.name}>
                                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 sticky top-0 bg-white py-1">{cat.name}</div>
                                                        <div className="grid grid-cols-8 gap-0.5">
                                                            {cat.emojis.map(emoji => (
                                                                <button 
                                                                    key={emoji} 
                                                                    type="button"
                                                                    onClick={() => insertEmoji(emoji)} 
                                                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 hover:scale-125 transition-all text-lg cursor-pointer"
                                                                >
                                                                    {emoji}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <input ref={chatInputRef} type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder={attachedFile ? 'Escribe un caption (opcional)...' : 'Escribe un mensaje...'} className="flex-1 p-3 px-5 rounded-full border border-gray-200 focus:outline-none focus:border-red-400 text-sm shadow-inner" disabled={isSendingMsg} />
                                <button type="submit" disabled={isSendingMsg || (!chatInput.trim() && !attachedFile)} className="bg-red-500 text-white rounded-full p-3 px-6 font-bold shadow-md hover:bg-red-600 disabled:opacity-50 transition-all">
                                    {isSendingMsg ? '...' : 'Enviar'}
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-6 bg-slate-50/50 p-8 text-center select-none">
                        <div className="relative p-1.5 bg-white rounded-full shadow-xl border-2 border-dashed border-red-200">
                            <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center border-4 border-white shadow-inner">
                                <img 
                                    src="/javier_lamarque.jpg" 
                                    alt="Aspirante a la Coordinación Estatal en Defensa de la Transformación y Soberanía Nacional en Sonora, Javier Lamarque" 
                                    className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
                                    onError={(e) => {
                                        e.currentTarget.src = "https://via.placeholder.com/150";
                                    }}
                                />
                            </div>
                            <span className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 border-4 border-white rounded-full shadow-md animate-pulse" />
                        </div>
                        <div className="max-w-md">
                            <h3 className="font-black text-2xl text-gray-800 tracking-tight mb-1">
                                Aspirante a la Coordinación Estatal en Defensa de la Transformación y Soberanía Nacional en Sonora, Javier Lamarque
                            </h3>
                            <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-4">
                                Plataforma de Vinculación Ciudadana
                            </p>
                            <p className="text-sm text-gray-500 leading-relaxed font-medium font-semibold">
                                Canal oficial de WhatsApp para la atención, gestión y contacto directo con las y los ciudadanos del Estado de Sonora.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs bg-white py-2.5 px-5 rounded-full border border-slate-100 shadow-sm text-slate-500 font-semibold mt-2">
                            <span className="text-base animate-bounce">💬</span> Selecciona una conversación del panel izquierdo para comenzar
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
