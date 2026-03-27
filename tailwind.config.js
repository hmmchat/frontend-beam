/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#4E0093',
                    dark: '#3A0C73',
                    light: '#581C87',
                },
                purple: {
                    500: '#9333ea',
                    600: '#7c3aed',
                },
                gold: {
                    400: '#FCD34D',
                    500: '#F59E0B',
                },
            },
            backgroundImage: {
                'gradient-primary': 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
                'gradient-gold': 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)',
                'gradient-purple-dark': 'linear-gradient(135deg, rgba(78, 0, 147, 1) 0%, rgba(88, 28, 135, 0.95) 50%, rgba(78, 0, 147, 1) 100%)',
                'gradient-purple-right': 'linear-gradient(135deg, rgba(58, 12, 163, 0.95) 0%, rgba(88, 28, 135, 0.9) 100%)',
            },
            backdropBlur: {
                xs: '2px',
            },
            animation: {
                'twinkle': 'twinkle linear infinite',
                'float': 'float 6s ease-in-out infinite',
                'pattern-float': 'patternFloat 20s linear infinite',
                'shake': 'shake 0.4s ease',
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                'zoom-slow': 'zoomSlow 20s ease-in-out infinite',
                'grid-drift': 'gridDrift 20s linear infinite',
                'bounce-slow': 'bounceSlow 3s ease-in-out infinite',
            },
            keyframes: {
                gridDrift: {
                    '0%': { backgroundPosition: '0 0' },
                    '100%': { backgroundPosition: '80px 80px' },
                },
                bounceSlow: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                twinkle: {
                    '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
                    '50%': { opacity: '1', transform: 'scale(1.3)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                patternFloat: {
                    '0%': { backgroundPosition: '0 0' },
                    '100%': { backgroundPosition: '150px 150px' },
                },
                shake: {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '25%': { transform: 'translateX(-4px)' },
                    '75%': { transform: 'translateX(4px)' },
                },
                fadeIn: {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                slideUp: {
                    from: { opacity: '0', transform: 'translateY(40px) scale(0.95)' },
                    to: { opacity: '1', transform: 'translateY(0) scale(1)' },
                },
                zoomSlow: {
                    '0%, 100%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.1)' },
                },
            },
        },
    },
    plugins: [],
};
