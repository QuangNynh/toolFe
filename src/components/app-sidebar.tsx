import * as React from 'react'

import { NavMain } from '@/components/nav-main'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { getMenu } from '@/router/menu'
import { useAuthStore } from '@/store/useAuth'
import { GalleryVerticalEnd } from 'lucide-react'
import { Link } from 'react-router-dom'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuthStore()
  const menu = getMenu(user?.permissions)
  return (
    <Sidebar collapsible='icon' {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size='lg' asChild>
              <Link to='/'>
                <div className='bg-sidebar-primary text-primary flex aspect-square size-8 items-center justify-center rounded-lg'>
                  <GalleryVerticalEnd className='size-4' />
                </div>
                <div className='flex flex-col gap-0.5 leading-none'>
                  <span className='font-medium'>Youtube Transcript</span>
                  <span className=''>v1.0.0</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain projects={menu} />
      </SidebarContent>
    </Sidebar>
  )
}
