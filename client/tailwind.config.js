/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        app: {
          bg: {
            primary: '#191919',
            secondary: '#202020',
            tertiary: '#2c2c2c',
            page: '#191919',
            hover: '#2c2c2c',
          },
          text: {
            primary: '#E5E5E5',
            secondary: '#A0A0A0',
            tertiary: '#808080',
          },
          border: {
            light: '#2c2c2c',
            medium: '#404040',
          },
          accent: {
            primary: '#A78BFA',
            'primary-hover': '#C4B5FD',
            'primary-light': 'rgba(167, 139, 250, 0.15)',
          },
        },
      },
      fontFamily: {
        sans: ['Poppins', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        prose: ['Poppins', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '24px',
        '2xl': '32px',
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 2px 8px rgba(0, 0, 0, 0.06)',
        md: '0 4px 12px rgba(0, 0, 0, 0.08)',
        lg: '0 8px 24px rgba(0, 0, 0, 0.1)',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'ease',
      },
    },
  },
  plugins: [],
};
