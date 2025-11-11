'use client'

import { api } from '@/trpc/react'

export default function Home() {
  const { data, isLoading } = api.example.hello.useQuery({ name: 'from tRPC' })

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          Iconic <span className="text-[hsl(280,100%,70%)]">Website</span>
        </h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
          <div className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 hover:bg-white/20">
            <h3 className="text-2xl font-bold">Next.js 16 →</h3>
            <div className="text-lg">
              The latest version of Next.js with App Router and Turbopack
            </div>
          </div>
          <div className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 hover:bg-white/20">
            <h3 className="text-2xl font-bold">tRPC + Prisma →</h3>
            <div className="text-lg">
              End-to-end typesafe APIs with tRPC and database with Prisma
            </div>
          </div>
          <div className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 hover:bg-white/20">
            <h3 className="text-2xl font-bold">shadcn/ui →</h3>
            <div className="text-lg">
              Beautiful, accessible components built with Radix UI and Tailwind CSS
            </div>
          </div>
          <div className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 hover:bg-white/20">
            <h3 className="text-2xl font-bold">TypeScript →</h3>
            <div className="text-lg">
              Fully type-safe with strict TypeScript configuration
            </div>
          </div>
        </div>
        {isLoading ? (
          <p>Loading tRPC query...</p>
        ) : (
          <p className="text-2xl text-white">
            {data ? data.greeting : 'Connecting to tRPC...'}
          </p>
        )}
      </div>
    </main>
  )
}
