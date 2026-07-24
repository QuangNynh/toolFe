import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  pinterestService,
  type SchedulePinPayload,
  type ScheduledJobItem,
  type PinterestAccountItem
} from '@/services/pinterest.service'
import { PinterestAccountsManager } from './PinterestAccountsManager'
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Play,
  RefreshCw,
  FolderCheck,
  CheckCircle2,
  XCircle,
  Sparkles,
  Link as LinkIcon,
  Image as ImageIcon,
  Layers,
  FileText,
  UserCheck,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

export interface BulkPinItem {
  id: string
  username?: string
  boardId: string
  title: string
  description: string
  imageUrl: string
  scheduleTime: string
  link: string
  altText: string
  status: 'idle' | 'scheduling' | 'success' | 'failed'
  jobName?: string
  error?: string
}

interface PinterestBulkScheduleProps {
  initialPins?: Partial<BulkPinItem>[]
}

export const PinterestBulkSchedule = ({ initialPins }: PinterestBulkScheduleProps) => {
  // Connected Accounts State
  const [accounts, setAccounts] = useState<PinterestAccountItem[]>([])
  const [selectedChannel, setSelectedChannel] = useState<string>(() => localStorage.getItem('pinterest_selected_channel') || '')
  
  // Settings State
  const [defaultBoardId, setDefaultBoardId] = useState<string>(() => localStorage.getItem('pinterest_default_board') || '')
  
  // Bulk Scheduling Time Generator state
  const defaultStartTime = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 16) // 10 mins in future (YYYY-MM-DDTHH:mm)
  const [startTime, setStartTime] = useState<string>(defaultStartTime)
  const [intervalMinutes, setIntervalMinutes] = useState<number>(30)

  // Pin List
  const [pins, setPins] = useState<BulkPinItem[]>([
    {
      id: 'pin-1',
      username: '',
      boardId: defaultBoardId || '1234567890123456789',
      title: 'Ý tưởng trang trí phòng khách đẹp 2026',
      description: 'Gợi ý thiết kế nội thất phòng khách hiện đại, tinh tế và ấm cúng cho ngôi nhà của bạn.',
      imageUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&q=80',
      scheduleTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      link: 'https://example.com/interior-decor',
      altText: 'Phòng khách phong cách hiện đại với ghế sofa kem',
      status: 'idle'
    },
    {
      id: 'pin-2',
      username: '',
      boardId: defaultBoardId || '1234567890123456789',
      title: 'Mẫu bàn làm việc tối giản cho Minimalist',
      description: 'Tổng hợp góc làm việc setup gọn gàng, tăng cảm hứng sáng tạo mỗi ngày.',
      imageUrl: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&q=80',
      scheduleTime: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      link: 'https://example.com/desk-setup',
      altText: 'Bàn làm việc gỗ phong cách tối giản',
      status: 'idle'
    }
  ])

  // Active Backend Jobs
  const [activeJobs, setActiveJobs] = useState<ScheduledJobItem[]>([])
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [cancellingJob, setCancellingJob] = useState<string | null>(null)

  // Scheduling Progress
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)

  // Quick Add Item Form
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newImageUrl, setNewImageUrl] = useState('')
  const [newLink, setNewLink] = useState('')
  const [newAltText, setNewAltText] = useState('')
  const [batchText, setBatchText] = useState('')
  const [showBatchModal, setShowBatchModal] = useState(false)

  // Fetch accounts list from API #3
  const fetchAccounts = async () => {
    try {
      const res = await pinterestService.getConnectedAccounts()
      if (res.success) {
        const chans = res.channels || []
        setAccounts(chans)
        if (chans.length > 0 && !selectedChannel) {
          setSelectedChannel(chans[0].username)
        }
      }
    } catch (err: any) {
      toast.error('Lỗi khi lấy danh sách kênh đã kết nối')
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  // Save selected channel & board to local storage
  useEffect(() => {
    if (selectedChannel) localStorage.setItem('pinterest_selected_channel', selectedChannel)
  }, [selectedChannel])

  useEffect(() => {
    if (defaultBoardId) localStorage.setItem('pinterest_default_board', defaultBoardId)
  }, [defaultBoardId])

  // Load initial pins if provided from scan tab
  useEffect(() => {
    if (initialPins && initialPins.length > 0) {
      const formatted: BulkPinItem[] = initialPins.map((item, idx) => ({
        id: `scanned-${Date.now()}-${idx}`,
        username: item.username || selectedChannel || '',
        boardId: item.boardId || defaultBoardId || '',
        title: item.title || `Pin #${idx + 1}`,
        description: item.description || '',
        imageUrl: item.imageUrl || '',
        scheduleTime: new Date(Date.now() + (idx + 1) * intervalMinutes * 60 * 1000).toISOString(),
        link: item.link || '',
        altText: item.altText || item.title || '',
        status: 'idle'
      }))
      setPins((prev) => [...formatted, ...prev])
      toast.success(`Đã thêm ${initialPins.length} pin từ kết quả quét!`)
    }
  }, [initialPins])

  // Fetch active jobs from API #7
  const fetchActiveJobs = async () => {
    setLoadingJobs(true)
    try {
      const res = await pinterestService.getScheduledJobs()
      if (res.success) {
        setActiveJobs(res.jobs || [])
      } else {
        toast.error(res.message || 'Không thể lấy danh sách job hẹn giờ')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi kết nối khi lấy danh sách job')
    } finally {
      setLoadingJobs(false)
    }
  }

  useEffect(() => {
    fetchActiveJobs()
  }, [])

  // Cancel Job via API #8
  const handleCancelJob = async (jobName: string) => {
    setCancellingJob(jobName)
    try {
      const res = await pinterestService.cancelScheduledJob(jobName)
      if (res.success) {
        toast.success(`Đã huỷ thành công job: ${jobName}`)
        fetchActiveJobs()
      } else {
        toast.error(res.message || 'Huỷ job không thành công')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi khi gọi API huỷ job')
    } finally {
      setCancellingJob(null)
    }
  }

  // Auto calculate & update schedule times based on start time & interval
  const handleAutoDistributeTime = () => {
    if (!startTime) {
      toast.error('Vui lòng chọn thời gian bắt đầu')
      return
    }

    const startMs = new Date(startTime).getTime()
    if (isNaN(startMs)) {
      toast.error('Thời gian bắt đầu không hợp lệ')
      return
    }

    if (startMs < Date.now() + 50 * 1000) {
      toast.error('Thời gian bắt đầu phải lớn hơn thời điểm hiện tại ít nhất 60 giây!')
      return
    }

    const updated = pins.map((pin, idx) => {
      const pinTime = new Date(startMs + idx * intervalMinutes * 60 * 1000).toISOString()
      return { ...pin, scheduleTime: pinTime }
    })

    setPins(updated)
    toast.success(`Đã tự động phân bổ thời gian cho ${pins.length} pin (giãn cách ${intervalMinutes} phút)`)
  }

  // Add Single Pin
  const handleAddPin = () => {
    if (!newImageUrl.trim()) {
      toast.error('URL hình ảnh không được để trống')
      return
    }

    const nextIndex = pins.length
    const startMs = startTime ? new Date(startTime).getTime() : Date.now() + 10 * 60 * 1000
    const calculatedTime = new Date(startMs + nextIndex * intervalMinutes * 60 * 1000).toISOString()

    const newPinItem: BulkPinItem = {
      id: `pin-${Date.now()}`,
      username: selectedChannel || '',
      boardId: defaultBoardId || '',
      title: newTitle.trim() || `Pin mới #${nextIndex + 1}`,
      description: newDescription.trim() || '',
      imageUrl: newImageUrl.trim(),
      scheduleTime: calculatedTime,
      link: newLink.trim(),
      altText: newAltText.trim(),
      status: 'idle'
    }

    setPins([newPinItem, ...pins])
    setNewTitle('')
    setNewDescription('')
    setNewImageUrl('')
    setNewLink('')
    setNewAltText('')
    toast.success('Đã thêm pin vào danh sách chờ hẹn giờ')
  }

  // Import batch text (URL line by line or ImageUrl|Title|Description|Link)
  const handleImportBatchText = () => {
    if (!batchText.trim()) {
      toast.error('Vui lòng nhập nội dung dữ liệu hàng loạt')
      return
    }

    const lines = batchText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
    const startMs = startTime ? new Date(startTime).getTime() : Date.now() + 10 * 60 * 1000

    const newItems: BulkPinItem[] = lines.map((line, idx) => {
      const parts = line.split('|').map((p) => p.trim())
      const imgUrl = parts[0] || ''
      const title = parts[1] || `Pin hàng loạt #${idx + 1}`
      const desc = parts[2] || ''
      const link = parts[3] || ''
      const board = parts[4] || defaultBoardId || ''

      const pinTime = new Date(startMs + (pins.length + idx) * intervalMinutes * 60 * 1000).toISOString()

      return {
        id: `batch-${Date.now()}-${idx}`,
        username: selectedChannel || '',
        boardId: board,
        title,
        description: desc,
        imageUrl: imgUrl,
        scheduleTime: pinTime,
        link,
        altText: title,
        status: 'idle'
      }
    })

    setPins([...newItems, ...pins])
    setBatchText('')
    setShowBatchModal(false)
    toast.success(`Đã thêm ${newItems.length} pin từ văn bản nhập hàng loạt!`)
  }

  // Update a pin item in state
  const handleUpdatePin = (id: string, field: keyof BulkPinItem, value: any) => {
    setPins((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  // Remove a pin from local queue
  const handleRemovePin = (id: string) => {
    setPins((prev) => prev.filter((p) => p.id !== id))
    toast.info('Đã xoá pin khỏi danh sách')
  }

  // Clear all idle pins
  const handleClearAllPins = () => {
    setPins([])
    toast.info('Đã xoá toàn bộ danh sách pin')
  }

  // Execute Single Schedule
  const handleScheduleSingle = async (pinItem: BulkPinItem) => {
    const targetUsername = pinItem.username || selectedChannel
    if (!targetUsername) {
      toast.error('Vui lòng chọn Kênh Pinterest đã kết nối!')
      return
    }

    if (!pinItem.boardId.trim()) {
      toast.error(`Pin "${pinItem.title}" chưa có Board ID!`)
      return
    }

    if (!pinItem.title.trim()) {
      toast.error('Tiêu đề pin không được để trống!')
      return
    }

    if (!pinItem.imageUrl.trim()) {
      toast.error('URL hình ảnh không được để trống!')
      return
    }

    // Check time >= 60s in future
    const schedMs = new Date(pinItem.scheduleTime).getTime()
    if (isNaN(schedMs) || schedMs < Date.now() + 55 * 1000) {
      toast.error(`Thời gian hẹn cho pin "${pinItem.title}" phải >= 60 giây trong tương lai!`)
      return
    }

    handleUpdatePin(pinItem.id, 'status', 'scheduling')

    try {
      const payload: SchedulePinPayload = {
        username: targetUsername,
        boardId: pinItem.boardId.trim(),
        title: pinItem.title.trim(),
        description: pinItem.description.trim(),
        imageUrl: pinItem.imageUrl.trim(),
        scheduleTime: new Date(pinItem.scheduleTime).toISOString(),
        link: pinItem.link.trim() || undefined,
        altText: pinItem.altText.trim() || undefined
      }

      const res = await pinterestService.schedulePin(payload)

      if (res.success) {
        handleUpdatePin(pinItem.id, 'status', 'success')
        handleUpdatePin(pinItem.id, 'jobName', res.jobName)
        toast.success(`Đã lên lịch thành công cho pin: ${res.title}`)
        fetchActiveJobs()
      } else {
        handleUpdatePin(pinItem.id, 'status', 'failed')
        handleUpdatePin(pinItem.id, 'error', res.message || res.error || 'Lỗi không xác định')
        toast.error(res.message || 'Lỗi khi hẹn giờ pin')
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message
        ? Array.isArray(err.response.data.message)
          ? err.response.data.message.join(', ')
          : err.response.data.message
        : err.message || 'Lỗi hệ thống'
      handleUpdatePin(pinItem.id, 'status', 'failed')
      handleUpdatePin(pinItem.id, 'error', msg)
      toast.error(`Lỗi: ${msg}`)
    }
  }

  // Process Batch Bulk Schedule (API #6 sequentially)
  const handleRunBulkSchedule = async () => {
    if (!selectedChannel && accounts.length === 0) {
      toast.error('Vui lòng kết nối tài khoản Pinterest trước khi lên lịch!')
      return
    }

    const pendingPins = pins.filter((p) => p.status === 'idle' || p.status === 'failed')
    if (pendingPins.length === 0) {
      toast.info('Không có pin nào đang chờ lên lịch')
      return
    }

    setIsProcessing(true)
    setProgress(0)
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < pendingPins.length; i++) {
      const pinItem = pendingPins[i]
      const targetUsername = pinItem.username || selectedChannel

      // Validate single item
      if (!targetUsername || !pinItem.boardId.trim() || !pinItem.title.trim() || !pinItem.imageUrl.trim()) {
        handleUpdatePin(pinItem.id, 'status', 'failed')
        handleUpdatePin(pinItem.id, 'error', 'Thiếu thông tin bắt buộc (Username, BoardId, Title, ImageUrl)')
        failCount++
        setProgress(Math.round(((i + 1) / pendingPins.length) * 100))
        continue
      }

      const schedMs = new Date(pinItem.scheduleTime).getTime()
      if (isNaN(schedMs) || schedMs < Date.now() + 55 * 1000) {
        handleUpdatePin(pinItem.id, 'status', 'failed')
        handleUpdatePin(pinItem.id, 'error', 'Thời gian hẹn phải >= 60s trong tương lai')
        failCount++
        setProgress(Math.round(((i + 1) / pendingPins.length) * 100))
        continue
      }

      handleUpdatePin(pinItem.id, 'status', 'scheduling')

      try {
        const payload: SchedulePinPayload = {
          username: targetUsername,
          boardId: pinItem.boardId.trim(),
          title: pinItem.title.trim(),
          description: pinItem.description.trim(),
          imageUrl: pinItem.imageUrl.trim(),
          scheduleTime: new Date(pinItem.scheduleTime).toISOString(),
          link: pinItem.link.trim() || undefined,
          altText: pinItem.altText.trim() || undefined
        }

        const res = await pinterestService.schedulePin(payload)

        if (res.success) {
          handleUpdatePin(pinItem.id, 'status', 'success')
          handleUpdatePin(pinItem.id, 'jobName', res.jobName)
          successCount++
        } else {
          handleUpdatePin(pinItem.id, 'status', 'failed')
          handleUpdatePin(pinItem.id, 'error', res.message || res.error || 'Lỗi API')
          failCount++
        }
      } catch (err: any) {
        const msg = err?.response?.data?.message
          ? Array.isArray(err.response.data.message)
            ? err.response.data.message.join(', ')
            : err.response.data.message
          : err.message || 'Lỗi hệ thống'
        handleUpdatePin(pinItem.id, 'status', 'failed')
        handleUpdatePin(pinItem.id, 'error', msg)
        failCount++
      }

      setProgress(Math.round(((i + 1) / pendingPins.length) * 100))
      // Small pause between API requests
      await new Promise((r) => setTimeout(r, 400))
    }

    setIsProcessing(false)
    fetchActiveJobs()
    toast.success(`Hoàn tất tiến trình lên lịch! ${successCount} thành công, ${failCount} thất bại.`)
  }

  return (
    <div className='space-y-6'>
      {/* Connected Accounts Popup & Manager Section */}
      <PinterestAccountsManager onAccountChange={fetchAccounts} />

      {/* 1. Target Channel Select & Configuration Panel */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Select Channel Card */}
        <Card className='p-5 shadow-md border-red-500/20 bg-card/70 backdrop-blur-sm lg:col-span-2 space-y-4'>
          <div className='flex items-center justify-between border-b pb-3'>
            <div className='flex items-center gap-2'>
              <UserCheck className='h-5 w-5 text-red-500' />
              <h3 className='font-semibold text-lg text-foreground'>Chọn Kênh Pinterest để đăng bài</h3>
            </div>
            <Badge variant='outline' className='text-xs border-red-500/30 text-red-500 bg-red-500/10'>
              Pinterest v5 API Auth
            </Badge>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <label className='text-xs font-semibold text-muted-foreground flex items-center gap-1'>
                Kênh đăng bài mặc định (*)
              </label>

              {accounts.length === 0 ? (
                <div className='p-2 rounded border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2'>
                  <AlertCircle className='h-4 w-4 shrink-0' />
                  <span>Chưa có kênh nào. Hãy kết nối kênh ở trên!</span>
                </div>
              ) : (
                <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                  <SelectTrigger className='h-10 text-xs border-muted-foreground/30 focus:ring-red-500'>
                    <SelectValue placeholder='-- Chọn Kênh Pinterest --' />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.username} value={acc.username} className='text-xs'>
                        <div className='flex items-center gap-2'>
                          <span className='font-semibold'>{acc.fullName || acc.username}</span>
                          <span className='text-red-500 font-mono text-[11px]'>(@{acc.username})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className='text-[11px] text-muted-foreground'>
                Hệ thống sẽ tự động dùng và Refresh token truy cập của kênh được chọn.
              </p>
            </div>

            <div className='space-y-1.5'>
              <label className='text-xs font-semibold text-muted-foreground flex items-center gap-1'>
                <FolderCheck className='h-3.5 w-3.5 text-red-500' /> Board ID mặc định
              </label>
              <Input
                type='text'
                placeholder='Ví dụ: 1234567890123456789'
                value={defaultBoardId}
                onChange={(e) => setDefaultBoardId(e.target.value)}
                className='h-10 text-xs border-muted-foreground/30 focus-visible:ring-red-500 font-mono'
              />
              <p className='text-[11px] text-muted-foreground'>
                Chuỗi số ID của Board Pinterest mục tiêu.
              </p>
            </div>
          </div>
        </Card>

        {/* Bulk Scheduling Time Calculator Card */}
        <Card className='p-5 shadow-md border-rose-500/20 bg-card/70 backdrop-blur-sm space-y-3 flex flex-col justify-between'>
          <div>
            <div className='flex items-center gap-2 border-b pb-3 mb-3'>
              <Calendar className='h-5 w-5 text-rose-500' />
              <h3 className='font-semibold text-base text-foreground'>Tự động phân bổ lịch đăng</h3>
            </div>

            <div className='space-y-3'>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='text-xs font-medium text-muted-foreground block mb-1'>Thời gian bắt đầu</label>
                  <Input
                    type='datetime-local'
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className='text-xs h-9'
                  />
                </div>
                <div>
                  <label className='text-xs font-medium text-muted-foreground block mb-1'>Khoảng cách đăng</label>
                  <Select
                    value={String(intervalMinutes)}
                    onValueChange={(val) => setIntervalMinutes(Number(val))}
                  >
                    <SelectTrigger className='h-9 text-xs'>
                      <SelectValue placeholder='Chọn khoảng cách' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='5'>Mỗi 5 phút</SelectItem>
                      <SelectItem value='15'>Mỗi 15 phút</SelectItem>
                      <SelectItem value='30'>Mỗi 30 phút</SelectItem>
                      <SelectItem value='60'>Mỗi 1 giờ</SelectItem>
                      <SelectItem value='120'>Mỗi 2 giờ</SelectItem>
                      <SelectItem value='1440'>Mỗi 24 giờ (1 ngày)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={handleAutoDistributeTime}
            variant='outline'
            className='w-full border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 h-9 text-xs font-medium flex items-center justify-center gap-1.5'
          >
            <Sparkles className='h-4 w-4 text-rose-500' />
            Áp dụng phân bổ giờ cho {pins.length} pin
          </Button>
        </Card>
      </div>

      {/* 2. Add New Pin Controls */}
      <Card className='p-5 shadow-md border-muted/50 bg-card/60 backdrop-blur-sm space-y-4'>
        <div className='flex items-center justify-between'>
          <h3 className='font-semibold text-base flex items-center gap-2'>
            <Plus className='h-5 w-5 text-red-500' />
            Thêm Pin mới vào hàng chờ
          </h3>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setShowBatchModal(!showBatchModal)}
              className='text-xs flex items-center gap-1.5 border-dashed border-red-500/40 text-red-500 hover:bg-red-500/10'
            >
              <FileText className='h-3.5 w-3.5' />
              {showBatchModal ? 'Đóng nhập nhanh' : 'Nhập hàng loạt bằng văn bản'}
            </Button>
          </div>
        </div>

        {/* Batch Text Input Box */}
        {showBatchModal && (
          <div className='p-4 border border-dashed border-red-500/40 rounded-lg bg-red-500/5 space-y-3 animate-in fade-in duration-200'>
            <label className='text-xs font-medium text-foreground block'>
              Dán dữ liệu hàng loạt (Mỗi dòng 1 pin theo định dạng: <code className='text-red-500'>ImageUrl | Title | Description | Link | BoardId</code>):
            </label>
            <Textarea
              rows={4}
              placeholder={`https://example.com/image1.jpg | Ghim phòng khách | Thiết kế nội thất đẹp | https://myblog.com/living | 12345\nhttps://example.com/image2.jpg | Ghim phòng ngủ | Mẫu phòng ngủ sang trọng | https://myblog.com/bedroom | 12345`}
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              className='text-xs font-mono bg-background'
            />
            <div className='flex justify-end gap-2'>
              <Button size='sm' variant='ghost' onClick={() => setShowBatchModal(false)} className='text-xs'>
                Huỷ
              </Button>
              <Button size='sm' onClick={handleImportBatchText} className='text-xs bg-red-600 hover:bg-red-700 text-white'>
                Tải vào danh sách
              </Button>
            </div>
          </div>
        )}

        {/* Single Form Controls */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
          <div className='space-y-1'>
            <label className='text-xs font-medium text-muted-foreground'>URL Ảnh công khai (*)</label>
            <Input
              placeholder='https://.../image.jpg'
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              className='h-9 text-xs'
            />
          </div>

          <div className='space-y-1'>
            <label className='text-xs font-medium text-muted-foreground'>Tiêu đề Pin (*)</label>
            <Input
              placeholder='Tiêu đề pin (tối đa 100 ký tự)'
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className='h-9 text-xs'
              maxLength={100}
            />
          </div>

          <div className='space-y-1'>
            <label className='text-xs font-medium text-muted-foreground'>Đường link đích (Link)</label>
            <Input
              placeholder='https://myblog.com/page'
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
              className='h-9 text-xs'
            />
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-3 items-end'>
          <div className='md:col-span-2 space-y-1'>
            <label className='text-xs font-medium text-muted-foreground'>Mô tả Pin (Description)</label>
            <Input
              placeholder='Mô tả ngắn gọn nội dung pin (tối đa 800 ký tự)'
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className='h-9 text-xs'
              maxLength={800}
            />
          </div>
          <Button
            onClick={handleAddPin}
            className='h-9 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-xs font-medium flex items-center gap-1.5'
          >
            <Plus className='h-4 w-4' /> Thêm vào hàng chờ
          </Button>
        </div>
      </Card>

      {/* 3. Main Pins Data Table & Execution */}
      <Card className='p-5 shadow-md border-muted/50 bg-card/60 backdrop-blur-sm space-y-4'>
        <div className='flex flex-wrap items-center justify-between gap-3 border-b pb-4'>
          <div>
            <h3 className='font-bold text-lg text-foreground flex items-center gap-2'>
              <Layers className='h-5 w-5 text-red-500' />
              Danh sách Pin chuẩn bị lên lịch ({pins.length})
            </h3>
            <p className='text-xs text-muted-foreground'>
              Xem lại, chọn kênh đăng bài và tiến hành gửi lệnh hẹn giờ lên server.
            </p>
          </div>

          <div className='flex items-center gap-2'>
            {pins.length > 0 && (
              <Button
                variant='outline'
                size='sm'
                onClick={handleClearAllPins}
                disabled={isProcessing}
                className='text-xs text-muted-foreground hover:text-red-500'
              >
                Xoá tất cả
              </Button>
            )}
            <Button
              onClick={handleRunBulkSchedule}
              disabled={isProcessing || pins.length === 0 || (!selectedChannel && accounts.length === 0)}
              className='bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-lg shadow-red-500/20 text-xs font-bold px-4 py-2 flex items-center gap-2'
            >
              {isProcessing ? (
                <>
                  <RefreshCw className='h-4 w-4 animate-spin' /> Đang xử lý... ({progress}%)
                </>
              ) : (
                <>
                  <Play className='h-4 w-4 fill-current' /> Bắt đầu lên lịch hàng loạt ({pins.filter(p => p.status !== 'success').length})
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Processing Progress bar */}
        {isProcessing && (
          <div className='space-y-1.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 animate-in fade-in'>
            <div className='flex justify-between text-xs font-semibold text-red-600 dark:text-red-400'>
              <span>Đang gửi request lên lịch đăng...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className='h-2 bg-red-500/20' />
          </div>
        )}

        {/* Pins Table */}
        <div className='rounded-md border overflow-x-auto'>
          <Table>
            <TableHeader className='bg-muted/40'>
              <TableRow>
                <TableHead className='w-12 text-center'>STT</TableHead>
                <TableHead className='w-20'>Ảnh xem trước</TableHead>
                <TableHead className='w-[140px]'>Kênh Pinterest</TableHead>
                <TableHead className='min-w-[200px]'>Tiêu đề & Mô tả</TableHead>
                <TableHead className='w-[140px]'>Board ID</TableHead>
                <TableHead className='w-[190px]'>Thời điểm đăng (ISO / UTC)</TableHead>
                <TableHead className='w-[130px] font-medium'>Trạng thái</TableHead>
                <TableHead className='w-[110px] text-right'>Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className='text-center py-10 text-muted-foreground text-sm'>
                    Chưa có Pin nào trong danh sách. Hãy thêm Pin mới ở biểu mẫu phía trên hoặc nhập hàng loạt.
                  </TableCell>
                </TableRow>
              ) : (
                pins.map((pin, idx) => (
                  <TableRow key={pin.id} className='hover:bg-muted/20 transition-colors'>
                    <TableCell className='text-center font-mono text-xs text-muted-foreground'>
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      <div className='relative w-14 h-14 rounded-md overflow-hidden bg-muted border border-muted-foreground/20 flex items-center justify-center group'>
                        {pin.imageUrl ? (
                          <img
                            src={pin.imageUrl}
                            alt={pin.title}
                            className='w-full h-full object-cover group-hover:scale-105 transition-transform'
                            onError={(e) => {
                              ;(e.target as HTMLElement).style.display = 'none'
                            }}
                          />
                        ) : (
                          <ImageIcon className='h-6 w-6 text-muted-foreground' />
                        )}
                        {pin.link && (
                          <a
                            href={pin.link}
                            target='_blank'
                            rel='noreferrer'
                            className='absolute bottom-0 right-0 p-1 bg-black/60 text-white rounded-tl-md hover:bg-black'
                            title='Mở link đính kèm'
                          >
                            <LinkIcon className='h-3 w-3' />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {accounts.length > 0 ? (
                        <Select
                          value={pin.username || selectedChannel}
                          onValueChange={(val) => handleUpdatePin(pin.id, 'username', val)}
                          disabled={isProcessing}
                        >
                          <SelectTrigger className='h-7 text-xs font-semibold border-muted-foreground/30'>
                            <SelectValue placeholder='Chọn kênh' />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((acc) => (
                              <SelectItem key={acc.username} value={acc.username} className='text-xs'>
                                @{acc.username}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className='text-[11px] text-amber-500 font-mono'>Chưa có kênh</span>
                      )}
                    </TableCell>
                    <TableCell className='space-y-1.5'>
                      <Input
                        value={pin.title}
                        onChange={(e) => handleUpdatePin(pin.id, 'title', e.target.value)}
                        placeholder='Tiêu đề pin'
                        className='h-7 text-xs font-semibold'
                        disabled={isProcessing}
                      />
                      <Textarea
                        value={pin.description}
                        onChange={(e) => handleUpdatePin(pin.id, 'description', e.target.value)}
                        placeholder='Mô tả pin'
                        className='text-[11px] min-h-[40px] py-1'
                        disabled={isProcessing}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={pin.boardId}
                        onChange={(e) => handleUpdatePin(pin.id, 'boardId', e.target.value)}
                        placeholder='Board ID'
                        className='h-7 text-xs font-mono'
                        disabled={isProcessing}
                      />
                    </TableCell>
                    <TableCell className='space-y-1'>
                      <Input
                        type='datetime-local'
                        value={
                          pin.scheduleTime
                            ? new Date(pin.scheduleTime).toISOString().slice(0, 16)
                            : ''
                        }
                        onChange={(e) => {
                          const val = e.target.value
                          if (val) {
                            handleUpdatePin(pin.id, 'scheduleTime', new Date(val).toISOString())
                          }
                        }}
                        className='h-7 text-xs font-mono'
                        disabled={isProcessing}
                      />
                      <div className='text-[10px] text-muted-foreground truncate max-w-[180px]' title={pin.scheduleTime}>
                        {new Date(pin.scheduleTime).toLocaleString('vi-VN')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {pin.status === 'idle' && (
                        <Badge variant='outline' className='text-[11px] bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30'>
                          <Clock className='h-3 w-3 mr-1' /> Chờ hẹn giờ
                        </Badge>
                      )}
                      {pin.status === 'scheduling' && (
                        <Badge variant='outline' className='text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse'>
                          <RefreshCw className='h-3 w-3 mr-1 animate-spin' /> Đang hẹn...
                        </Badge>
                      )}
                      {pin.status === 'success' && (
                        <div className='space-y-0.5'>
                          <Badge variant='outline' className='text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'>
                            <CheckCircle2 className='h-3 w-3 mr-1' /> Đã lên lịch
                          </Badge>
                          {pin.jobName && (
                            <p className='text-[10px] font-mono text-emerald-600/80 dark:text-emerald-400/80 truncate max-w-[120px]' title={pin.jobName}>
                              {pin.jobName}
                            </p>
                          )}
                        </div>
                      )}
                      {pin.status === 'failed' && (
                        <div className='space-y-0.5'>
                          <Badge variant='outline' className='text-[11px] bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'>
                            <XCircle className='h-3 w-3 mr-1' /> Lỗi
                          </Badge>
                          {pin.error && (
                            <p className='text-[10px] text-red-500 truncate max-w-[120px]' title={pin.error}>
                              {pin.error}
                            </p>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='flex items-center justify-end gap-1'>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => handleScheduleSingle(pin)}
                          disabled={isProcessing || pin.status === 'scheduling'}
                          className='h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10'
                          title='Lên lịch chỉ riêng pin này'
                        >
                          <Play className='h-3.5 w-3.5' />
                        </Button>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => handleRemovePin(pin.id)}
                          disabled={isProcessing}
                          className='h-7 w-7 p-0 text-red-500 hover:bg-red-500/10'
                          title='Xoá khỏi danh sách'
                        >
                          <Trash2 className='h-3.5 w-3.5' />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* 4. Active Backend Jobs Manager (API #7 & #8) */}
      <Card className='p-5 shadow-md border-muted/50 bg-card/60 backdrop-blur-sm space-y-4'>
        <div className='flex items-center justify-between border-b pb-3'>
          <div>
            <h3 className='font-bold text-base text-foreground flex items-center gap-2'>
              <Clock className='h-5 w-5 text-amber-500' />
              Danh sách Job đăng pin đang chờ trên Server (API #7)
            </h3>
            <p className='text-xs text-muted-foreground'>
              Các tác vụ CronJob đang chạy ngầm trong SchedulerRegistry của server.
            </p>
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={fetchActiveJobs}
            disabled={loadingJobs}
            className='text-xs flex items-center gap-1.5'
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingJobs ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>

        {activeJobs.length === 0 ? (
          <div className='text-center py-6 text-xs text-muted-foreground'>
            Hiện tại không có job hẹn giờ nào đang chờ trên server.
          </div>
        ) : (
          <div className='rounded-md border overflow-x-auto'>
            <Table>
              <TableHeader className='bg-muted/30'>
                <TableRow>
                  <TableHead className='w-12 text-center'>STT</TableHead>
                  <TableHead>Tên Job (Job Name)</TableHead>
                  <TableHead>Thời gian phát hỏa (Next Fire Time)</TableHead>
                  <TableHead className='w-[120px] text-right'>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeJobs.map((job, idx) => (
                  <TableRow key={job.jobName}>
                    <TableCell className='text-center font-mono text-xs text-muted-foreground'>
                      {idx + 1}
                    </TableCell>
                    <TableCell className='font-mono text-xs text-foreground font-medium'>
                      {job.jobName}
                    </TableCell>
                    <TableCell className='text-xs font-mono text-amber-600 dark:text-amber-400'>
                      {new Date(job.nextFireTime).toLocaleString('vi-VN')}
                    </TableCell>
                    <TableCell className='text-right'>
                      <Button
                        size='sm'
                        variant='destructive'
                        onClick={() => handleCancelJob(job.jobName)}
                        disabled={cancellingJob === job.jobName}
                        className='h-7 text-xs px-2 flex items-center gap-1 ml-auto'
                      >
                        {cancellingJob === job.jobName ? (
                          <RefreshCw className='h-3 w-3 animate-spin' />
                        ) : (
                          <XCircle className='h-3 w-3' />
                        )}
                        Huỷ Job
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  )
}
