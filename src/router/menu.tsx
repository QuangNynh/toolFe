import { PERMISSIONS } from '@/constants/permissions'
import { Settings, Instagram, Youtube, Music, type LucideIcon } from 'lucide-react'

export interface MenuItem {
  name: string
  url?: string
  icon?: LucideIcon
  permissions?: string[]
  items?: MenuItem[]
}

export const menu: MenuItem[] = [
  {
    name: 'common.youtube',
    icon: Youtube,
    permissions: [PERMISSIONS.ADMIN],
    items: [
      {
        name: 'common.system',
        url: '/system',
        permissions: [PERMISSIONS.ADMIN]
      },
      {
        name: 'common.adio',
        url: '/audio',
        permissions: [PERMISSIONS.ADMIN]
      },
      {
        name: 'common.linkVideos',
        url: '/link-videos',
        permissions: [PERMISSIONS.ADMIN]
      },
      {
        name: 'common.videoYoutube',
        url: '/video-youtube',
        permissions: [PERMISSIONS.ADMIN]
      }
    ]
  },
  {
    name: 'common.instagram',
    icon: Instagram,
    permissions: [PERMISSIONS.ADMIN],
    items: [
      {
        name: 'common.instagramAudio',
        url: '/instagram-audio',
        permissions: [PERMISSIONS.ADMIN]
      }
    ]
  },
  {
    name: 'common.tiktok',
    icon: Music,
    permissions: [PERMISSIONS.ADMIN],
    items: [
      {
        name: 'common.tiktokAudio',
        url: '/tiktok-audio',
        permissions: [PERMISSIONS.ADMIN]
      },
      {
        name: 'common.tiktokVideo',
        url: '/tiktok-video',
        permissions: [PERMISSIONS.ADMIN]
      }
    ]
  },
  {
    name: 'common.generalTools',
    icon: Settings,
    permissions: [PERMISSIONS.ADMIN],
    items: [
      {
        name: 'common.audioToSrt',
        url: '/audio-to-srt',
        permissions: [PERMISSIONS.ADMIN]
      },
      {
        name: 'common.audioToScript',
        url: '/audio-to-script',
        permissions: [PERMISSIONS.ADMIN]
      },
      {
        name: 'common.translateSrt',
        url: '/translate-srt',
        permissions: [PERMISSIONS.ADMIN]
      },
      {
        name: 'common.extractAudio',
        url: '/extract-audio',
        permissions: [PERMISSIONS.ADMIN]
      },
      {
        name: 'common.textToSpeech',
        url: '/text-to-speech',
        permissions: [PERMISSIONS.ADMIN]
      },
      {
        name: 'common.translateVideo',
        url: '/translate-video',
        permissions: [PERMISSIONS.ADMIN]
      },
      {
        name: 'common.chat',
        url: '/chat',
        permissions: [PERMISSIONS.ADMIN]
      },
      {
        name: 'common.scriptConverter',
        url: '/script-converter',
        permissions: [PERMISSIONS.ADMIN]
      }
    ]
  }
]

export const getMenu = (currentPermissions: string[] = []): MenuItem[] => {
  return menu
    .filter((item) =>
      item.permissions?.some((permission) => currentPermissions.includes(permission))
    )
    .map((item) => {
      if (item.items) {
        return {
          ...item,
          items: item.items.filter((subItem) =>
            subItem.permissions?.some((permission) => currentPermissions.includes(permission))
          )
        }
      }
      return item
    })
    .filter((item) => !item.items || item.items.length > 0)
}
