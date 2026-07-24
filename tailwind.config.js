/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: { 50:'#EFF6FF',100:'#DBEAFE',200:'#BFDBFE',300:'#93C5FD',400:'#60A5FA',500:'#3B82F6',600:'#0057FF',700:'#1D4ED8',800:'#001A4D',900:'#001030' },
        accent: { DEFAULT:'#00C6AE', light:'#E0FDF4' },
        surface: { DEFAULT:'#FFFFFF', subtle:'#F8FAFC', raised:'#F1F5F9' },
        border: { DEFAULT:'#E2E8F0', strong:'#CBD5E1' },
        text: { primary:'#0F172A', secondary:'#475569', muted:'#94A3B8', inverse:'#FFFFFF' },
        status: { pending:'#F59E0B', approved:'#10B981', rejected:'#EF4444', cancelled:'#94A3B8', needs_info:'#8B5CF6' },
      },
      boxShadow: {
        card:'0 1px 3px 0 rgba(0,0,0,.06),0 1px 2px -1px rgba(0,0,0,.04)',
        'card-md':'0 4px 6px -1px rgba(0,0,0,.06),0 2px 4px -2px rgba(0,0,0,.04)',
      },
    },
  },
  plugins: [],
}
