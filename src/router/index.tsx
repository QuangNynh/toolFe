import { PERMISSIONS } from '@/constants/permissions'
import DefaultLayout from '@/layout/DefaultLayout'
import { lazy } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import ProtectedRoute from './protected-route'
const YouTubeTranscript = lazy(() => import('@/pages/youtube-transcript'))
const ExportSrtPage = lazy(() => import('@/pages/export-srt'))
const AudioToSrtPage = lazy(() => import('@/pages/audio-to-srt'))
const AudioToScriptPage = lazy(() => import('@/pages/audio-to-script'))
const YoutubeManagementPage = lazy(() => import('@/pages/youtube-management'))
const TranslateSrtPage = lazy(() => import('@/pages/translate-srt'))
const ExtractAudioPage = lazy(() => import('@/pages/extract-audio'))
const TextToSpeechPage = lazy(() => import('@/pages/text-to-speech'))
const TranslateVideoPage = lazy(() => import('@/pages/translate-video'))
const AudioInstagramPage = lazy(() => import('@/pages/audio-instagram'))
const TikTokToolsPage = lazy(() => import('@/pages/tiktok-tools'))
const AudioPinterestPage = lazy(() => import('@/pages/audio-pinterest'))
const ChatPage = lazy(() => import('@/pages/chat'))
const ScriptConverterPage = lazy(() => import('@/pages/script-converter'))

export const routers = [
  {
    element: (
      <DefaultLayout>
        <Outlet />
      </DefaultLayout>
    ),
    children: [
      {
        path: '/',
        index: true,
        element: <YouTubeTranscript />
      },
      {
        path: 'home',
        element: (
          <ProtectedRoute roles={[PERMISSIONS.ADMIN]}>
            <YouTubeTranscript />
          </ProtectedRoute>
        )
      },
      {
        path: '/youtube-tools',
        element: (
          <ProtectedRoute roles={[PERMISSIONS.ADMIN]}>
            <YoutubeManagementPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/instagram-audio',
        element: (
          <ProtectedRoute roles={[PERMISSIONS.ADMIN]}>
            <AudioInstagramPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/tiktok-tools',
        element: (
          <ProtectedRoute roles={[PERMISSIONS.ADMIN]}>
            <TikTokToolsPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/pinterest-tools',
        element: (
          <ProtectedRoute roles={[PERMISSIONS.ADMIN]}>
            <AudioPinterestPage />
          </ProtectedRoute>
        )
      },

      {
        path: '/export-srt',
        element: (
          <ProtectedRoute roles={[PERMISSIONS.ADMIN]}>
            <ExportSrtPage />
          </ProtectedRoute>
        )
      },

      {
        path: '/audio-to-srt',
        element: (
          <ProtectedRoute roles={[PERMISSIONS.ADMIN]}>
            <AudioToSrtPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/audio-to-script',
        element: (
          <ProtectedRoute roles={[PERMISSIONS.ADMIN]}>
            <AudioToScriptPage />
          </ProtectedRoute>
        )
      },

      {
        path: '/translate-srt',
        element: (
          <ProtectedRoute roles={[PERMISSIONS.ADMIN]}>
            <TranslateSrtPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/extract-audio',
        element: (
          <ProtectedRoute roles={[PERMISSIONS.ADMIN]}>
            <ExtractAudioPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/text-to-speech',
        element: (
          <ProtectedRoute roles={[PERMISSIONS.ADMIN]}>
            <TextToSpeechPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/translate-video',
        element: (
          <ProtectedRoute roles={[PERMISSIONS.ADMIN]}>
            <TranslateVideoPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/chat',
        element: (
          <ProtectedRoute roles={[PERMISSIONS.ADMIN]}>
            <ChatPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/script-converter',
        element: (
          <ProtectedRoute roles={[PERMISSIONS.ADMIN]}>
            <ScriptConverterPage />
          </ProtectedRoute>
        )
      }
    ]
  },
  {
    path: '*',
    element: <Navigate replace to='/' />
  }
]
