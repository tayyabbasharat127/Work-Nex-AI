import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata = {
  title: 'WorkNexAI - Smart Workforce Intelligence Platform',
  description: 'AI-powered workforce management and attendance tracking solution for modern organizations. Streamline HR operations with real-time tracking, analytics, and automated workflows.',
  keywords: ['attendance management', 'leave management', 'HR software', 'employee tracking', 'workforce management', 'AI-powered HR'],
}

export const viewport = {
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
