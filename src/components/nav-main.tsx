import { ChevronRight } from 'lucide-react'

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@/components/ui/sidebar'
import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { MenuItem } from '@/router/menu'
import { useTranslation } from 'react-i18next'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
export function NavMain({ projects }: { projects: MenuItem[] }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const path = location.pathname

  return (
    <SidebarGroup>
      <SidebarMenu>
        {projects.map((item, index) => (
          <React.Fragment key={index}>
            {item.items ? (
              <Collapsible
                asChild
                defaultOpen={item.items.some((subItem) => path === subItem.url)}
                className='group/collapsible'
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={t(item.name)}
                      className='py-5 data-[active=true]:bg-sidebar-primary data-[active=true]:text-primary cursor-pointer'
                      isActive={path === item.url}
                    >
                      {item.icon && <item.icon />}
                      <span className='font-medium'>{t(item.name)}</span>
                      <ChevronRight className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.name}>
                          <SidebarMenuSubButton
                            asChild
                            className='py-4 data-[active=true]:bg-sidebar-primary data-[active=true]:text-primary cursor-pointer'
                            isActive={path === subItem.url}
                            onClick={() => navigate(subItem?.url || '/')}
                          >
                            <span>{t(subItem.name)}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ) : (
              <SidebarMenuItem key={index} className='py-0'>
                <SidebarMenuButton
                  asChild
                  onClick={() => navigate(item?.url || '/')}
                  className='py-4 data-[active=true]:bg-sidebar-primary data-[active=true]:text-primary cursor-pointer'
                  isActive={path === item.url}
                >
                  <div className='flex items-center cursor-pointer py-5 font-medium  '>
                    {item.icon && <item.icon />}
                    <span>{t(item.name)}</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </React.Fragment>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
