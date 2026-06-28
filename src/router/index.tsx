import { PERMISSIONS } from '@/constants/permissions'
import DefaultLayout from '@/layout/DefaultLayout'
import AudioPage from '@/pages/audio-youtube'
import VideoViewPages from '@/pages/video-view'
import { lazy } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import ProtectedRoute from './protected-route'
const SystemPage = lazy(() => import('@/pages/sysem-page'))
const YouTubeTranscript = lazy(() => import('@/pages/youtube-transcript'))
const ExportSrtPage = lazy(() => import('@/pages/export-srt'))
const AudioToSrtPage = lazy(() => import('@/pages/audio-to-srt'))
const VideoYoutubePage = lazy(() => import('@/pages/video-youtube'))
const TranslateSrtPage = lazy(() => import('@/pages/translate-srt'))
const ExtractAudioPage = lazy(() => import('@/pages/extract-audio'))
const TextToSpeechPage = lazy(() => import('@/pages/text-to-speech'))
const TranslateVideoPage = lazy(() => import('@/pages/translate-video'))
const AudioInstagramPage = lazy(() => import('@/pages/audio-instagram'))

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
        path: '/system',
        element: (
          <ProtectedRoute roles={[PERMISSIONS.ADMIN]}>
            <SystemPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/audio',
        element: (
          <ProtectedRoute roles={[PERMISSIONS.ADMIN]}>
            <AudioPage />
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
        path: '/link-videos',
        element: (
          <ProtectedRoute roles={[PERMISSIONS.ADMIN]}>
            <VideoViewPages />
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
        path: '/video-youtube',
        element: (
          <ProtectedRoute roles={[PERMISSIONS.ADMIN]}>
            <VideoYoutubePage />
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
      }
    ]
  },
  {
    path: '*',
    element: <Navigate replace to='/' />
  }
]
