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

const PinterestIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width="1em"
    height="1em"
    className={props.className}
    {...props}
  >
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.08 3.16 9.4 7.63 11.16-.1-.95-.2-2.4.04-3.43.22-.93 1.4-5.93 1.4-5.93s-.36-.72-.36-1.77c0-1.66.96-2.9 2.16-2.9 1.02 0 1.51.77 1.51 1.68 0 1.03-.65 2.56-.99 3.98-.28 1.19.6 2.16 1.77 2.16 2.12 0 3.76-2.24 3.76-5.47 0-2.86-2.06-4.86-5-4.86-3.4 0-5.4 2.55-5.4 5.2 0 1.03.4 2.14.9 2.74.1.12.11.23.08.35-.1.39-.31 1.25-.35 1.42-.05.2-.18.24-.4.14-1.5-.7-2.43-2.9-2.43-4.66 0-3.8 2.76-7.28 7.95-7.28 4.17 0 7.42 2.97 7.42 6.95 0 4.14-2.61 7.48-6.24 7.48-1.22 0-2.37-.63-2.76-1.38l-.75 2.86c-.27 1.04-1 2.34-1.5 3.14C9.14 23.75 10.53 24 12 24c6.63 0 12-5.37 12-12S18.63 0 12 0z" />
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
    name: 'common.pinterest',
    icon: PinterestIcon,
    permissions: [PERMISSIONS.ADMIN],
    url: '/pinterest-tools'
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
