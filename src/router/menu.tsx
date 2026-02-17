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
  },
  {
    name: 'common.adio',
    url: '/audio',
    icon: Settings,
    permissions: [PERMISSIONS.ADMIN]
  },
  {
    name: 'common.linkVideos',
    url: '/link-videos',
    icon: Settings,
    permissions: [PERMISSIONS.ADMIN]
  },
  {
    name: 'common.audioToSrt',
    url: '/audio-to-srt',
    icon: Settings,
    permissions: [PERMISSIONS.ADMIN]
  },
  {
    name: 'common.exportSrt',
    url: '/export-srt',
    icon: Settings,
    permissions: [PERMISSIONS.ADMIN]
  }
]

export const getMenu = (currentPermissions: string[] = []): MenuItem[] => {
  return menu.filter((item) =>
    item.permissions?.some((permission) => currentPermissions.includes(permission))
  )
}
