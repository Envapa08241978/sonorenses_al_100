/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        // Forced rebuild
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            colors: {
                guinda: {
                    DEFAULT: '#8A1538', // Color guinda base
                    50: '#fdf3f5',
                    100: '#fbe4e9',
                    200: '#f6ced7',
                    300: '#efabb8',
                    400: '#e47d92',
                    500: '#d5546e',
                    600: '#bd3550',
                    700: '#9d2640',
                    800: '#8A1538', // Guinda principal Morena
                    900: '#711531',
                    950: '#3f0717',
                },
                dorado: {
                    DEFAULT: '#D88A2D', // Dorado/Naranja base del logo
                    50: '#faf6f0',
                    100: '#f2e8da',
                    200: '#e3cfb4',
                    300: '#cfac85',
                    400: '#be875a',
                    500: '#b26b3a',
                    600: '#a35431',
                    700: '#87402a',
                    800: '#6f3526',
                    900: '#592c21',
                    950: '#30150f',
                },
                primary: {
                    50: '#fdf3f5',
                    100: '#fbe4e9',
                    200: '#f6ced7',
                    300: '#efabb8',
                    400: '#e47d92',
                    500: '#d5546e',
                    600: '#bd3550',
                    700: '#9d2640',
                    800: '#8A1538', // Guinda
                    900: '#711531',
                    950: '#3f0717',
                },
                accent: {
                    400: '#D88A2D', // Dorado
                    500: '#c57823',
                    600: '#a86219',
                },
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                'pulse-glow': {
                    '0%, 100%': { boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)' },
                    '50%': { boxShadow: '0 0 40px rgba(168, 85, 247, 0.8)' },
                },
            },
        },
    },
    plugins: [],
}
