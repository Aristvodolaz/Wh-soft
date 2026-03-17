import { Sidebar } from './sidebar'
import { Topbar } from './topbar'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  )
}
