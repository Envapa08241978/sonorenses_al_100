'use client'
import Link from 'next/link'
import Image from 'next/image'
import { QRCodeSVG } from 'qrcode.react'

export default function Home() {
    return (
        <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
            {/* Navbar */}
            <nav className="w-full bg-white shadow-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        {/* Logo / Brand */}
                        <div className="flex-shrink-0 flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-dorado">
                                <Image
                                    src="/javier_lamarque.jpg" 
                                    alt="Sonorenses al 100"
                                    width={48}
                                    height={48}
                                    className="object-cover"
                                />
                            </div>
                            <span className="font-black text-xl text-guinda hidden sm:block">Sonorenses al 100</span>
                        </div>
                        
                        {/* Nav Buttons */}
                        <div className="flex items-center space-x-4">
                            <Link 
                                href="/registro-dashboard" 
                                className="text-gray-600 hover:text-guinda px-3 py-2 rounded-md font-medium transition-colors"
                            >
                                Inicio (Acceso)
                            </Link>
                            <Link 
                                href="/registro" 
                                className="bg-guinda hover:bg-guinda-700 text-white px-5 py-2.5 rounded-full font-bold shadow-lg transition-transform hover:scale-105"
                            >
                                Registro
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="flex-grow">

                {/* Biography Section */}
                <section id="biografia" className="py-20 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col md:flex-row items-center gap-12">
                            <div className="w-full md:w-1/2 flex justify-center">
                                <div className="relative w-72 h-72 md:w-96 md:h-96 rounded-full overflow-hidden shadow-2xl border-8 border-dorado-100">
                                    <Image 
                                        src="/javier_lamarque.jpg"
                                        alt="Carlos Javier Lamarque Cano"
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            </div>
                            <div className="w-full md:w-1/2">
                                <h2 className="text-sm font-bold text-dorado uppercase tracking-widest mb-2">Conoce al Candidato</h2>
                                <h3 className="text-4xl font-black text-gray-900 mb-6">Carlos Javier Lamarque Cano</h3>
                                <div className="space-y-4 text-gray-600 text-lg leading-relaxed">
                                    <p>
                                        Con una profunda vocación de servicio y un amor inquebrantable por su tierra, Carlos Javier Lamarque Cano se postula como el candidato idóneo para liderar el gobierno del Estado de Sonora por Morena.
                                    </p>
                                    <p>
                                        Su trayectoria política está marcada por su cercanía con la gente, su lucha por la justicia social y su firme compromiso con los principios de la Cuarta Transformación. Javier Lamarque no solo comprende los retos de nuestro estado, sino que cuenta con la experiencia administrativa y legislativa necesaria para implementar soluciones efectivas.
                                    </p>
                                    <p>
                                        Bajo la visión de <strong>"Sonorenses al 100"</strong>, su proyecto busca detonar el desarrollo económico regional, fortalecer la seguridad, y garantizar que los programas sociales lleguen a quienes más lo necesitan, construyendo un Sonora de oportunidades y bienestar para todas las familias.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                {/* Redes Sociales Section */}
                <section className="py-20 bg-white border-t border-gray-100">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-10">
                            <h2 className="text-sm font-bold text-dorado uppercase tracking-widest mb-2">Últimas Actualizaciones</h2>
                            <h3 className="text-3xl font-black text-gray-900">Actividad en Redes Sociales</h3>
                            <p className="text-gray-600 mt-3">Sigue el trabajo de Javier Lamarque de cerca.</p>
                        </div>
                        
                        <div className="flex justify-center">
                            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 p-2">
                                {/* Facebook Page Plugin iframe */}
                                <iframe 
                                    src="https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2Fjavierlamarquecano&tabs=timeline&width=400&height=600&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true&appId" 
                                    width="400" 
                                    height="600" 
                                    style={{ border: 'none', overflow: 'hidden', width: '100%' }} 
                                    scrolling="no" 
                                    frameBorder="0" 
                                    allowFullScreen={true} 
                                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                                    className="rounded-xl"
                                ></iframe>
                            </div>
                        </div>
                    </div>
                </section>

                {/* QR Code Registration Section */}
                <section className="py-20 bg-slate-50 border-t border-gray-200">
                    <div className="max-w-4xl mx-auto px-4 text-center">
                        <h2 className="text-3xl font-black text-gray-900 mb-4">Registro Rápido</h2>
                        <p className="text-gray-600 mb-10 text-lg">
                            Escanea el código QR desde tu celular para registrarte y formar parte de esta gran estructura.
                        </p>
                        <div className="bg-white p-8 rounded-3xl shadow-xl inline-block border-2 border-guinda-100">
                            <div className="w-64 h-64 flex items-center justify-center rounded-xl mb-6 mx-auto">
                                <QRCodeSVG
                                    value="https://www.sonorensesal100.com/registro"
                                    size={256}
                                    bgColor={"#ffffff"}
                                    fgColor={"#000000"}
                                    level={"Q"}
                                    imageSettings={{
                                        src: "/SONORENSES AL 100_logo.jpg",
                                        x: undefined,
                                        y: undefined,
                                        height: 60,
                                        width: 60,
                                        excavate: true,
                                    }}
                                />
                            </div>
                            <Link 
                                href="/registro" 
                                className="block w-full bg-guinda text-white py-3 rounded-xl font-bold hover:bg-guinda-700 transition-colors"
                            >
                                Ir al Formulario Manualmente
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer & Social Media */}
            <footer className="bg-gray-900 text-white py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h4 className="text-2xl font-black text-dorado mb-2">Sonorenses al 100</h4>
                        <p className="text-gray-400">Carlos Javier Lamarque Cano - Morena</p>
                    </div>
                    
                    <div className="flex space-x-6">
                        {/* Social Icons (Placeholders using Unicode or SVG) */}
                        <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-xl hover:bg-dorado hover:text-white transition-colors" title="Facebook">
                            f
                        </a>
                        <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-xl hover:bg-dorado hover:text-white transition-colors" title="Twitter / X">
                            𝕏
                        </a>
                        <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-xl hover:bg-dorado hover:text-white transition-colors" title="Instagram">
                            ig
                        </a>
                        <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-xl hover:bg-dorado hover:text-white transition-colors" title="YouTube">
                            ▶
                        </a>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-8 border-t border-gray-800 text-center text-gray-500 text-sm">
                    &copy; {new Date().getFullYear()} Sonorenses al 100. Todos los derechos reservados.
                </div>
            </footer>
        </div>
    )
}
