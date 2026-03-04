/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'selector',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'btn-clicked': '#4361ee',
                'primary-text': '#213547',
            },
        },
    },
    plugins: [],
}
