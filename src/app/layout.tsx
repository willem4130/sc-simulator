import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { TRPCReactProvider } from '@/trpc/react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Iconic Website',
  description: 'A modern Next.js application with tRPC, Prisma, and shadcn/ui',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  )
}
