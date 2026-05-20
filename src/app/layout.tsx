import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mail Merge Pro',
  description: 'Professional mail merge with open tracking',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22><rect width=%2232%22 height=%2232%22 rx=%227%22 fill=%22%23111112%22/><rect x=%224%22 y=%228%22 width=%2224%22 height=%2216%22 rx=%222.5%22 fill=%22none%22 stroke=%22white%22 stroke-width=%221.8%22/><path d=%22M4 12l12 8 12-8%22 stroke=%22white%22 stroke-width=%221.8%22 stroke-linecap=%22round%22 fill=%22none%22/></svg>',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
