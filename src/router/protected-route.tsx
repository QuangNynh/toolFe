import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuthStore } from '@/store/useAuth'

interface ProtectedRouteProps {
  children: ReactNode
  roles: string[]
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
  const { user } = useAuthStore()

  if (user?.permissions?.some((item: string) => roles.includes(item))) {
    return children
  }
  return <Navigate to='/' replace />
}

export default ProtectedRoute
