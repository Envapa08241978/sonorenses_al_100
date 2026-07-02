import { Metadata } from 'next'
import { CitizenEventPage } from '@/app/e/[eventId]/RegistroClient'

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/soy-nexo/databases/(default)/documents`

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getActiveEventId(): Promise<string> {
    try {
        const configRes = await fetch(
            `${FIRESTORE_BASE}/campaigns/main_campaign/config/profile`,
            { cache: 'no-store' }
        )
        if (configRes.ok) {
            const configData = await configRes.json()
            const activeEventId = configData?.fields?.activeEventId?.stringValue
            if (activeEventId) {
                return activeEventId
            }
        }
    } catch (e) {
        console.error("Error fetching active event:", e)
    }
    return 'evento-demo'
}

async function getOgImage(eventId: string): Promise<string> {
    const defaultImage = 'https://www.sonorensesal100.com/logo-sonorenses.png'
    try {
        if (!eventId || eventId === 'evento-demo') return defaultImage
        const eventRes = await fetch(
            `${FIRESTORE_BASE}/campaigns/main_campaign/events/${eventId}`,
            { next: { revalidate: 30 } }
        )
        if (!eventRes.ok) return defaultImage
        const eventData = await eventRes.json()
        return eventData?.fields?.image?.stringValue || defaultImage
    } catch {
        return defaultImage
    }
}

async function getEventName(eventId: string): Promise<string> {
    const defaultName = 'Registro Ciudadano - Carlos Javier Lamarque Cano'
    try {
        if (!eventId || eventId === 'evento-demo') return defaultName
        const eventRes = await fetch(
            `${FIRESTORE_BASE}/campaigns/main_campaign/events/${eventId}`,
            { next: { revalidate: 30 } }
        )
        if (!eventRes.ok) return defaultName
        const eventData = await eventRes.json()
        return eventData?.fields?.name?.stringValue || defaultName
    } catch {
        return defaultName
    }
}

export async function generateMetadata(): Promise<Metadata> {
    const eventId = await getActiveEventId()
    const [ogImage, eventName] = await Promise.all([getOgImage(eventId), getEventName(eventId)])

    return {
        title: `${eventName} | Sonorenses al 100`,
        description: 'Registro ciudadano y participación comunitaria. Plataforma oficial de Carlos Javier Lamarque Cano para el Estado de Sonora.',
        openGraph: {
            title: eventName,
            description: 'Registro ciudadano y participación comunitaria de Carlos Javier Lamarque Cano.',
            url: `https://www.sonorensesal100.com/registro`,
            siteName: 'Sonorenses al 100 - Carlos Javier Lamarque Cano',
            images: [
                {
                    url: ogImage,
                    width: 1200,
                    height: 630,
                    alt: eventName,
                },
            ],
            locale: 'es_MX',
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: eventName,
            description: 'Registro ciudadano de Carlos Javier Lamarque Cano.',
            images: [ogImage],
        },
    }
}

export default async function RegistroPage() {
    const targetEventId = await getActiveEventId()
    return <CitizenEventPage eventId={targetEventId} />
}
