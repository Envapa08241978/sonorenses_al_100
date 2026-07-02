import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    metadataBase: new URL('https://www.sonorensesal100.com'),
    title: {
        default: 'Carlos Javier Lamarque Cano | Sonorenses al 100',
        template: '%s | Sonorenses al 100'
    },
    description: 'Plataforma oficial de registro y apoyo ciudadano para Carlos Javier Lamarque Cano. Proyecto Sonorenses al 100 para el Estado de Sonora.',
    keywords: [
        // Político
        'Carlos Javier Lamarque Cano',
        'Candidato Gobernador',
        'Gobernador Sonora',
        'Morena',
        // Local - Sonora
        'Sonora',
        'Estado de Sonora',
        'política Sonora',
        // Gestión
        'registro ciudadano',
        'sonorenses al 100',
        'sistema de votantes'
    ],
    icons: {
        icon: '/logo-sonorenses.png',
        apple: '/logo-sonorenses.png',
    },
    authors: [{ name: 'Carlos Javier Lamarque Cano' }],
    creator: 'Sonorenses al 100',
    publisher: 'Sonorenses al 100',
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    openGraph: {
        type: 'website',
        locale: 'es_MX',
        url: 'https://www.sonorensesal100.com',
        siteName: 'Sonorenses al 100',
        title: 'Carlos Javier Lamarque Cano | Sonorenses al 100',
        description: 'Plataforma oficial de registro para Carlos Javier Lamarque Cano en Sonora.',
        images: [
            {
                url: '/og-image.png',
                width: 1200,
                height: 630,
                alt: 'Carlos Javier Lamarque Cano - Sonorenses al 100',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Carlos Javier Lamarque Cano | Sonorenses al 100',
        description: 'Plataforma oficial de registro y apoyo.',
        images: ['/og-image.png'],
    },
    alternates: {
        canonical: 'https://www.sonorensesal100.com',
    },
    category: 'government',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Organization',
                '@id': 'https://www.sonorensesal100.com/#organization',
                name: 'Sonorenses al 100 - Carlos Javier Lamarque Cano',
                url: 'https://www.sonorensesal100.com',
                logo: {
                    '@type': 'ImageObject',
                    url: 'https://www.sonorensesal100.com/logo-sonorenses.png',
                },
                description: 'Plataforma oficial de registro para Carlos Javier Lamarque Cano. Proyecto Sonorenses al 100.',
            },
            {
                '@type': 'WebSite',
                '@id': 'https://www.sonorensesal100.com/#website',
                url: 'https://www.sonorensesal100.com',
                name: 'Sonorenses al 100',
                publisher: {
                    '@id': 'https://www.sonorensesal100.com/#organization',
                },
            }
        ],
    }

    return (
        <html lang="es">
            <head>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            </head>
            <body className={inter.className}>{children}</body>
        </html>
    )
}
