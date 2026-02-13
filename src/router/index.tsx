import { PERMISSIONS } from '@/constants/permissions'
import DefaultLayout from '@/layout/DefaultLayout'
import { lazy } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import ProtectedRoute from './protected-route'
import AudioPage from '@/pages/audio-youtube'
const SystemPage = lazy(() => import('@/pages/sysem-page'))
const YouTubeTranscript = lazy(() => import('@/pages/youtube-transcript'))

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
      }
    ]
  },
  {
    path: '*',
    element: <Navigate replace to='/' />
  }
]
