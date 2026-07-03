import { Metadata } from 'next'
import { CitizenEventPage } from './RegistroClient'

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/soy-nexo/databases/(default)/documents`

/**
 * Fetches the specific event's image from Firestore via REST API.
 */
async function getOgImage(eventId: string): Promise<string> {
    const defaultImage = 'https://www.sonorensesal100.com/logo-sonorenses.png'

    try {
        if (!eventId) return defaultImage

        const eventRes = await fetch(
            `${FIRESTORE_BASE}/campaigns/main_campaign/events/${eventId}`,
            { next: { revalidate: 30 } }
        )

        if (!eventRes.ok) return defaultImage

        const eventData = await eventRes.json()
        const eventImage = eventData?.fields?.image?.stringValue

        return eventImage || defaultImage
    } catch {
        return defaultImage
    }
}

async function getEventName(eventId: string): Promise<string> {
    const defaultName = 'Registro Ciudadano - Aspirante a la Coordinación Estatal Carlos Javier Lamarque Cano'

    try {
        if (!eventId) return defaultName

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

type Props = {
    params: { eventId: string }
}

export async function generateMetadata(
    { params }: Props
): Promise<Metadata> {
    const [ogImage, eventName] = await Promise.all([getOgImage(params.eventId), getEventName(params.eventId)])

    return {
        title: `${eventName} | Carlos Javier Lamarque Cano`,
        description: 'Registro ciudadano y participación comunitaria. Plataforma oficial del Aspirante a la Coordinación Estatal Carlos Javier Lamarque Cano para el Estado de Sonora.',
        openGraph: {
            title: eventName,
            description: 'Registro ciudadano y participación comunitaria del Aspirante a la Coordinación Estatal Carlos Javier Lamarque Cano.',
            url: `https://www.sonorensesal100.com/e/${params.eventId}`,
            siteName: 'Carlos Javier Lamarque Cano - Aspirante a la Coordinación Estatal en Defensa de la Transformación y Soberanía Nacional en Sonora',
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
            description: 'Registro ciudadano del Aspirante a la Coordinación Estatal Carlos Javier Lamarque Cano.',
            images: [ogImage],
        },
    }
}

export default function RegistroPage({ params }: Props) {
    return <CitizenEventPage eventId={params.eventId} />
}
