import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import ThemeProvider from '@/components/theme/ThemeProvider'
import AuthThemeSwitcher from '@/components/theme/AuthThemeSwitcher'
import './globals.css'

export const metadata = {
  title: 'WorkNexAI - Smart Workforce Intelligence Platform',
  description: 'AI-powered workforce management and attendance tracking solution for modern organizations. Streamline HR operations with real-time tracking, analytics, and automated workflows.',
  keywords: ['attendance management', 'leave management', 'HR software', 'employee tracking', 'workforce management', 'AI-powered HR'],
}

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f9fc' },
    { media: '(prefers-color-scheme: dark)', color: '#101116' },
  ],
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          {children}
          <AuthThemeSwitcher />
          <Toaster position="top-right" richColors />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
