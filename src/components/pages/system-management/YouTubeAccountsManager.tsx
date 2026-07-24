import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  youtubeService,
  type YouTubeChannelItem,
  type YouTubeCheckTokenResponse
} from '@/services/youtube.service'
import {
  Plus,
  RefreshCw,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Youtube,
  UserCheck,
  AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'

interface YouTubeAccountsManagerProps {
  channels?: YouTubeChannelItem[]
  loadingChannels?: boolean
  onChannelChange?: () => void
}

export const YouTubeAccountsManager = ({
  channels: externalChannels,
  loadingChannels: externalLoading,
  onChannelChange
}: YouTubeAccountsManagerProps) => {
  const [internalChannels, setInternalChannels] = useState<YouTubeChannelItem[]>([])
  const [loadingInternal, setLoadingInternal] = useState(false)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<YouTubeChannelItem | null>(null)

  const channels = externalChannels ?? internalChannels
  const loading = externalLoading ?? loadingInternal

  // Token health check states
  const [tokenStatus, setTokenStatus] = useState<Record<string, YouTubeCheckTokenResponse | { loading: boolean }>>({})

  // Fetch connected channels list (API #3 - fallback if externalChannels is not provided)
  const fetchChannels = async () => {
    if (externalChannels !== undefined) {
      if (onChannelChange) onChannelChange()
      return
    }
    setLoadingInternal(true)
    try {
      const res = await youtubeService.getConnectedChannels()
      if (res.success) {
        setInternalChannels(res.channels || [])
      } else {
        toast.error(res.message || 'Không thể lấy danh sách kênh YouTube')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi khi tải danh sách kênh YouTube')
    } finally {
      setLoadingInternal(false)
    }
  }

  useEffect(() => {
    // Only fetch internally if externalChannels is not supplied
    if (externalChannels === undefined) {
      fetchChannels()
    }
  }, [])

  // Direct redirect to Backend Login endpoint (/api/v1/youtube/login)
  const handleDirectLogin = () => {
    window.location.href = youtubeService.getLoginUrl()
  }

  // Handle Disconnect Channel (API #4)
  const executeDisconnect = async () => {
    if (!deleteConfirmTarget) return
    const { channelId, channelTitle } = deleteConfirmTarget

    setDisconnecting(channelId)
    try {
      const res = await youtubeService.disconnectChannel(channelId)
      if (res.success) {
        toast.success(`Đã hủy kết nối kênh "${channelTitle}"`)
        setDeleteConfirmTarget(null)
        fetchChannels()
        if (onChannelChange) onChannelChange()
      } else {
        toast.error(res.message || 'Hủy kết nối thất bại')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi khi hủy kết nối kênh')
    } finally {
      setDisconnecting(null)
    }
  }

  // Manual token health check (API #5)
  const handleCheckToken = async (channelId: string) => {
    setTokenStatus((prev) => ({ ...prev, [channelId]: { loading: true } }))
    try {
      const res = await youtubeService.checkChannelToken(channelId)
      setTokenStatus((prev) => ({ ...prev, [channelId]: res }))
      if (res.isWorking) {
        toast.success(`Kênh "${res.channelTitle}": Token Google đang hoạt động tốt!`)
      } else {
        toast.warning(`Kênh "${res.channelTitle}": Token gặp sự cố (${res.errorMessage || 'Cần kết nối lại'})`)
      }
    } catch (err: any) {
      toast.error('Không thể kiểm tra token của kênh này')
    }
  }

  return (
    <Card className='p-5 shadow-md border-muted/50 bg-card/60 backdrop-blur-sm space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3 border-b pb-4'>
        <div className='flex items-center gap-3'>
          <div className='p-2.5 bg-gradient-to-tr from-red-600 to-rose-600 rounded-lg text-white shadow-md'>
            <Youtube className='h-5 w-5' />
          </div>
          <div>
            <h3 className='font-bold text-lg text-foreground flex items-center gap-2'>
              Tài khoản / Kênh YouTube đã kết nối ({channels.length})
            </h3>
            <p className='text-xs text-muted-foreground'>
              Quản lý các kênh YouTube chính chủ kết nối qua Google OAuth2 để hẹn giờ công chiếu tự động.
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={fetchChannels}
            disabled={loading}
            className='text-xs flex items-center gap-1.5'
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>

          <Button
            onClick={handleDirectLogin}
            className='bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md text-xs font-semibold px-3 py-1.5 flex items-center gap-1.5'
          >
            <Plus className='h-4 w-4' /> Kết nối kênh YouTube mới
          </Button>
        </div>
      </div>

      {/* Connected Channels List */}
      {channels.length === 0 ? (
        <div className='text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg p-6 space-y-3 bg-muted/20'>
          <Youtube className='h-10 w-10 mx-auto text-muted-foreground/50' />
          <p className='font-medium'>Chưa có kênh YouTube nào được kết nối.</p>
          <p className='text-xs text-muted-foreground max-w-md mx-auto'>
            Bấm nút <strong>"Kết nối kênh YouTube mới"</strong> để ủy quyền Google OAuth2 và bắt đầu tự động công chiếu video.
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {channels.map((chan) => {
            const checkRes = tokenStatus[chan.channelId] as YouTubeCheckTokenResponse | undefined
            const isChecking = (tokenStatus[chan.channelId] as any)?.loading

            return (
              <div
                key={chan.channelId}
                className='p-4 rounded-xl border bg-card/80 hover:border-red-500/30 transition-all shadow-sm flex flex-col justify-between space-y-3'
              >
                <div className='flex items-start gap-3'>
                  {chan.thumbnailUrl ? (
                    <img
                      src={chan.thumbnailUrl}
                      alt={chan.channelTitle}
                      className='w-12 h-12 rounded-full object-cover border border-red-500/20 shadow-sm'
                    />
                  ) : (
                    <div className='w-12 h-12 rounded-full bg-gradient-to-tr from-red-600 to-orange-600 text-white flex items-center justify-center font-bold text-lg shadow-sm'>
                      {chan.channelTitle.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className='flex-1 min-w-0'>
                    <h4 className='font-bold text-sm text-foreground truncate' title={chan.channelTitle}>
                      {chan.channelTitle}
                    </h4>
                    <p className='text-xs font-mono text-muted-foreground truncate'>ID: {chan.channelId}</p>
                    <p className='text-[11px] text-muted-foreground mt-0.5'>
                      Kết nối: {new Date(chan.connectedAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>

                {/* Status indicator & Actions */}
                <div className='flex items-center justify-between border-t pt-2.5 text-xs'>
                  <div>
                    {checkRes ? (
                      checkRes.isWorking ? (
                        <Badge variant='outline' className='bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]'>
                          <ShieldCheck className='h-3 w-3 mr-1' /> Token Tốt
                        </Badge>
                      ) : (
                        <Badge variant='outline' className='bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 text-[10px]'>
                          <ShieldAlert className='h-3 w-3 mr-1' /> Token Lỗi
                        </Badge>
                      )
                    ) : (
                      <Badge variant='outline' className='bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30 text-[10px]'>
                        <UserCheck className='h-3 w-3 mr-1' /> Sẵn sàng
                      </Badge>
                    )}
                  </div>

                  <div className='flex items-center gap-1'>
                    <Button
                      size='sm'
                      variant='ghost'
                      onClick={() => handleCheckToken(chan.channelId)}
                      disabled={isChecking}
                      className='h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground'
                      title='Kiểm tra trạng thái token Google'
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${isChecking ? 'animate-spin' : ''}`} />
                      Check
                    </Button>

                    <Button
                      size='sm'
                      variant='ghost'
                      onClick={() => setDeleteConfirmTarget(chan)}
                      disabled={disconnecting === chan.channelId}
                      className='h-7 px-2 text-[11px] text-red-500 hover:bg-red-500/10'
                      title='Hủy kết nối kênh này'
                    >
                      {disconnecting === chan.channelId ? (
                        <RefreshCw className='h-3 w-3 animate-spin' />
                      ) : (
                        <Trash2 className='h-3 w-3 mr-1' />
                      )}
                      Hủy
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Modal Dialog */}
      <Dialog
        open={!!deleteConfirmTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmTarget(null)
        }}
      >
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-red-600 dark:text-red-400'>
              <AlertTriangle className='h-5 w-5 text-red-600' />
              Xác nhận hủy kết nối kênh
            </DialogTitle>
            <DialogDescription className='text-xs pt-1'>
              Bạn có chắc chắn muốn hủy kết nối kênh{' '}
              <strong className='text-foreground'>{deleteConfirmTarget?.channelTitle}</strong> (ID:{' '}
              <code className='font-mono text-xs'>{deleteConfirmTarget?.channelId}</code>) không?
            </DialogDescription>
          </DialogHeader>

          <div className='p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-600 dark:text-red-400'>
            Lưu ý: Thao tác này sẽ xóa thông tin liên kết kênh khỏi hệ thống. Bạn cần thực hiện kết nối lại qua Google OAuth2 nếu muốn tiếp tục công chiếu video.
          </div>

          <DialogFooter className='gap-2 sm:gap-0 mt-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => setDeleteConfirmTarget(null)}
              disabled={!!disconnecting}
              className='text-xs'
            >
              Hủy bỏ
            </Button>
            <Button
              type='button'
              variant='destructive'
              size='sm'
              onClick={executeDisconnect}
              disabled={!!disconnecting}
              className='text-xs font-semibold bg-red-600 hover:bg-red-700 text-white gap-1.5'
            >
              {disconnecting ? (
                <>
                  <RefreshCw className='h-3.5 w-3.5 animate-spin' />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Trash2 className='h-3.5 w-3.5' />
                  Xác nhận xóa
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
