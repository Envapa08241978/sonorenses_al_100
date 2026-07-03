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
                                <h2 className="text-sm font-bold text-dorado uppercase tracking-widest mb-2">Conoce al Aspirante</h2>
                                <h3 className="text-4xl font-black text-gray-900 mb-6">Carlos Javier Lamarque Cano</h3>
                                <div className="space-y-4 text-gray-600 text-lg leading-relaxed">
                                    <p>
                                        Con una profunda vocación de servicio y un amor inquebrantable por su tierra, Carlos Javier Lamarque Cano se postula como el <strong>Aspirante a la Coordinación Estatal en Defensa de la Transformación y Soberanía Nacional en Sonora</strong> por Morena.
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
                        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                            <div className="w-full md:w-1/2 text-center md:text-left">
                                <h2 className="text-sm font-bold text-dorado uppercase tracking-widest mb-2">Últimas Actualizaciones</h2>
                                <h3 className="text-4xl font-black text-gray-900 mb-4">Actividad en Redes Sociales</h3>
                                <p className="text-gray-600 text-lg mb-6">Sigue de cerca el trabajo, las propuestas y el día a día de Javier Lamarque.</p>
                                <a 
                                    href="https://www.facebook.com/javierlamarquecano" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 bg-[#1877F2] text-white px-6 py-3 rounded-full font-bold hover:bg-blue-700 transition-colors shadow-lg"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                                    Seguir en Facebook
                                </a>
                            </div>
                            
                            <div className="w-full md:w-1/2 flex justify-center md:justify-end">
                                <div className="w-full max-w-[500px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 p-2 flex justify-center">
                                    {/* Facebook Page Plugin iframe - width 340 for mobile safety, adapt container will expand up to 500 */}
                                    <iframe 
                                        src="https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2Fjavierlamarquecano&tabs=timeline&width=340&height=500&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true&appId" 
                                        width="340" 
                                        height="500" 
                                        style={{ border: 'none', overflow: 'hidden', width: '100%', maxWidth: '340px' }} 
                                        scrolling="no" 
                                        frameBorder="0" 
                                        allowFullScreen={true} 
                                        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                                        className="rounded-xl mx-auto"
                                    ></iframe>
                                </div>
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

            {/* Floating WhatsApp Button */}
            <a 
                href="https://wa.me/5216622244979?text=Hola,%20me%20gustar%C3%ADa%20m%C3%A1s%20informaci%C3%B3n" 
                target="_blank" 
                rel="noopener noreferrer"
                className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 hover:shadow-[#25D366]/50 transition-all flex items-center justify-center group"
                title="Chatea con nuestro Asistente Inteligente"
            >
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-3.825 3.113-6.937 6.937-6.937 3.825 0 6.938 3.112 6.938 6.937 0 3.825-3.113 6.938-6.938 6.938z"/>
                </svg>
                {/* Tooltip */}
                <span className="absolute right-full mr-4 bg-gray-900 text-white text-xs font-bold px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Chatea con Javier Lamarque
                </span>
            </a>
        </div>
    )
}
