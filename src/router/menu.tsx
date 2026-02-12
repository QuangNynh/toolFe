import { PERMISSIONS } from '@/constants/permissions'
import { GalleryVerticalEnd, Settings, type LucideIcon } from 'lucide-react'

export interface MenuItem {
  name: string
  url?: string
  icon?: LucideIcon
  permissions?: string[]
  items?: MenuItem[]
}

export const menu: MenuItem[] = [
  {
    name: 'common.menu',
    icon: GalleryVerticalEnd,
    permissions: [PERMISSIONS.ADMIN],
    url: '/'
  },
  {
    name: 'common.system',
    url: '/system',
    icon: Settings,
    permissions: [PERMISSIONS.ADMIN]
  }
]

export const getMenu = (currentPermissions: string[] = []): MenuItem[] => {
  return menu.filter((item) =>
    item.permissions?.some((permission) => currentPermissions.includes(permission))
  )
}
