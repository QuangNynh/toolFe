import { useRoutes } from 'react-router-dom'
import { routers } from './router'
import { Toaster } from '@/components/ui/sonner'

const App = () => {
  const router = useRoutes(routers)
  return (
    <>
      {router}
      <Toaster />
    </>
  )
}
export default App
