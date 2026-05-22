'use client'

import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { RightSidebar } from './RightSidebar'
import { usePathname } from 'next/navigation'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/auth')
  const isFullPage = pathname.startsWith('/messages/') || pathname.startsWith('/reels') || pathname.startsWith('/map') || pathname.startsWith('/camera')

  if (isAuthPage) return <>{children}</>

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      <main className={`flex-1 min-h-screen ${isFullPage ? 'ml-16 md:ml-64' : 'ml-16 md:ml-64'}`}>
        <div className={`${isFullPage ? 'w-full' : 'max-w-[1200px] mx-auto flex'}`}>
          {/* Main content */}
          <div className={isFullPage ? 'w-full' : 'flex-1 min-w-0'}>
            <div className={`${isFullPage ? '' : 'border-x border-white/5 min-h-screen'}`}>
              {children}
            </div>
          </div>
          {/* Right sidebar for non-full pages */}
          {!isFullPage && (
            <aside className="hidden xl:block w-80 shrink-0 pl-6 py-4">
              <RightSidebar />
            </aside>
          )}
        </div>
      </main>
      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  )
}
