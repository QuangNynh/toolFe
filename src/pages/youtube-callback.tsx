import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { youtubeService } from '@/services/youtube.service'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react'

export const YouTubeCallbackPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Đang xử lý kết nối kênh YouTube...')
  const [channelInfo, setChannelInfo] = useState<{ channelTitle: string; channelId: string } | null>(null)
  
  const hasProcessedRef = useRef(false)

  useEffect(() => {
    if (errorParam) {
      setStatus('error')
      setMessage(`Google trả lỗi xác thực: ${errorParam}`)
      return
    }

    if (!code) {
      setStatus('error')
      setMessage('Không tìm thấy mã Authorization Code trên URL callback.')
      return
    }

    // StrictMode & Session lock to prevent double execution of single-use authorization code
    if (hasProcessedRef.current) return
    const sessionKey = `yt_code_${code}`
    if (sessionStorage.getItem(sessionKey)) {
      return
    }

    hasProcessedRef.current = true
    sessionStorage.setItem(sessionKey, 'processed')

    const processCode = async () => {
      try {
        const res = await youtubeService.submitAuthCallback(code)
        if (res.success) {
          const title = res.channel?.channelTitle || ''
          // If in popup window, close automatically
          if (window.opener) {
            setStatus('success')
            setMessage(res.message || 'Kết nối kênh YouTube thành công!')
            if (res.channel) {
              setChannelInfo({
                channelTitle: res.channel.channelTitle,
                channelId: res.channel.channelId
              })
            }
            setTimeout(() => {
              window.close()
            }, 2000)
          } else {
            // Redirect back to schedule tab with success flag
            navigate(
              `/youtube-tools?tab=schedule&connected_success=1${title ? `&channelTitle=${encodeURIComponent(title)}` : ''}`,
              { replace: true }
            )
          }
        } else {
          setStatus('error')
          setMessage(res.error || res.message || 'Xác thực kênh YouTube thất bại.')
        }
      } catch (err: any) {
        setStatus('error')
        setMessage(err?.response?.data?.message || err.message || 'Lỗi khi gửi mã xác thực lên server.')
      }
    }

    processCode()
  }, [code, errorParam, navigate])

  return (
    <div className='min-h-screen flex items-center justify-center bg-background p-4'>
      <Card className='w-full max-w-md p-6 text-center space-y-4 shadow-xl border-red-500/20'>
        {status === 'loading' && (
          <div className='space-y-3 py-6'>
            <Loader2 className='h-12 w-12 text-red-600 animate-spin mx-auto' />
            <h2 className='text-lg font-bold text-foreground'>Đang kết nối Kênh YouTube...</h2>
            <p className='text-xs text-muted-foreground'>{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className='space-y-4 py-4 animate-in fade-in'>
            <div className='w-14 h-14 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30'>
              <CheckCircle2 className='h-8 w-8' />
            </div>
            <h2 className='text-xl font-bold text-emerald-600 dark:text-emerald-400'>Kết nối thành công!</h2>
            <p className='text-xs text-muted-foreground'>{message}</p>

            {channelInfo && (
              <div className='p-3 rounded-lg bg-muted/40 border text-xs font-mono'>
                <p className='font-bold text-foreground'>{channelInfo.channelTitle}</p>
                <p className='text-red-500'>ID: {channelInfo.channelId}</p>
              </div>
            )}

            <Button
              onClick={() => navigate('/youtube-tools?tab=schedule')}
              className='bg-red-600 hover:bg-red-700 text-white text-xs font-semibold w-full flex items-center justify-center gap-2'
            >
              <ArrowLeft className='h-4 w-4' /> Quay lại Lên lịch công chiếu YouTube
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className='space-y-4 py-4 animate-in fade-in'>
            <div className='w-14 h-14 bg-red-500/10 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-500/30'>
              <XCircle className='h-8 w-8' />
            </div>
            <h2 className='text-xl font-bold text-red-600 dark:text-red-400'>Kết nối thất bại</h2>
            <p className='text-xs text-red-500 font-medium'>{message}</p>

            <Button
              onClick={() => navigate('/youtube-tools?tab=schedule')}
              variant='outline'
              className='text-xs font-semibold w-full flex items-center justify-center gap-2'
            >
              <ArrowLeft className='h-4 w-4' /> Thử lại ở màn Lên lịch công chiếu
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}

export default YouTubeCallbackPage
