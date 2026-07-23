import { Metadata } from 'next'
import { CitizenEventPage } from '@/app/e/[eventId]/RegistroClient'
import { adminDb } from '@/lib/firebaseAdmin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getActiveEvent(): Promise<{ id: string; name?: string; image?: string } | null> {
    try {
        const configDoc = await adminDb.collection('campaigns').doc('main_campaign').collection('config').doc('profile').get()
        if (configDoc.exists) {
            const activeEventId = configDoc.data()?.activeEventId
            if (activeEventId) {
                const eventDoc = await adminDb.collection('campaigns').doc('main_campaign').collection('events').doc(activeEventId).get()
                if (eventDoc.exists) {
                    return { id: eventDoc.id, ...eventDoc.data() }
                }
            }
        }

        // Fallback: get most recent event from events collection
        const latestSnap = await adminDb.collection('campaigns').doc('main_campaign').collection('events').orderBy('date', 'desc').limit(1).get()
        if (!latestSnap.empty) {
            const docData = latestSnap.docs[0]
            return { id: docData.id, ...docData.data() }
        }
    } catch (e) {
        console.error("Error fetching active event for /registro:", e)
    }
    return null
}

export async function generateMetadata(): Promise<Metadata> {
    const activeEvent = await getActiveEvent()
    const defaultName = 'Registro Ciudadano - Carlos Javier Lamarque Cano'
    const defaultImage = 'https://www.sonorensesal100.com/logo-sonorenses.png'

    const eventName = activeEvent?.name || defaultName
    const ogImage = activeEvent?.image || defaultImage

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
    const activeEvent = await getActiveEvent()
    return <CitizenEventPage eventId={activeEvent?.id || ''} hideGalleryAndRespalda={true} />
}
