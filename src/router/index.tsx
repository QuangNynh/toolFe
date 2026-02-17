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
      }
    ]
  },
  {
    path: '*',
    element: <Navigate replace to='/' />
  }
]
