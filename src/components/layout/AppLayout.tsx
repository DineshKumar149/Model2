'use client'

import { Sidebar } from './Sidebar'
import { usePathname } from 'next/navigation'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/auth')

  if (isAuthPage) return <>{children}</>

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 ml-20 md:ml-64 bg-background min-h-screen">
        <div className="w-full max-w-5xl mx-auto border-x min-h-screen">
          {children}
        </div>
      </main>
    </div>
  )
}
