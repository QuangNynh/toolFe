import { PERMISSIONS } from '@/constants/permissions'
import { Languages, Mic, Music, Settings, Film, Instagram, Youtube, MessageSquare, FileText, type LucideIcon } from 'lucide-react'

export interface MenuItem {
  name: string
  url?: string
  icon?: LucideIcon
  permissions?: string[]
  items?: MenuItem[]
}

export const menu: MenuItem[] = [
  {
    name: 'common.system',
    url: '/system',
    icon: Youtube,
    permissions: [PERMISSIONS.ADMIN]
  },
  {
    name: 'common.adio',
    url: '/audio',
    icon: Youtube,
    permissions: [PERMISSIONS.ADMIN]
  },
  {
    name: 'common.instagramAudio',
    url: '/instagram-audio',
    icon: Instagram,
    permissions: [PERMISSIONS.ADMIN]
  },
  {
    name: 'common.linkVideos',
    url: '/link-videos',
    icon: Youtube,
    permissions: [PERMISSIONS.ADMIN]
  },
  {
    name: 'common.audioToSrt',
    url: '/audio-to-srt',
    icon: Settings,
    permissions: [PERMISSIONS.ADMIN]
  },
  {
    name: 'common.videoYoutube',
    url: '/video-youtube',
    icon: Youtube,
    permissions: [PERMISSIONS.ADMIN]
  },
  {
    name: 'common.translateSrt',
    url: '/translate-srt',
    icon: Languages,
    permissions: [PERMISSIONS.ADMIN]
  },
  {
    name: 'common.extractAudio',
    url: '/extract-audio',
    icon: Music,
    permissions: [PERMISSIONS.ADMIN]
  },
  {
    name: 'common.textToSpeech',
    url: '/text-to-speech',
    icon: Mic,
    permissions: [PERMISSIONS.ADMIN]
  },
  {
    name: 'common.translateVideo',
    url: '/translate-video',
    icon: Film,
    permissions: [PERMISSIONS.ADMIN]
  },
  {
    name: 'common.chat',
    url: '/chat',
    icon: MessageSquare,
    permissions: [PERMISSIONS.ADMIN]
  },
  {
    name: 'common.scriptConverter',
    url: '/script-converter',
    icon: FileText,
    permissions: [PERMISSIONS.ADMIN]
  }
]

export const getMenu = (currentPermissions: string[] = []): MenuItem[] => {
  return menu.filter((item) =>
    item.permissions?.some((permission) => currentPermissions.includes(permission))
  )
}
