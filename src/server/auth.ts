/**
 * NextAuth v5 configuration for Supply Chain Scenario Simulator
 * Provides authentication with Google OAuth + credentials provider
 */
import NextAuth, { type DefaultSession } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/server/db'
import type { UserRole } from '@prisma/client'

/**
 * Module augmentation for `next-auth` types
 * Extends the built-in session type to include custom user properties
 */
declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string
      role: UserRole
      organizationId: string
    } & DefaultSession['user']
  }

  interface User {
    role: UserRole
    organizationId: string
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db) as any, // Type cast to avoid version mismatch
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // TODO: Implement password verification
        // For now, this is a placeholder for development
        if (!credentials?.email) return null

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        })

        return user
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        session.user.role = user.role as UserRole
        session.user.organizationId = user.organizationId
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
})

// Export authOptions for compatibility with getServerSession in tRPC
export const authOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async session({ session, user }: any) {
      if (session.user) {
        session.user.id = user.id
        session.user.role = user.role as UserRole
        session.user.organizationId = user.organizationId
      }
      return session
    },
  },
}
