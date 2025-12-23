import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import { AuthButton } from '@/components/auth-button'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Content Automation Dashboard',
  description: 'Web scraping and content automation dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-xl font-bold">
                Content Automation
              </Link>
              <div className="flex items-center gap-6">
                <div className="flex gap-4">
                  <Link href="/" className="text-sm hover:underline">
                    Home
                  </Link>
                  <Link href="/runs" className="text-sm hover:underline">
                    Runs
                  </Link>
                  <Link href="/site-profiles" className="text-sm hover:underline">
                    Site Profiles
                  </Link>
                  <Link href="/metrics" className="text-sm hover:underline">
                    Metrics
                  </Link>
                </div>
                <AuthButton />
              </div>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}