'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { db, storage, auth } from '@/lib/firebase';
import { 
    collection, query, orderBy, onSnapshot, doc, getDoc, setDoc, 
    addDoc, updateDoc, deleteDoc, arrayUnion, serverTimestamp, writeBatch,
    where, getDocs 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { useLoadScript } from '@react-google-maps/api';
import * as XLSX from 'xlsx';

// --- Extracted Components ---
import { ContactItem, EventItem, BrigadistaItem, LEVEL_ROLES, TabId } from './components/types';
import LoginScreen from './components/LoginScreen';
import StatsPanel from './components/StatsPanel';
import DirectoryTab from './components/DirectoryTab';
import ChatTab from './components/ChatTab';
import MapTab from './components/MapTab';
import EventsTab from './components/EventsTab';
import BroadcastTab from './components/BroadcastTab';
import ConfigTab from './components/ConfigTab';
import QRModal from './components/modals/QRModal';
import EventFormModal from './components/modals/EventFormModal';
import InvitationModal from './components/modals/InvitationModal';
import PreRegistrosModal from './components/modals/PreRegistrosModal';
import EditContactModal from './components/modals/EditContactModal';

/* ================================================================
   MAIN DASHBOARD — ORCHESTRATOR
   ================================================================ */
export default function RegistroDashboard() {
    // --- Authentication & Identity ---
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);

    // --- Core Navigation ---
    const [activeTab, setActiveTab] = useState<TabId>('contacts');

    // --- Campaign Data States ---
    const [contacts, setContacts] = useState<ContactItem[]>([]);
    const [events, setEvents] = useState<EventItem[]>([]);
    const [brigadistas, setBrigadistas] = useState<BrigadistaItem[]>([]);
    const [config, setConfig] = useState<any>({
        name: 'Sonorenses al 100', title: 'Control Estratégico', party: 'Morena',
        phone: '', photo: '', logo: '', dashboardPassword: 'Lamarque2027',
        accentColor: '#8A1538', backgroundColor: '#ffffff', textColor: '#333333', activeEventId: null
    });

    // --- Google Maps ---
    const { isLoaded: isMapLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    });

    // --- Directory Filters ---
    const [searchQuery, setSearchQuery] = useState('');
    const [filterEvents, setFilterEvents] = useState<string[]>([]);
    const [filterColonias, setFilterColonias] = useState<string[]>([]);
    const [filterSeccionales, setFilterSeccionales] = useState<string[]>([]);
    const [filterLevels, setFilterLevels] = useState<number[]>([]);
    const [filterLevelExact, setFilterLevelExact] = useState(false);
    const [filterPyramidType, setFilterPyramidType] = useState<'all' | 'votation' | 'defense'>('all');
    const [filterOnlyOrphans, setFilterOnlyOrphans] = useState(false);

    // --- Editing & Communication ---
    const [editingContact, setEditingContact] = useState<ContactItem | null>(null);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // --- Event & Invitation ---
    const [showEventForm, setShowEventForm] = useState(false);
    const [eventForm, setEventForm] = useState<Partial<EventItem>>({
        name: '', date: '', location: '', coords: '', image: '', description: '', time: '',
        targetSeccionales: [], targetColonias: [], targetContacts: []
    });
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [invitationEventId, setInvitationEventId] = useState<string | null>(null);
    const [invitationSentContacts, setInvitationSentContacts] = useState<Set<string>>(new Set());

    // --- Pre-registros ---
    const [preRegistrosEventId, setPreRegistrosEventId] = useState<string | null>(null);
    const [preRegistrosList, setPreRegistrosList] = useState<any[]>([]);
    const [isLoadingPreRegistros, setIsLoadingPreRegistros] = useState(false);

    // --- Broadcast ---
    const [broadcastVariables, setBroadcastVariables] = useState<string[]>(['']);
    const [broadcastHeaderImage, setBroadcastHeaderImage] = useState('');
    const [broadcastTemplate, setBroadcastTemplate] = useState('');
    const [broadcastTestPhone, setBroadcastTestPhone] = useState('');
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [broadcastProgress, setBroadcastProgress] = useState(0);
    const [broadcastSeccionalFilters, setBroadcastSeccionalFilters] = useState<string[]>([]);
    const [broadcastRoleFilters, setBroadcastRoleFilters] = useState<string[]>([]);
    const [broadcastSegmentFilters, setBroadcastSegmentFilters] = useState<string[]>([]);

    // --- Config & Brigadistas ---
    const [isEditingConfig, setIsEditingConfig] = useState(false);
    const [configForm, setConfigForm] = useState<any>(config);
    const [brigForm, setBrigForm] = useState({ name: '', phone: '', seccional: '' });
    const [isSavingBrig, setIsSavingBrig] = useState(false);

    // --- Chat ---
    const [chats, setChats] = useState<any[]>([]);
    const [selectedChat, setSelectedChat] = useState<any>(null);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isSendingMsg, setIsSendingMsg] = useState(false);
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
    const [showNewChatPicker, setShowNewChatPicker] = useState(false);
    const [newChatSearch, setNewChatSearch] = useState('');

    // --- QR ---
    const [selectedQRContact, setSelectedQRContact] = useState<ContactItem | null>(null);

    /* ================================================================
       EFFECTS — Data Loading
       ================================================================ */
    useEffect(() => {
        const loadInitial = async () => {
            try {
                const configDoc = await getDoc(doc(db, 'campaigns', 'main_campaign', 'config', 'profile'));
                if (configDoc.exists()) {
                    const data = configDoc.data();
                    setConfig((prev: any) => ({ ...prev, ...data }));
                    setConfigForm((prev: any) => ({ ...prev, ...data }));
                }
            } catch (err) { console.log('Config log: default applied'); }
            // NOTE: map_data.json is now lazy-loaded inside MapTab
        };
        loadInitial();
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) { setUser(currentUser); setIsAuthenticated(true); }
            else { setUser(null); setIsAuthenticated(false); }
            setIsLoadingAuth(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return;
        const cRef = collection(db, 'campaigns', 'main_campaign', 'contacts');
        const qC = query(cRef, orderBy('timestamp', 'desc'));
        const unsubC = onSnapshot(qC, (snap) => setContacts(snap.docs.map(d => ({ id: d.id, ...d.data() } as any))));

        const eRef = collection(db, 'campaigns', 'main_campaign', 'events');
        const unsubE = onSnapshot(eRef, (snap) => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as any))));

        const bRef = collection(db, 'campaigns', 'main_campaign', 'brigadistas');
        const qB = query(bRef, orderBy('timestamp', 'desc'));
        const unsubB = onSnapshot(qB, (snap) => setBrigadistas(snap.docs.map(d => ({ id: d.id, ...d.data() } as any))));

        const chatsRef = collection(db, 'campaigns', 'main_campaign', 'chats');
        const qChats = query(chatsRef, orderBy('lastMessageAt', 'desc'));
        const unsubChats = onSnapshot(qChats, (snap) => setChats(snap.docs.map(d => ({ id: d.id, ...d.data() } as any))));

        return () => { unsubC(); unsubE(); unsubB(); unsubChats(); };
    }, [isAuthenticated]);

    useEffect(() => {
        if (!selectedChat) return;
        const messagesRef = collection(db, 'campaigns', 'main_campaign', 'chats', selectedChat.id, 'messages');
        const qMessages = query(messagesRef, orderBy('timestamp', 'asc'));
        const unsub = onSnapshot(qMessages, (snap) => setChatMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => unsub();
    }, [selectedChat]);

    /* ================================================================
       HANDLERS
       ================================================================ */
    const normalizePhone = (phone: string) => phone.replace(/\D/g, '').slice(-10);

    const handleLogin = async () => {
        setLoginError('');
        if (!userEmail || !password) { setLoginError('Llene todos los campos'); return; }
        try { await signInWithEmailAndPassword(auth, userEmail, password); } catch (err) { setLoginError('Credenciales invalidas'); }
    };

    const handleLogout = () => signOut(auth);

    const handleImportContacts = async (importedContacts: any[]) => {
        if (!importedContacts || importedContacts.length === 0) return;
        
        if (!window.confirm(`¿Estás seguro de importar ${importedContacts.length} contactos?`)) return;

        try {
            const contactsByPhone = new Map(contacts.map(c => [c.phone, c]));
            
            const chunkSize = 500;
            let successCount = 0;
            
            for (let i = 0; i < importedContacts.length; i += chunkSize) {
                const chunk = importedContacts.slice(i, i + chunkSize);
                const batch = writeBatch(db);
                
                for (const row of chunk) {
                    const rawPhone = row.Celular?.toString() || '';
                    const phone = normalizePhone(rawPhone);
                    const name = row.Nombre?.toString().trim();
                    
                    if (!phone || !name) continue; 
                    
                    let parentId = '';
                    let parentName = '';
                    let level = parseInt(row.Nivel) || 1;
                    
                    const leaderPhoneStr = row['Celular Lider']?.toString();
                    if (leaderPhoneStr) {
                        const leaderPhone = normalizePhone(leaderPhoneStr);
                        const leader = contactsByPhone.get(leaderPhone);
                        if (leader) {
                            parentId = leader.id;
                            parentName = leader.name;
                        }
                    }
                    
                    const newRef = doc(collection(db, 'campaigns', 'main_campaign', 'contacts'));
                    batch.set(newRef, {
                        name,
                        phone,
                        level,
                        seccional: row.Seccion?.toString() || '',
                        colonia: row.Colonia?.toString() || '',
                        calle: row.Calle?.toString() || '',
                        numExt: row.NumExt?.toString() || '',
                        municipio: row.Municipio?.toString() || '',
                        invitedBy: row['Invitado Por']?.toString() || '',
                        parentId,
                        parentName,
                        timestamp: serverTimestamp(),
                        source: 'excel_import'
                    });
                    successCount++;
                }
                
                await batch.commit();
            }
            
            alert(`Se importaron exitosamente ${successCount} contactos.`);
        } catch (error) {
            console.error('Error importing contacts:', error);
            alert('Error al importar contactos. Revisa la consola.');
        }
    };

    const handlePromote = async (item: ContactItem) => {
        const newLevel = (item.level || 1) + 1;
        if (newLevel > 8) return;
        try {
            const batch = writeBatch(db);
            batch.update(doc(db, 'campaigns', 'main_campaign', 'contacts', item.id), { level: newLevel });
            const subordinates = contacts.filter(c => c.parentId === item.id);
            subordinates.forEach(sub => {
                batch.update(doc(db, 'campaigns', 'main_campaign', 'contacts', sub.id), { level: (sub.level || 1) + 1 });
            });
            await batch.commit();
            alert(`Promoción exitosa: ${item.name} sube a Nivel ${newLevel} y sus ${subordinates.length} subordinados subieron con él.`);
        } catch (err) { console.error(err); }
    };

    const handleDemote = async (item: ContactItem) => {
        const newLevel = (item.level || 1) - 1;
        if (newLevel < 1) return;
        try { await updateDoc(doc(db, 'campaigns', 'main_campaign', 'contacts', item.id), { level: newLevel }); } catch (err) { console.error(err); }
    };

    const handleReassign = async (itemId: string, newParentId: string) => {
        try {
            const pSnap = await getDoc(doc(db, 'campaigns', 'main_campaign', 'contacts', newParentId));
            const pName = pSnap.exists() ? pSnap.data().name : 'Admin';
            await updateDoc(doc(db, 'campaigns', 'main_campaign', 'contacts', itemId), { parentId: newParentId, parentName: pName });
            alert('Líder reasignado');
        } catch (err) { console.error(err); }
    };

    const handleSaveEdit = async () => {
        if (!editingContact) return;
        setIsSavingEdit(true);
        try {
            const { id, ...data } = editingContact;
            await updateDoc(doc(db, 'campaigns', 'main_campaign', 'contacts', id), data);
            setEditingContact(null);
            alert('Registro actualizado correctamente');
        } catch (err) { console.error(err); }
        finally { setIsSavingEdit(false); }
    };

    const handleWhatsApp = (item: ContactItem) => {
        const cleanPhone = item.phone.replace(/\D/g, '');
        const msg = encodeURIComponent(`Hola ${item.name}`);
        window.open(`https://wa.me/52${cleanPhone}?text=${msg}`, '_blank');
    };

    const handleSendQR = async (item: ContactItem) => {
        const link = typeof window !== 'undefined' ? `${window.location.origin}/registro?ref=${item.id}` : `/registro?ref=${item.id}`;
        const cleanPhone = item.phone.replace(/\D/g, '');
        const msg = encodeURIComponent(`¡Hola ${item.name.split(' ')[0]}! 👋\n\nTe comparto tu enlace personal de reclutamiento para la plataforma ciudadana de ${config.name}. 🗳️\n\n✅ Comparte este link con las personas que quieras registrar:\n${link}\n\n¡Tu participación es muy importante! 💪`);
        window.open(`https://wa.me/52${cleanPhone}?text=${msg}`, '_blank');
        try { await updateDoc(doc(db, 'campaigns', 'main_campaign', 'contacts', item.id), { qrSent: true }); } catch (err) { console.error(err); }
    };

    const handleSendChatMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!selectedChat) return;
        if (attachedFile) { await handleSendMedia(); return; }
        if (!chatInput.trim()) return;
        setIsSendingMsg(true);
        try {
            const res = await fetch('/api/whatsapp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: selectedChat.phone, message: chatInput.trim() }) });
            if (res.ok) { setChatInput(''); } else { const err = await res.json(); alert('Error al enviar: ' + JSON.stringify(err)); }
        } catch (error) { console.error(error); }
        setIsSendingMsg(false);
    };

    const handleSendMedia = async () => {
        if (!attachedFile || !selectedChat) return;
        setIsSendingMsg(true);
        try {
            const formData = new FormData(); formData.append('file', attachedFile);
            const uploadRes = await fetch('/api/whatsapp/upload', { method: 'POST', body: formData });
            const uploadData = await uploadRes.json();
            if (!uploadRes.ok) { alert('Error al subir archivo: ' + JSON.stringify(uploadData.error)); setIsSendingMsg(false); return; }
            const mime = attachedFile.type;
            let mediaType = 'document';
            if (mime.startsWith('image/')) mediaType = 'image';
            else if (mime.startsWith('video/')) mediaType = 'video';
            else if (mime.startsWith('audio/')) mediaType = 'audio';
            const res = await fetch('/api/whatsapp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: selectedChat.phone, mediaId: uploadData.mediaId, mediaType, message: chatInput.trim() || '', filename: attachedFile.name }) });
            if (res.ok) { setChatInput(''); setAttachedFile(null); setAttachedPreview(null); } else { const err = await res.json(); alert('Error al enviar multimedia: ' + JSON.stringify(err)); }
        } catch (error) { console.error(error); }
        setIsSendingMsg(false);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setAttachedFile(file);
        if (file.type.startsWith('image/')) { const reader = new FileReader(); reader.onload = (ev) => setAttachedPreview(ev.target?.result as string); reader.readAsDataURL(file); }
        else { setAttachedPreview(null); }
    };

    const handleStartNewChat = async (contact: ContactItem) => {
        const contactDigits = normalizePhone(contact.phone);
        const existingChat = chats.find(ch => normalizePhone(ch.phone || ch.id) === contactDigits);
        if (existingChat) {
            setSelectedChat({ ...existingChat, name: contact.name });
            try { await setDoc(doc(db, 'campaigns', 'main_campaign', 'chats', existingChat.id), { name: contact.name }, { merge: true }); } catch (e) { console.error(e); }
        } else {
            setSelectedChat({ id: contact.phone, phone: contact.phone, name: contact.name, lastMessage: '' });
        }
        setShowNewChatPicker(false); setNewChatSearch('');
    };

    const handleDeleteChat = async (chatId: string) => {
        if (!confirm('¿Estás seguro de eliminar esta conversación y todos sus mensajes?')) return;
        try {
            const messagesRef = collection(db, 'campaigns', 'main_campaign', 'chats', chatId, 'messages');
            const msgSnap = await getDocs(messagesRef);
            const batch = writeBatch(db);
            msgSnap.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
            await deleteDoc(doc(db, 'campaigns', 'main_campaign', 'chats', chatId));
            if (selectedChat?.id === chatId) setSelectedChat(null);
        } catch (e) { console.error(e); alert('Error al eliminar la conversación'); }
    };

    const handleMetaBroadcast = async (targetContacts: ContactItem[]) => {
        if (!broadcastTemplate) { alert('Debe especificar el nombre de la plantilla de Meta.'); return; }
        if (!confirm(`¿Está seguro de enviar la plantilla "${broadcastTemplate}" a ${targetContacts.length} contactos?`)) return;
        setIsBroadcasting(true); setBroadcastProgress(0);
        for (let i = 0; i < targetContacts.length; i++) {
            const c = targetContacts[i];
            const name = c.name.split(' ')[0];
            const varsReplaced = broadcastVariables.map(v => v.replace(/\{nombre\}/gi, name));
            try { await fetch('/api/whatsapp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: c.phone, templateName: broadcastTemplate.trim(), templateParams: varsReplaced, headerImageUrl: broadcastHeaderImage.trim() }) }); } catch (error) { console.error(error); }
            setBroadcastProgress(i + 1);
            await new Promise(r => setTimeout(r, 300));
        }
        setIsBroadcasting(false); alert('Difusión completada ✅');
    };

    const handleTestBroadcast = async () => {
        if (!broadcastTemplate) { alert('Debe especificar el nombre de la plantilla de Meta.'); return; }
        if (!broadcastTestPhone) { alert('Debe ingresar un número de prueba.'); return; }
        setIsBroadcasting(true);
        const varsReplaced = broadcastVariables.map(v => v.replace(/\{nombre\}/gi, 'Usuario de Prueba'));
        try {
            const res = await fetch('/api/whatsapp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: broadcastTestPhone, templateName: broadcastTemplate.trim(), templateParams: varsReplaced, headerImageUrl: broadcastHeaderImage.trim() }) });
            if (res.ok) {
                alert('Mensaje de prueba enviado ✅');
            } else {
                const errData = await res.json();
                alert(`Error de Meta API: ${JSON.stringify(errData.error || errData)}`);
            }
        } catch (error) { console.error(error); alert('Error de conexión al servidor.'); }
        setIsBroadcasting(false);
    };

    const saveEvent = async () => {
        if (!eventForm.name) return;
        setIsSaving(true);
        try {
            if (editingEventId) await updateDoc(doc(db, 'campaigns', 'main_campaign', 'events', editingEventId), eventForm);
            else await addDoc(collection(db, 'campaigns', 'main_campaign', 'events'), { ...eventForm, active: false });
            setShowEventForm(false);
        } catch (err) { console.error(err); }
        finally { setIsSaving(false); }
    };

    const handleSetActiveEvent = async (eventId: string) => {
        try {
            const newActiveId = config.activeEventId === eventId ? null : eventId;
            await setDoc(doc(db, 'campaigns', 'main_campaign', 'config', 'profile'), { activeEventId: newActiveId }, { merge: true });
            setConfig((prev: any) => ({ ...prev, activeEventId: newActiveId }));
        } catch (err) { console.error(err); }
    };

    const handleDifundir = (ev: EventItem) => {
        const link = typeof window !== 'undefined' ? `${window.location.origin}/e/${ev.id}` : `/e/${ev.id}`;
        const msg = encodeURIComponent(`🏛️ *${ev.name}*\n📅 ${ev.date}\n🕐 ${ev.time}\n📍 ${ev.location}${ev.description ? `\n\n${ev.description}` : ''}\n\n✅ Registra tu asistencia aquí:\n${link}`);
        window.open(`https://wa.me/?text=${msg}`, '_blank');
    };

    const handleEventImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setIsUploadingImage(true);
        const sRef = ref(storage, `events/${Date.now()}_${file.name}`);
        const task = uploadBytesResumable(sRef, file);
        task.on('state_changed', (s) => setUploadProgress(Math.round((s.bytesTransferred / s.totalBytes)*100)),
        (err) => { console.error(err); setIsUploadingImage(false); },
        async () => { const url = await getDownloadURL(task.snapshot.ref); setEventForm(p => ({...p, image: url})); setIsUploadingImage(false); });
    };

    const saveConfig = async () => {
        setIsSaving(true);
        try { await setDoc(doc(db, 'campaigns', 'main_campaign', 'config', 'profile'), configForm, { merge: true }); setConfig(configForm); setIsEditingConfig(false); }
        catch (err) { console.error(err); } finally { setIsSaving(false); }
    };

    const handleOpenPreRegistros = async (eventId: string) => {
        setPreRegistrosEventId(eventId); setIsLoadingPreRegistros(true);
        try {
            const preRef = collection(db, 'campaigns', 'main_campaign', 'events', eventId, 'pre_registros');
            const snap = await getDocs(preRef);
            const data = snap.docs.map(d => {
                const prData = d.data();
                const contactInfo = contacts.find(c => c.id === prData.contactId);
                return { id: d.id, ...prData, calle: prData.calle || contactInfo?.calle || '', numExt: prData.numExt || contactInfo?.numExt || '', seccional: prData.seccional || contactInfo?.seccional || '', roles: prData.roles?.length ? prData.roles : (contactInfo?.roles || []), parentName: prData.parentName || contactInfo?.parentName || '' };
            });
            data.sort((a: any, b: any) => { const aT = a.timestamp || a.createdAt; const bT = b.timestamp || b.createdAt; return aT && bT ? bT.toMillis() - aT.toMillis() : 0; });
            setPreRegistrosList(data);
        } catch(e) { console.error(e); }
        finally { setIsLoadingPreRegistros(false); }
    };

    const exportDominadasToExcel = async () => {
        try {
            const snap = await getDocs(collection(db, 'campaigns', 'main_campaign', 'dominadas_registros'));
            const data = snap.docs.map(d => d.data());
            if (data.length === 0) { alert('No hay registros de dominadas.'); return; }
            
            const guaymasRows: any[] = [];
            const hermosilloRows: any[] = [];

            data.forEach(c => {
                let fecha = '---';
                if (c.timestamp) { 
                    const dt = (c.timestamp as any)?.toDate ? (c.timestamp as any).toDate() : new Date(c.timestamp); 
                    if (!isNaN(dt.getTime())) fecha = dt.toLocaleString('es-MX'); 
                }
                
                const row = { 
                    'Nombre': c.nombre, 
                    'Tutor': c.tutor || '', 
                    'Email': c.email || '', 
                    'Celular Participante': c.celular, 
                    'Celular Tutor': c.celularTutor || '',
                    'Categoría': c.categoriaLabel || c.categoria, 
                    'Sede': c.sedeLabel || c.sede, 
                    'Fecha de Registro': fecha 
                };

                // Identificar si es de Hermosillo por los IDs de jornada o nombres de sede
                const isHermosillo = c.jornada === 'jun29_hacienda_flor' || 
                                     c.jornada === 'jul01_coloso' || 
                                     (c.sedeLabel && (c.sedeLabel.toLowerCase().includes('hacienda') || c.sedeLabel.toLowerCase().includes('coloso')));
                
                if (isHermosillo) {
                    hermosilloRows.push(row);
                } else {
                    guaymasRows.push(row);
                }
            });

            const wb = XLSX.utils.book_new();
            
            if (hermosilloRows.length > 0) {
                const wsHmo = XLSX.utils.json_to_sheet(hermosilloRows);
                XLSX.utils.book_append_sheet(wb, wsHmo, "Hermosillo");
            }
            if (guaymasRows.length > 0) {
                const wsGmy = XLSX.utils.json_to_sheet(guaymasRows);
                XLSX.utils.book_append_sheet(wb, wsGmy, "Guaymas");
            }

            XLSX.writeFile(wb, `registros-dominadas-${new Date().toISOString().slice(0,10)}.xlsx`);
        } catch (err) { console.error(err); alert('Error al descargar.'); }
    };

    const mergeDuplicateContact = async (oldId: string, newId: string, brigData: any) => {
        try {
            const oldRef = doc(db, 'campaigns', 'main_campaign', 'contacts', oldId);
            const oldSnap = await getDoc(oldRef); const oldData = oldSnap.exists() ? oldSnap.data() : {};
            const childrenQuery = query(collection(db, 'campaigns', 'main_campaign', 'contacts'), where('parentId', '==', oldId));
            const childrenSnap = await getDocs(childrenQuery);
            const batch = writeBatch(db);
            childrenSnap.forEach(childDoc => { batch.update(childDoc.ref, { parentId: newId, parentName: brigData.name }); });
            await batch.commit();
            await setDoc(doc(db, 'campaigns', 'main_campaign', 'contacts', newId), { ...oldData, name: brigData.name, phone: brigData.phone, seccional: brigData.seccional, level: Math.max(oldData.level || 1, 3), roles: Array.from(new Set([...(oldData.roles || []), 'Brigadista'])), isBrigadista: true, id: newId }, { merge: true });
            if (oldId !== newId) { await deleteDoc(oldRef); }
        } catch (err) { console.error(err); }
    };

    const syncBrigadistasToContacts = async () => {
        if (!confirm('¿Sincronizar movilizadores y LIMPIAR DUPLICADOS?')) return;
        let synced = 0, merged = 0;
        try {
            for (const b of brigadistas) {
                if (!b.phone) continue;
                const cleanPhone = String(b.phone).replace(/\D/g, '');
                const q = query(collection(db, 'campaigns', 'main_campaign', 'contacts'), where('phone', '==', cleanPhone));
                const dupSnap = await getDocs(q);
                if (!dupSnap.empty) {
                    const otherDoc = dupSnap.docs.find(d => d.id !== b.id);
                    if (otherDoc) { await mergeDuplicateContact(otherDoc.id, b.id, b); merged++; }
                    else { const myDoc = dupSnap.docs.find(d => d.id === b.id); if (myDoc) await updateDoc(myDoc.ref, { isBrigadista: true, level: Math.max(myDoc.data().level || 1, 3) }); }
                } else {
                    await setDoc(doc(db, 'campaigns', 'main_campaign', 'contacts', b.id), { name: b.name, phone: cleanPhone, seccional: b.seccional, level: 3, pyramidType: 'votation', parentId: '', parentName: '', roles: ['Brigadista'], isBrigadista: true, timestamp: serverTimestamp() });
                    synced++;
                }
            }
            alert(`✅ ${synced} sincronizados, ${merged} fusionados.`);
        } catch (err: any) { console.error(err); alert(`❌ Error: ${err.message}`); }
    };

    const deleteEvent = async (id: string) => { if (confirm('¿Eliminar evento?')) await deleteDoc(doc(db, 'campaigns', 'main_campaign', 'events', id)); };
    const deleteContact = async (id: string) => { if (confirm('¿Eliminar contacto de la red?')) await deleteDoc(doc(db, 'campaigns', 'main_campaign', 'contacts', id)); };

    /* ================================================================
       DERIVED DATA — Filtering, Sorting, Metrics
       ================================================================ */
    const contactsByParent = useMemo(() => {
        const map: Record<string, ContactItem[]> = {};
        contacts.forEach(c => { if (c.parentId) { if (!map[c.parentId]) map[c.parentId] = []; map[c.parentId].push(c); } });
        return map;
    }, [contacts]);

    const filteredContacts = useMemo(() => {
        const isFiltering = searchQuery || filterSeccionales.length > 0 || filterColonias.length > 0 || filterLevels.length > 0 || filterOnlyOrphans || filterPyramidType !== 'all';
        const direct = contacts.filter(c => {
            const s = searchQuery.toLowerCase();
            const mS = !s || c.name?.toLowerCase().includes(s) || c.phone?.includes(s);
            const mSec = filterSeccionales.length === 0 || filterSeccionales.includes(c.seccional || '');
            const mCol = filterColonias.length === 0 || filterColonias.includes(c.colonia || '');
            const mLev = filterLevels.length === 0 || filterLevels.includes(c.level || 1);
            const mO = !filterOnlyOrphans || !c.parentId;
            const mP = filterPyramidType === 'all' || c.pyramidType === filterPyramidType;
            const contactEvents = Array.from(new Set([...(c.eventNames || []), c.eventName].filter(Boolean)));
            const mEv = filterEvents.length === 0 || filterEvents.some(fe => contactEvents.includes(fe));
            return mS && mSec && mCol && mLev && mO && mP && mEv;
        });
        if (!isFiltering && filterEvents.length === 0) return direct;
        if (direct.length === 0) return [];
        if (filterLevelExact) return direct;
        const allIds = new Set(direct.map(d => d.id));
        const stack = Array.from(allIds);
        while (stack.length > 0) {
            const pid = stack.pop();
            if (pid && contactsByParent[pid]) { contactsByParent[pid].forEach(child => { if (!allIds.has(child.id)) { allIds.add(child.id); stack.push(child.id); } }); }
        }
        return contacts.filter(c => allIds.has(c.id));
    }, [contacts, searchQuery, filterSeccionales, filterColonias, filterLevels, filterLevelExact, filterOnlyOrphans, filterPyramidType, contactsByParent, filterEvents]);

    const sortedContacts = useMemo(() => {
        const result: ContactItem[] = []; const seen = new Set<string>();
        const traverse = (parentId: string) => {
            const children = filteredContacts.filter(c => c.parentId === parentId);
            children.sort((a,b) => (b.level || 0) - (a.level || 0) || a.name.localeCompare(b.name));
            children.forEach(child => { if (!seen.has(child.id)) { seen.add(child.id); result.push(child); traverse(child.id); } });
        };
        const roots = filteredContacts.filter(c => !c.parentId || !filteredContacts.find(p => p.id === c.parentId));
        roots.sort((a,b) => (b.level || 0) - (a.level || 0) || a.name.localeCompare(b.name));
        roots.forEach(root => { if (!seen.has(root.id)) { seen.add(root.id); result.push(root); traverse(root.id); } });
        return result;
    }, [filteredContacts]);

    const uniqueSeccionales = Array.from(new Set(contacts.map(c => c.seccional).filter(Boolean))) as string[];
    const uniqueColonias = Array.from(new Set(contacts.map(c => c.colonia).filter(Boolean))) as string[];
    const uniqueEventNames = Array.from(new Set(contacts.flatMap(c => [...(c.eventNames || []), c.eventName].filter(Boolean)))) as string[];

    // --- Dynamic Theming ---
    const accent = config.accentColor || '#A60321';
    const bgColor = config.backgroundColor || '#ffffff';
    const getRgb = (hex: string) => { let r=0, g=0, b=0; if (hex?.length === 7) { r=parseInt(hex.slice(1,3), 16); g=parseInt(hex.slice(3,5), 16); b=parseInt(hex.slice(5,7), 16); } return `${r}, ${g}, ${b}`; };
    const tcRGB = getRgb(config.textColor || '#333333');
    const themeCSS = `.tpc { color: rgba(${tcRGB}, 1); background: ${bgColor}; } .tpc .text-theme { color: rgba(${tcRGB}, 1)!important } .tpc [data-btn]{ color:#fff!important } .tpc .bg-accent { background: ${accent}!important } .tpc .border-accent { border-color: ${accent}!important }`;

    /* ================================================================
       RENDER
       ================================================================ */
    if (isLoadingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: bgColor }}>
                <div className="w-12 h-12 border-[6px] rounded-full animate-spin" style={{ borderColor: accent, borderTopColor: 'transparent' }} />
            </div>
        );
    }

    return (
        <div className="min-h-screen tpc selection:bg-red-100" style={{ background: bgColor }}>
            <style dangerouslySetInnerHTML={{ __html: themeCSS }} />

            {!isAuthenticated ? (
                <LoginScreen
                    userEmail={userEmail} setUserEmail={setUserEmail}
                    password={password} setPassword={setPassword}
                    loginError={loginError} handleLogin={handleLogin}
                    accent={accent}
                />
            ) : (
                <div className="pb-20">
                    <header className="px-8 py-5 flex items-center justify-between shadow-sm bg-white/90 backdrop-blur-xl sticky top-0 z-[100] border-b border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-white font-black shadow-lg shadow-red-200">CC</div>
                            <div>
                                <h1 className="font-black text-xl text-theme leading-tight">{config.name}</h1>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">{config.title || 'Control Estrategico'}</p>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="px-5 py-2 rounded-xl text-xs text-red-600 bg-red-50 hover:bg-red-100 font-black transition-colors uppercase tracking-widest">Salir</button>
                    </header>

                    <main className="w-full max-w-[1600px] mx-auto px-6 py-10">
                        <StatsPanel
                            contacts={contacts} events={events} accent={accent}
                            filterLevels={filterLevels} setFilterLevels={setFilterLevels}
                            setFilterLevelExact={setFilterLevelExact} setActiveTab={setActiveTab}
                        />

                        {/* Navigation Tabs */}
                        <div className="flex gap-2 md:gap-3 mb-6 md:mb-10 overflow-x-auto pb-4 no-scrollbar">
                            {([
                                { id: 'contacts' as const, label: '👥 Directorio', icon: '👤' },
                                { id: 'chat' as const, label: '💬 Mensajes', icon: '💬' },
                                { id: 'map' as const, label: '🗺️ Alcance', icon: '📍' },
                                { id: 'events' as const, label: '🏛️ Eventos', icon: '📅' },
                                { id: 'broadcast' as const, label: '📢 Difusion', icon: '📣' },
                                { id: 'config' as const, label: '⚙️ Configuración', icon: '⚙️' }
                            ]).map(tab => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-3 md:px-6 md:py-4 rounded-[20px] md:rounded-[24px] text-[10px] md:text-xs font-black transition-all shadow-md flex items-center gap-2 md:gap-3 whitespace-nowrap ${activeTab === tab.id ? 'text-white translate-y-[-2px] shadow-red-200' : 'bg-white text-gray-400 hover:bg-gray-50'}`} style={{ background: activeTab === tab.id ? accent : '' }}>
                                    <span className="text-base md:text-lg">{tab.icon}</span> {tab.label.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        <div className="bg-white rounded-[48px] shadow-2xl border border-gray-100 min-h-[700px] overflow-hidden">
                            {activeTab === 'contacts' && (
                                <DirectoryTab
                                    contacts={contacts} sortedContacts={sortedContacts} filteredContacts={filteredContacts}
                                    searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                                    filterLevels={filterLevels} setFilterLevels={setFilterLevels}
                                    filterSeccionales={filterSeccionales} setFilterSeccionales={setFilterSeccionales}
                                    filterColonias={filterColonias} setFilterColonias={setFilterColonias}
                                    filterEvents={filterEvents} setFilterEvents={setFilterEvents}
                                    filterOnlyOrphans={filterOnlyOrphans} setFilterOnlyOrphans={setFilterOnlyOrphans}
                                    uniqueSeccionales={uniqueSeccionales} uniqueColonias={uniqueColonias} uniqueEventNames={uniqueEventNames}
                                    config={config} handleWhatsApp={handleWhatsApp} handleSendQR={handleSendQR}
                                    handlePromote={handlePromote} handleDemote={handleDemote} handleReassign={handleReassign}
                                    setEditingContact={setEditingContact} setSelectedQRContact={setSelectedQRContact}
                                    deleteContact={deleteContact} handleImportContacts={handleImportContacts}
                                />
                            )}
                            {activeTab === 'chat' && (
                                <ChatTab
                                    contacts={contacts} chats={chats} selectedChat={selectedChat} setSelectedChat={setSelectedChat}
                                    chatMessages={chatMessages} chatInput={chatInput} setChatInput={setChatInput}
                                    isSendingMsg={isSendingMsg} handleSendChatMessage={handleSendChatMessage}
                                    attachedFile={attachedFile} setAttachedFile={setAttachedFile}
                                    attachedPreview={attachedPreview} setAttachedPreview={setAttachedPreview}
                                    handleFileSelect={handleFileSelect} showNewChatPicker={showNewChatPicker}
                                    setShowNewChatPicker={setShowNewChatPicker} newChatSearch={newChatSearch}
                                    setNewChatSearch={setNewChatSearch} handleStartNewChat={handleStartNewChat}
                                    handleDeleteChat={handleDeleteChat} normalizePhone={normalizePhone}
                                />
                            )}
                            {activeTab === 'map' && (
                                <MapTab contacts={contacts} accent={accent} isMapLoaded={isMapLoaded} />
                            )}
                            {activeTab === 'events' && (
                                <EventsTab
                                    events={events} config={config} handleSetActiveEvent={handleSetActiveEvent}
                                    handleDifundir={handleDifundir} setEditingEventId={setEditingEventId}
                                    setEventForm={setEventForm} setShowEventForm={setShowEventForm}
                                    setInvitationEventId={setInvitationEventId} setInvitationSentContacts={setInvitationSentContacts}
                                    handleOpenPreRegistros={handleOpenPreRegistros} exportDominadasToExcel={exportDominadasToExcel}
                                    deleteEvent={deleteEvent}
                                />
                            )}
                            {activeTab === 'broadcast' && (
                                <BroadcastTab
                                    contacts={contacts} 
                                    broadcastVariables={broadcastVariables} setBroadcastVariables={setBroadcastVariables}
                                    broadcastHeaderImage={broadcastHeaderImage} setBroadcastHeaderImage={setBroadcastHeaderImage}
                                    broadcastTemplate={broadcastTemplate} setBroadcastTemplate={setBroadcastTemplate}
                                    broadcastTestPhone={broadcastTestPhone} setBroadcastTestPhone={setBroadcastTestPhone}
                                    isBroadcasting={isBroadcasting} broadcastProgress={broadcastProgress}
                                    broadcastSeccionalFilters={broadcastSeccionalFilters} setBroadcastSeccionalFilters={setBroadcastSeccionalFilters}
                                    broadcastRoleFilters={broadcastRoleFilters} setBroadcastRoleFilters={setBroadcastRoleFilters}
                                    broadcastSegmentFilters={broadcastSegmentFilters} setBroadcastSegmentFilters={setBroadcastSegmentFilters}
                                    uniqueSeccionales={uniqueSeccionales} handleMetaBroadcast={handleMetaBroadcast}
                                    handleTestBroadcast={handleTestBroadcast}
                                />
                            )}
                            {activeTab === 'config' && (
                                <ConfigTab
                                    config={config} configForm={configForm} setConfigForm={setConfigForm}
                                    isEditingConfig={isEditingConfig} setIsEditingConfig={setIsEditingConfig}
                                    saveConfig={saveConfig} brigadistas={brigadistas}
                                    syncBrigadistasToContacts={syncBrigadistasToContacts} accent={accent}
                                />
                            )}
                        </div>
                    </main>
                </div>
            )}

            {/* --- MODALS --- */}
            {selectedQRContact && (
                <QRModal contact={selectedQRContact} config={config} onClose={() => setSelectedQRContact(null)} />
            )}
            {showEventForm && (
                <EventFormModal
                    eventForm={eventForm} setEventForm={setEventForm} editingEventId={editingEventId}
                    saveEvent={saveEvent} isSaving={isSaving} isUploadingImage={isUploadingImage}
                    uploadProgress={uploadProgress} handleEventImageUpload={handleEventImageUpload}
                    onClose={() => setShowEventForm(false)} contacts={contacts}
                    uniqueSeccionales={uniqueSeccionales} uniqueColonias={uniqueColonias}
                />
            )}
            {invitationEventId && (() => {
                const ev = events.find(e => e.id === invitationEventId);
                if (!ev) return null;
                return (
                    <InvitationModal
                        event={ev} contacts={contacts} invitationSentContacts={invitationSentContacts}
                        setInvitationSentContacts={setInvitationSentContacts} config={config}
                        uniqueSeccionales={uniqueSeccionales} uniqueColonias={uniqueColonias}
                        uniqueEventNames={uniqueEventNames} onClose={() => setInvitationEventId(null)}
                    />
                );
            })()}
            {preRegistrosEventId && (
                <PreRegistrosModal
                    eventId={preRegistrosEventId} events={events} preRegistrosList={preRegistrosList}
                    isLoadingPreRegistros={isLoadingPreRegistros} onClose={() => setPreRegistrosEventId(null)}
                />
            )}
            {editingContact && (
                <EditContactModal
                    contact={editingContact} setContact={setEditingContact}
                    handleSaveEdit={handleSaveEdit} isSavingEdit={isSavingEdit}
                    onClose={() => setEditingContact(null)}
                />
            )}
        </div>
    );
}
