import { PERMISSIONS } from '@/constants/permissions'
import { Settings, Instagram, Youtube } from 'lucide-react'

import React from 'react'

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width="1em"
    height="1em"
    className={props.className}
    {...props}
  >
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.63 4.14 1.02 1.11 2.45 1.8 3.97 1.93v3.86c-1.39-.08-2.77-.57-3.92-1.37a8.03 8.03 0 01-2.43-2.6v7.35c.03 1.54-.36 3.09-1.12 4.43-.8 1.42-2 2.58-3.46 3.3-1.52.76-3.25.99-4.9.68-1.63-.3-3.15-1.2-4.22-2.48a8.3 8.3 0 01-1.74-4.52c-.11-1.65.25-3.32 1.05-4.76.81-1.45 2.06-2.61 3.56-3.3 1.25-.57 2.63-.78 3.98-.62V8.2c-1.02-.15-2.07.03-3 .52a4.42 4.42 0 00-2.22 2.5 4.38 4.38 0 00.32 3.65c.67.99 1.76 1.64 2.94 1.77 1.2.14 2.44-.2 3.34-1 .85-.75 1.34-1.85 1.36-2.98V.02z" />
  </svg>
)

export interface MenuItem {
  name: string
  url?: string
  icon?: any
  permissions?: string[]
  items?: MenuItem[]
}

export const menu: MenuItem[] = [
  {
    name: 'common.youtube',
    icon: Youtube,
    permissions: [PERMISSIONS.ADMIN],
    url: '/youtube-tools'
  },
  {
    name: 'common.instagram',
    icon: Instagram,
    permissions: [PERMISSIONS.ADMIN],
    url: '/instagram-audio',
  },
  {
    name: 'common.tiktok',
    icon: TikTokIcon,
    permissions: [PERMISSIONS.ADMIN],
    url: '/tiktok-tools'
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
