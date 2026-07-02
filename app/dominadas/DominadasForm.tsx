'use client'

import { useState } from 'react'
import { db } from '../../lib/firebase'
import { collection, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs, updateDoc } from 'firebase/firestore'
import { useEffect } from 'react'

const CATEGORIAS = [
    { value: 'cat_a_nino', label: 'Categoría "A" — Niño hasta 10 años' },
    { value: 'cat_a_nina', label: 'Categoría "A" — Niña hasta 12 años' },
    { value: 'cat_b_nino', label: 'Categoría "B" — Niño 11 a 14 años' },
    { value: 'cat_b_nina', label: 'Categoría "B" — Niña 13 a 15 años' },
    { value: 'abierta_nino', label: 'Categoría Abierta — Niño 15 años en adelante' },
    { value: 'abierta_nina', label: 'Categoría Abierta — Niña 16 años en adelante' },
]

const JORNADAS = [
    {
        value: 'jun29_hacienda_flor',
        fecha: '29 de Junio 2026',
        sede: 'Col. Hacienda de la Flor',
        direccion: 'Callejón la Bomba y C. Hermenegildo Peña Valencia, Cancha detrás del Salón CTM',
        hora: '17:30 hrs',
        label: '📅 29 de Junio — Col. Hacienda de la Flor (17:30 hrs)',
    },
    {
        value: 'jul01_coloso',
        fecha: '01 de Julio 2026',
        sede: 'Col. Coloso',
        direccion: 'Calle Nueva Circunvalación 1, Campo Deportivo Coloso',
        hora: '17:30 hrs',
        label: '📅 01 de Julio — Col. Coloso (17:30 hrs)',
    },
]

export default function DominadasForm() {
    const [formData, setFormData] = useState({
        nombre: '',
        tutor: '',
        celularTutor: '',
        email: '',
        celular: '',
        categoria: '',
        jornada: '',
    })
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState('')
    const [config, setConfig] = useState<any>(null)

    useEffect(() => {
        const loadConfig = async () => {
            try {
                const configDoc = await getDoc(doc(db, 'campaigns', 'main_campaign', 'config', 'profile'))
                if (configDoc.exists()) {
                    setConfig(configDoc.data())
                }
            } catch (err) {
                console.error('Error loading config:', err)
            }
        }
        loadConfig()
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const validatePhone = (phone: string) => {
        const cleaned = phone.replace(/\D/g, '')
        return cleaned.length === 10
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMsg('')

        // Validations
        if (!formData.nombre.trim()) {
            setErrorMsg('Por favor ingresa tu nombre completo')
            return
        }
        if (!formData.tutor.trim()) {
            setErrorMsg('Por favor ingresa el nombre del padre o tutor')
            return
        }
        if (!validatePhone(formData.celularTutor)) {
            setErrorMsg('El celular del padre/tutor debe tener 10 dígitos')
            return
        }
        if (formData.email.trim() && !formData.email.includes('@')) {
            setErrorMsg('Por favor ingresa un correo electrónico válido')
            return
        }
        if (!validatePhone(formData.celular)) {
            setErrorMsg('El celular del participante debe tener 10 dígitos')
            return
        }
        if (!formData.categoria) {
            setErrorMsg('Por favor selecciona una categoría')
            return
        }
        if (!formData.jornada) {
            setErrorMsg('Por favor selecciona la fecha / jornada')
            return
        }

        setStatus('sending')

        try {
            const categoriaLabel = CATEGORIAS.find(c => c.value === formData.categoria)?.label || formData.categoria
            const jornadaObj = JORNADAS.find(j => j.value === formData.jornada)
            const sedeLabel = jornadaObj ? `${jornadaObj.sede} — ${jornadaObj.hora}` : formData.jornada

            const tutorPhone = formData.celularTutor.replace(/\D/g, '')

            const regRef = await addDoc(collection(db, 'campaigns', 'main_campaign', 'dominadas_registros'), {
                nombre: formData.nombre.trim(),
                tutor: formData.tutor.trim(),
                celularTutor: tutorPhone,
                email: formData.email.trim().toLowerCase(),
                celular: formData.celular.replace(/\D/g, ''),
                categoria: formData.categoria,
                categoriaLabel: categoriaLabel,
                jornada: formData.jornada,
                jornadaFecha: jornadaObj?.fecha || '',
                sede: jornadaObj?.value || formData.jornada,
                sedeLabel: sedeLabel,
                sedeDireccion: jornadaObj?.direccion || '',
                timestamp: serverTimestamp(),
            })

            // Sync Tutor to Main Directory (Contacts) as Level 1 (Voto)
            // Use the TUTOR's phone — check for duplicates first
            if (tutorPhone) {
                try {
                    const contactsRef = collection(db, 'campaigns', 'main_campaign', 'contacts')
                    const q = query(contactsRef, where('phone', '==', tutorPhone))
                    const existingSnap = await getDocs(q)

                    if (existingSnap.empty) {
                        // Tutor does not exist → create new contact
                        await addDoc(contactsRef, {
                            name: formData.tutor.trim(),
                            phone: tutorPhone,
                            level: 1, // Voto
                            pyramidType: 'votation',
                            source: 'dominadas_registration',
                            participantName: formData.nombre.trim(),
                            registrationId: regRef.id,
                            timestamp: serverTimestamp(),
                        })
                    } else {
                        // Tutor already exists → update participantName to keep record
                        const existingDoc = existingSnap.docs[0]
                        await updateDoc(existingDoc.ref, {
                            participantName: formData.nombre.trim(),
                            registrationId: regRef.id,
                        })
                    }
                } catch (syncErr) {
                    console.error('Error syncing tutor to contacts:', syncErr)
                }
            }

            // WhatsApp redirection to the official platform number
            const officialPhone = config?.phone?.replace(/\D/g, '') || '6421000019'
            const waMsg = encodeURIComponent(`¡Hola! Me acabo de registrar para el Torneo de Dominadas "En mi Barrio" ⚽\n\n📋 *Participante:* ${formData.nombre}\n👤 *Tutor:* ${formData.tutor}\n📅 *Fecha:* ${jornadaObj?.fecha || ''}\n📍 *Sede:* ${sedeLabel}\n🏆 *Categoría:* ${categoriaLabel}`);
            const waUrl = `https://wa.me/52${officialPhone}?text=${waMsg}`;
            
            setStatus('success');
            
            // Redirect to WhatsApp after a short delay
            setTimeout(() => {
                window.location.href = waUrl;
            }, 1000);
            
            setFormData({ nombre: '', tutor: '', celularTutor: '', email: '', celular: '', categoria: '', jornada: '' })
        } catch (err) {
            console.error('Error al registrar:', err)
            setStatus('error')
            setErrorMsg('Hubo un error al enviar tu registro. Intenta de nuevo.')
        }
    }

    if (status === 'success') {
        return (
            <div className="dominadas-form-success">
                <div className="success-icon">✅</div>
                <h3 className="success-title">¡Registro exitoso!</h3>
                <p className="success-text">
                    Tu inscripción al Torneo &quot;Dominadas en mi Barrio&quot; ha sido recibida correctamente.
                </p>
                <p className="success-reminder">
                    Recuerda llevar el día del evento:<br />
                    📄 Carta responsiva · 📋 Autorización de tutor · 📑 Acta de nacimiento · 🪪 INE del tutor
                </p>
                <button
                    className="success-btn"
                    onClick={() => setStatus('idle')}
                >
                    Registrar otro participante
                </button>
            </div>
        )
    }

    return (
        <form className="dominadas-form" onSubmit={handleSubmit} noValidate>

            {/* Nombre completo */}
            <div className="form-group">
                <label htmlFor="dom-nombre">Nombre completo del participante</label>
                <input
                    type="text"
                    id="dom-nombre"
                    name="nombre"
                    placeholder="Ej. Juan Pérez López"
                    value={formData.nombre}
                    onChange={handleChange}
                    required
                    autoComplete="name"
                />
            </div>

            {/* Tutor */}
            <div className="form-group">
                <label htmlFor="dom-tutor">Nombre del padre o tutor</label>
                <input
                    type="text"
                    id="dom-tutor"
                    name="tutor"
                    placeholder="Ej. María López"
                    value={formData.tutor}
                    onChange={handleChange}
                    required
                />
            </div>

            {/* Celular Tutor */}
            <div className="form-group">
                <label htmlFor="dom-celular-tutor">Celular WhatsApp del padre/tutor (10 dígitos)</label>
                <input
                    type="tel"
                    id="dom-celular-tutor"
                    name="celularTutor"
                    placeholder="6621234567"
                    value={formData.celularTutor}
                    onChange={handleChange}
                    required
                    maxLength={10}
                    autoComplete="tel"
                />
            </div>

            {/* Email */}
            <div className="form-group">
                <label htmlFor="dom-email">Correo electrónico (Opcional)</label>
                <input
                    type="email"
                    id="dom-email"
                    name="email"
                    placeholder="correo@ejemplo.com"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                />
            </div>

            {/* Celular Participante */}
            <div className="form-group">
                <label htmlFor="dom-celular">Celular del participante (10 dígitos)</label>
                <input
                    type="tel"
                    id="dom-celular"
                    name="celular"
                    placeholder="6621234567"
                    value={formData.celular}
                    onChange={handleChange}
                    required
                    maxLength={10}
                    autoComplete="tel"
                />
            </div>

            {/* Categoría */}
            <div className="form-group">
                <label htmlFor="dom-categoria">Categoría</label>
                <select
                    id="dom-categoria"
                    name="categoria"
                    value={formData.categoria}
                    onChange={handleChange}
                    required
                >
                    <option value="" disabled>Selecciona tu categoría...</option>
                    {CATEGORIAS.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                </select>
            </div>

            {/* Jornada (Fecha + Sede) */}
            <div className="form-group">
                <label htmlFor="dom-jornada">Selecciona la fecha y sede</label>
                <select
                    id="dom-jornada"
                    name="jornada"
                    value={formData.jornada}
                    onChange={handleChange}
                    required
                >
                    <option value="" disabled>Selecciona tu jornada...</option>
                    {JORNADAS.map(j => (
                        <option key={j.value} value={j.value}>{j.label}</option>
                    ))}
                </select>
            </div>

            {/* Error */}
            {errorMsg && (
                <div className="form-error">
                    ⚠️ {errorMsg}
                </div>
            )}

            {/* Submit */}
            <button
                type="submit"
                className="form-submit"
                disabled={status === 'sending'}
            >
                {status === 'sending' ? (
                    <span className="btn-loading">
                        <span className="spinner" /> Enviando...
                    </span>
                ) : (
                    '⚽ Enviar inscripción'
                )}
            </button>
        </form>
    )
}
