import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  pinterestService,
  type PinterestAccountItem,
  type CheckTokenResponse
} from '@/services/pinterest.service'
import {
  Plus,
  RefreshCw,
  Trash2,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'

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

interface PinterestAccountsManagerProps {
  onAccountChange?: () => void
}

export const PinterestAccountsManager = ({ onAccountChange }: PinterestAccountsManagerProps) => {
  const [accounts, setAccounts] = useState<PinterestAccountItem[]>([])
  const [loading, setLoading] = useState(false)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<PinterestAccountItem | null>(null)

  // Auth Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [authUrl, setAuthUrl] = useState('')
  const [gettingUrl, setGettingUrl] = useState(false)
  const [authCode, setAuthCode] = useState('')
  const [submittingCode, setSubmittingCode] = useState(false)

  // Token health check states
  const [tokenStatus, setTokenStatus] = useState<Record<string, CheckTokenResponse | { loading: boolean }>>({})

  // Fetch accounts list from GET /api/v1/pinterest/accounts
  const fetchAccounts = async () => {
    setLoading(true)
    try {
      const res = await pinterestService.getConnectedAccounts()
      if (res.success) {
        setAccounts(res.channels || [])
        if (onAccountChange) onAccountChange()
      } else {
        toast.error(res.message || 'Không thể lấy danh sách kênh đã kết nối')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi khi tải danh sách kênh Pinterest')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  // Handle open connect OAuth dialog
  const handleOpenConnectDialog = async () => {
    setIsDialogOpen(true)
    setGettingUrl(true)
    setAuthCode('')
    try {
      const res = await pinterestService.getAuthUrl()
      if (res.success && res.url) {
        setAuthUrl(res.url)
      } else {
        toast.error('Không lấy được OAuth URL từ server')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi khi gọi API lấy OAuth URL')
    } finally {
      setGettingUrl(false)
    }
  }

  // Handle opening OAuth window
  const handleOpenOAuthWindow = () => {
    if (!authUrl) return
    window.open(authUrl, 'PinterestOAuth', 'width=600,height=700,status=yes,toolbar=no,menubar=no')
  }

  // Handle submit authorization code
  const handleSubmitCode = async () => {
    if (!authCode.trim()) {
      toast.error('Vui lòng nhập Authorization Code!')
      return
    }

    setSubmittingCode(true)
    try {
      const res = await pinterestService.submitAuthCallback(authCode.trim())
      if (res.success) {
        toast.success(res.message || 'Kết nối tài khoản Pinterest thành công!')
        setIsDialogOpen(false)
        setAuthCode('')
        fetchAccounts()
      } else {
        toast.error(res.error || res.message || 'Kết nối không thành công')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi khi xác thực Authorization Code')
    } finally {
      setSubmittingCode(false)
    }
  }

  // Handle disconnect account
  const executeDisconnect = async () => {
    if (!deleteConfirmTarget) return
    const username = deleteConfirmTarget.username

    setDisconnecting(username)
    try {
      const res = await pinterestService.disconnectAccount(username)
      if (res.success) {
        toast.success(`Đã hủy kết nối kênh @${username}`)
        setDeleteConfirmTarget(null)
        fetchAccounts()
      } else {
        toast.error(res.message || 'Hủy kết nối thất bại')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi khi hủy kết nối kênh')
    } finally {
      setDisconnecting(null)
    }
  }

  // Handle manual token health check
  const handleCheckToken = async (username: string) => {
    setTokenStatus((prev) => ({ ...prev, [username]: { loading: true } }))
    try {
      const res = await pinterestService.checkAccountToken(username)
      setTokenStatus((prev) => ({ ...prev, [username]: res }))
      if (res.isWorking) {
        toast.success(`Tài khoản @${username}: Token đang hoạt động tốt!`)
      } else {
        toast.warning(`Tài khoản @${username}: Token gặp sự cố (${res.errorMessage || 'Vui lòng kết nối lại'})`)
      }
    } catch (err: any) {
      toast.error(`Không thể kiểm tra token của @${username}`)
    }
  }

  return (
    <Card className='p-5 shadow-md border-muted/50 bg-card/60 backdrop-blur-sm space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3 border-b pb-4'>
        <div className='flex items-center gap-3'>
          <div className='p-2.5 bg-gradient-to-tr from-red-500 to-rose-600 rounded-lg text-white shadow-md'>
            <PinterestIcon className='h-5 w-5' />
          </div>
          <div>
            <h3 className='font-bold text-lg text-foreground flex items-center gap-2'>
              Tài khoản Pinterest đã kết nối ({accounts.length})
            </h3>
            <p className='text-xs text-muted-foreground'>
              Quản lý các tài khoản Pinterest OAuth2 chính chủ để hẹn giờ đăng pin tự động.
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={fetchAccounts}
            disabled={loading}
            className='text-xs flex items-center gap-1.5'
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={handleOpenConnectDialog}
                className='bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md text-xs font-semibold px-3 py-1.5 flex items-center gap-1.5'
              >
                <Plus className='h-4 w-4' /> Kết nối kênh mới
              </Button>
            </DialogTrigger>

            <DialogContent className='sm:max-w-[500px]'>
              <DialogHeader>
                <DialogTitle className='flex items-center gap-2 text-red-600 dark:text-red-400'>
                  <PinterestIcon className='h-5 w-5' /> Kết nối Tài khoản Pinterest OAuth2
                </DialogTitle>
                <DialogDescription className='text-xs'>
                  Ủy quyền đăng Pin tự động thông qua Pinterest OAuth2 API chính thức.
                </DialogDescription>
              </DialogHeader>

              <div className='space-y-4 py-2'>
                {/* Step 1: Open Pinterest Login */}
                <div className='p-4 rounded-lg bg-red-500/10 border border-red-500/20 space-y-2.5'>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs font-semibold text-foreground flex items-center gap-1.5'>
                      <span className='w-5 h-5 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center'>
                        1
                      </span>
                      Đăng nhập & Cấp quyền trên Pinterest
                    </span>
                  </div>
                  <p className='text-[11px] text-muted-foreground'>
                    Bấm vào nút dưới đây để mở trang chấp nhận ủy quyền Pinterest. Sau khi đồng ý, Pinterest sẽ trả về Authorization Code.
                  </p>
                  <Button
                    onClick={handleOpenOAuthWindow}
                    disabled={gettingUrl || !authUrl}
                    className='w-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold h-9 flex items-center justify-center gap-2'
                  >
                    {gettingUrl ? (
                      <RefreshCw className='h-4 w-4 animate-spin' />
                    ) : (
                      <>
                        <ExternalLink className='h-4 w-4' /> Mở trang đăng nhập Pinterest OAuth2
                      </>
                    )}
                  </Button>
                </div>

                {/* Step 2: Paste Authorization Code */}
                <div className='p-4 rounded-lg bg-muted/40 border space-y-2.5'>
                  <span className='text-xs font-semibold text-foreground flex items-center gap-1.5'>
                    <span className='w-5 h-5 rounded-full bg-slate-700 text-white text-[11px] font-bold flex items-center justify-center'>
                      2
                    </span>
                    Nhập Authorization Code (Nếu có)
                  </span>
                  <p className='text-[11px] text-muted-foreground'>
                    Nếu Pinterest chuyển hướng về kèm tham số <code className='text-red-500 font-mono'>?code=xxxx</code>, dán đoạn mã <code className='text-red-500 font-mono'>code</code> đó vào bên dưới:
                  </p>
                  <div className='space-y-2'>
                    <Input
                      placeholder='Dán authorization code tại đây (ví dụ: pina_...)'
                      value={authCode}
                      onChange={(e) => setAuthCode(e.target.value)}
                      className='text-xs font-mono'
                    />
                    <Button
                      onClick={handleSubmitCode}
                      disabled={submittingCode || !authCode.trim()}
                      className='w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 flex items-center justify-center gap-1.5'
                    >
                      {submittingCode ? (
                        <RefreshCw className='h-4 w-4 animate-spin' />
                      ) : (
                        <>
                          <CheckCircle2 className='h-4 w-4' /> Hoàn tất kết nối kênh
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Connected Channels List */}
      {accounts.length === 0 ? (
        <div className='text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg p-6 space-y-3 bg-muted/20'>
          <PinterestIcon className='h-10 w-10 mx-auto text-muted-foreground/50' />
          <p className='font-medium'>Chưa có tài khoản Pinterest nào được kết nối.</p>
          <p className='text-xs text-muted-foreground max-w-md mx-auto'>
            Bấm nút <strong>"Kết nối kênh mới"</strong> để đăng nhập OAuth2 và bắt đầu lên lịch đăng pin tự động.
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {accounts.map((acc) => {
            const checkRes = tokenStatus[acc.username] as CheckTokenResponse | undefined
            const isChecking = (tokenStatus[acc.username] as any)?.loading

            return (
              <div
                key={acc.username}
                className='p-4 rounded-xl border bg-card/80 hover:border-red-500/30 transition-all shadow-sm flex flex-col justify-between space-y-3'
              >
                <div className='flex items-start gap-3'>
                  {acc.avatarUrl ? (
                    <img
                      src={acc.avatarUrl}
                      alt={acc.fullName || acc.username}
                      className='w-12 h-12 rounded-full object-cover border border-red-500/20'
                    />
                  ) : (
                    <div className='w-12 h-12 rounded-full bg-gradient-to-tr from-red-500 to-rose-600 text-white flex items-center justify-center font-bold text-lg shadow-sm'>
                      {(acc.fullName || acc.username).charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className='flex-1 min-w-0'>
                    <h4 className='font-bold text-sm text-foreground truncate' title={acc.fullName || acc.username}>
                      {acc.fullName || acc.username}
                    </h4>
                    <p className='text-xs font-mono text-red-500 truncate'>@{acc.username}</p>
                    <p className='text-[11px] text-muted-foreground mt-0.5'>
                      Kết nối: {new Date(acc.connectedAt).toLocaleDateString('vi-VN')}
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
                        <UserCheck className='h-3 w-3 mr-1' /> Đã kết nối
                      </Badge>
                    )}
                  </div>

                  <div className='flex items-center gap-1'>
                    <Button
                      size='sm'
                      variant='ghost'
                      onClick={() => handleCheckToken(acc.username)}
                      disabled={isChecking}
                      className='h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground'
                      title='Kiểm tra trạng thái token'
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${isChecking ? 'animate-spin' : ''}`} />
                      Check
                    </Button>

                    <Button
                      size='sm'
                      variant='ghost'
                      onClick={() => setDeleteConfirmTarget(acc)}
                      disabled={disconnecting === acc.username}
                      className='h-7 px-2 text-[11px] text-red-500 hover:bg-red-500/10'
                      title='Hủy kết nối kênh này'
                    >
                      {disconnecting === acc.username ? (
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
              Bạn có chắc chắn muốn hủy kết nối tài khoản Pinterest{' '}
              <strong className='text-foreground'>@{deleteConfirmTarget?.username}</strong> (
              {deleteConfirmTarget?.fullName}) không?
            </DialogDescription>
          </DialogHeader>

          <div className='p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-600 dark:text-red-400'>
            Lưu ý: Thao tác này sẽ xóa thông tin liên kết kênh khỏi hệ thống. Bạn cần kết nối lại tài khoản Pinterest nếu muốn tiếp tục hẹn giờ đăng bài.
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
