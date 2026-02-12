import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

type Props = {
  children: React.ReactNode
}

const DefaultLayout = ({ children }: Props) => {
  return (
    <SidebarProvider
      className='h-screen overflow-hidden'
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)'
        } as React.CSSProperties
      }
    >
      <AppSidebar variant='inset' />

      <SidebarInset className='flex flex-col'>
        {/* HEADER */}
        <div className='sticky top-0 z-50 bg-background'>
          <SiteHeader />
        </div>

        {/* CONTENT */}
        <div className='flex-1 min-h-0 overflow-auto scrollbar-custom'>
          <div className='@container/main flex flex-col gap-2 p-4'>{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default DefaultLayout
