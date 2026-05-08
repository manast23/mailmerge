import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mail Merge Pro',
  description: 'Professional mail merge with open tracking',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}