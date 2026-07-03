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
    8: { bg: '#A60321', border: '#800000', text: '#FFFFFF', label: 'Coordinador Estatal' },
    7: { bg: '#800020', border: '#600010', text: '#FFFFFF', label: 'Coordinador Distrital Federal' },
    6: { bg: '#1e3a8a', border: '#1e3a8a', text: '#FFFFFF', label: 'Coordinador General' },
    5: { bg: '#2563eb', border: '#1d4ed8', text: '#FFFFFF', label: 'Coordinador Distrital' },
    4: { bg: '#059669', border: '#047857', text: '#FFFFFF', label: 'Coordinador Territorial' },
    3: { bg: '#10b981', border: '#059669', text: '#FFFFFF', label: 'Brigadista' },
    2: { bg: '#34d399', border: '#10b981', text: '#064e3b', label: 'Movilizador' },
    1: { bg: '#f1f5f9', border: '#e2e8f0', text: '#64748b', label: 'Voto' },
};

export const LEVEL_ROLES: Record<number, string> = Object.fromEntries(Object.entries(LEVEL_STYLES).map(([k, v]) => [k, v.label]));

export const SONORA_CENTER = { lat: 29.07, lng: -110.96 } as const;

export type TabId = 'contacts' | 'map' | 'events' | 'broadcast' | 'config' | 'chat';
