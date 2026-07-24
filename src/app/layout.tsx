import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title:       { default: 'RRHH · BYD Simone', template: '%s · BYD Simone' },
  description: 'Plataforma interna de Recursos Humanos',
  robots:      'noindex, nofollow',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            classNames: {
              toast:       'font-sans text-sm shadow-card-md border border-border',
              title:       'font-semibold text-text-primary',
              description: 'text-text-secondary',
            },
          }}
        />
      </body>
    </html>
  )
}
