import { User } from 'firebase/auth';

export interface ContactItem {
    id: string;
    name: string;
    phone: string;
    cp?: string;
    colonia?: string;
    calle?: string;
    numExt?: string;
    parentId?: string;
    parentName?: string;
    level?: number;
    pyramidType?: 'votation' | 'defense';
    roles?: string[];
    eventId: string;
    eventIds?: string[];
    eventName: string;
    eventNames?: string[];
    timestamp: any;
    seccional?: string;
    distrito?: string;
    brigadista?: string;
    invitedBy?: string;
    municipio?: string;
    numInt?: string;
    qrSent?: boolean;
    source?: string;
    consent?: string;
    lastBroadcastTemplate?: string;
    lastBroadcastAt?: any;
}

export interface EventItem {
    id: string;
    name: string;
    date: string;
    location: string;
    coords: string;
    image: string;
    description: string;
    time: string;
    active?: boolean;
    targetSeccionales?: string[];
    targetColonias?: string[];
    targetContacts?: string[];
    sentInvitations?: string[];
}

export interface BrigadistaItem {
    id: string;
    name: string;
    phone: string;
    seccional: string;
    timestamp: any;
}

export const LEVEL_STYLES: Record<number, { bg: string, border: string, text: string, label: string }> = {
    5: { bg: '#2563eb', border: '#1d4ed8', text: '#FFFFFF', label: 'Coordinador General' },
    4: { bg: '#059669', border: '#047857', text: '#FFFFFF', label: 'Coordinador Territorial' },
    3: { bg: '#10b981', border: '#059669', text: '#FFFFFF', label: 'Brigadista' },
    2: { bg: '#34d399', border: '#10b981', text: '#064e3b', label: 'Ciudadano Movilizador' },
    1: { bg: '#f1f5f9', border: '#e2e8f0', text: '#64748b', label: 'Ciudadano Concientizado' },
};

export const LEVEL_ROLES: Record<number, string> = Object.fromEntries(Object.entries(LEVEL_STYLES).map(([k, v]) => [k, v.label]));

export const SONORA_CENTER = { lat: 29.07, lng: -110.96 } as const;

export type TabId = 'contacts' | 'map' | 'events' | 'broadcast' | 'config' | 'chat';
