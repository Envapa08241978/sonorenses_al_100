import type { Metadata } from 'next'
import './dominadas.css'
import DominadasForm from './DominadasForm'

export const metadata: Metadata = {
    title: 'Torneo Estatal: Dominadas en mi Barrio — Hermosillo 2026',
    description: 'Convocatoria al Torneo Estatal "Dominadas en mi Barrio" organizado por el Candidato Carlos Javier Lamarque Cano. 29 de junio y 01 de julio 2026, Hermosillo, Sonora. Inscripción gratuita.',
    keywords: [
        'dominadas en mi barrio',
        'torneo estatal dominadas',
        'Carlos Javier Lamarque Cano',
        'futbol freestyle Hermosillo',
        'torneo dominadas Sonora',
        'evento deportivo Hermosillo',
        'dominadas pelota Sonora',
    ],
    openGraph: {
        title: 'Torneo Estatal: Dominadas en mi Barrio — Hermosillo 2026',
        description: 'Convocatoria al Torneo Estatal "Dominadas en mi Barrio". 29 de junio y 01 de julio 2026, Hermosillo, Sonora. ¡Inscripción gratuita!',
        url: '/dominadas',
        images: [
            {
                url: '/torneo-hmo.png',
                width: 1198,
                height: 2047,
                alt: 'Torneo Estatal Dominadas en mi Barrio - Convocatoria Hermosillo',
            },
        ],
        type: 'website',
        locale: 'es_MX',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Torneo Estatal: Dominadas en mi Barrio — Hermosillo 2026',
        description: '29 de junio y 01 de julio 2026, Hermosillo, Sonora. ¡Inscripción gratuita!',
        images: ['/torneo-hmo.png'],
    },
}

export default function DominadasPage() {
    return (
        <div className="dominadas-page">
            {/* HERO */}
            <section className="hero" />

            {/* INFO */}
            <section className="info">
                <div className="container">

                    {/* OBJETIVO */}
                    <div className="objetivo-wrapper">
                        <p className="objetivo-title">
                            Con el objetivo de fomentar la actividad física, la sana convivencia y el talento entre nuestra comunidad, el Candidato de la República{' '}
                            <strong style={{ color: '#fff' }}>Carlos Javier Lamarque Cano</strong>{' '}
                            lanza la presente convocatoria:
                        </p>
                    </div>

                    <div className="columns">

                        {/* COL 1 — CATEGORÍAS + SEDES */}
                        <div className="col">

                            <div className="section">
                                <h2>Categorías</h2>

                                <h3>Categoría A</h3>
                                <p>Niño: hasta 10 años</p>
                                <p>Niña: hasta 12 años</p>

                                <h3>Categoría B</h3>
                                <p>Niño: 11 a 14 años</p>
                                <p>Niña: 13 a 15 años</p>

                                <h3>
                                    Categoría Abierta&nbsp;
                                    <em style={{ color: '#d4b06a', fontStyle: 'normal', fontSize: '10px' }}>★ LIBRE ★</em>
                                </h3>
                                <p>Niño: 15 años en adelante</p>
                                <p>Niña: 16 años en adelante</p>

                                <p className="small">✦ Cada categoría compite de manera independiente ✦</p>
                            </div>

                            <div className="section">
                                <h2>Jornadas</h2>
                                <div className="sede-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div className="sede-dot" />
                                        <span className="sede-name" style={{ fontWeight: 800 }}>📅 29 de Junio — Col. Hacienda de la Flor</span>
                                    </div>
                                    <span style={{ fontSize: '11px', opacity: 0.7, paddingLeft: '20px' }}>Callejón la Bomba y C. Hermenegildo Peña Valencia</span>
                                    <span style={{ fontSize: '11px', opacity: 0.7, paddingLeft: '20px' }}>Cancha detrás del Salón CTM</span>
                                    <span className="sede-time" style={{ paddingLeft: '20px' }}>17:30 hrs</span>
                                </div>
                                <div style={{ height: '12px' }} />
                                <div className="sede-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div className="sede-dot" />
                                        <span className="sede-name" style={{ fontWeight: 800 }}>📅 01 de Julio — Col. Coloso</span>
                                    </div>
                                    <span style={{ fontSize: '11px', opacity: 0.7, paddingLeft: '20px' }}>Calle Nueva Circunvalación 1</span>
                                    <span style={{ fontSize: '11px', opacity: 0.7, paddingLeft: '20px' }}>Campo Deportivo Coloso</span>
                                    <span className="sede-time" style={{ paddingLeft: '20px' }}>17:30 hrs</span>
                                </div>
                                <p className="small" style={{ marginTop: '12px' }}>★ Hermosillo, Sonora ★</p>
                            </div>

                        </div>

                        {/* COL 2 — REGISTRO + BASES + PREMIACIÓN */}
                        <div className="col">

                            <div className="section">
                                <h2>Registro</h2>
                                <ul>
                                    <li>Inscripción gratuita</li>
                                    <li>Autorización de tutor</li>
                                    <li>Carta responsiva</li>
                                    <li>Acta de nacimiento</li>
                                    <li>INE tutor</li>
                                </ul>
                                <div className="download-links">
                                    <a
                                        href="/Carta_Responsiva.pdf"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="download-link"
                                    >
                                        <span className="dl-icon">📄</span>
                                        Descargar Carta Responsiva
                                    </a>
                                    <a
                                        href="/Autorizacion.pdf"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="download-link"
                                    >
                                        <span className="dl-icon">📋</span>
                                        Descargar Autorización de Tutor
                                    </a>
                                </div>
                            </div>

                            <div className="section">
                                <h2>Bases</h2>
                                <ul>
                                    <li>Mayor tiempo dominando la pelota</li>
                                    <li>Sin manos ni brazos</li>
                                    <li>Una oportunidad por ronda</li>
                                </ul>
                            </div>

                            <div className="section">
                                <h2>Premiación</h2>
                                <div className="premio premio-1">
                                    <span className="premio-rank">1°</span>
                                    <span className="premio-text">Jersey, balón y medalla</span>
                                </div>
                                <div className="premio premio-2">
                                    <span className="premio-rank">2°</span>
                                    <span className="premio-text">Balón y medalla</span>
                                </div>
                                <div className="premio premio-3">
                                    <span className="premio-rank">3°</span>
                                    <span className="premio-text">Medalla</span>
                                </div>
                            </div>

                        </div>

                        {/* COL 3 — DISPOSICIONES + CTA */}
                        <div className="col">

                            <div className="section">
                                <h2>Disposiciones</h2>
                                <div className="disp-item">
                                    <span className="disp-icon">⏱</span>
                                    <span>Puntualidad obligatoria</span>
                                </div>
                                <div className="disp-item">
                                    <span className="disp-icon">👕</span>
                                    <span>Ropa deportiva</span>
                                </div>
                                <div className="disp-item">
                                    <span className="disp-icon">⚽</span>
                                    <span>Balón opcional</span>
                                </div>
                            </div>

                            <div className="section" style={{ marginBottom: '20px' }}>
                                <h2>¿Cómo participar?</h2>
                                <div>
                                    <div className="step-item">
                                        <span className="step-number">1</span>
                                        <span className="step-text">Inscríbete en línea</span>
                                    </div>
                                    <div className="step-item">
                                        <span className="step-number">2</span>
                                        <span className="step-text">Descarga la autorización de tutor y la carta responsiva</span>
                                    </div>
                                    <div className="step-item">
                                        <span className="step-number">3</span>
                                        <span className="step-text">Llévalas junto con el acta de nacimiento e INE del tutor el día del evento</span>
                                    </div>
                                </div>
                            </div>

                            <div className="cta-box">
                                <div className="cta-text">
                                    ¡Participa y<br />muestra tu<br />talento!
                                </div>
                                <p className="cta-sub">Hermosillo, Sonora · 29 Jun y 01 Jul 2026</p>
                                <div className="fecha-badge">ENTRADA LIBRE · GRATUITO</div>
                            </div>

                        </div>

                    </div>
                </div>
            </section>

            {/* FORMULARIO */}
            <section className="form-section">
                <div className="container">
                    <div>
                        <h2 style={{ textAlign: 'center', display: 'block', color: '#8d2a1e' }}>Inscríbete aquí</h2>
                        <p className="form-subtitle">Registro gratuito · 29 de Junio y 01 de Julio 2026</p>
                    </div>
                    <DominadasForm />
                </div>
            </section>
        </div>
    )
}
