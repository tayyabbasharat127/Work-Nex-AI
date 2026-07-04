import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata = {
  title: 'WorkNexAI - Smart Workforce Intelligence Platform',
  description: 'AI-powered workforce management and attendance tracking solution for modern organizations. Streamline HR operations with real-time tracking, analytics, and automated workflows.',
  keywords: ['attendance management', 'leave management', 'HR software', 'employee tracking', 'workforce management', 'AI-powered HR'],
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#2d3748',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        {children}
        <Toaster position="top-right" richColors />
        <Analytics />
      </body>
    </html>
  )
}
