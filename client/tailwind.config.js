import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Outfit', 'sans-serif'],
                body: ['Inter', 'sans-serif'],
            },
            colors: {
                brand: {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                },
                accent: {
                    50: '#fff1f2',
                    100: '#ffe4e6',
                    500: '#f43f5e',
                },
                perf: {
                    green: '#059669', // emerald-600
                    red: '#dc2626',   // red-600
                    amber: '#d97706', // amber-600
                },
                zerodha: {
                    blue: '#4184f3',
                    orange: '#ff5722',
                    gray: '#e0e0e0',
                    bg: '#f9f9f9'
                }
            }
        },
    },
    plugins: [
        typography,
    ],
}
