import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  youtubeService,
  type ScheduleYouTubePayload,
  type UpdateMetadataYouTubePayload,
  type YouTubeChannelItem
} from '@/services/youtube.service'
import { YouTubeAccountsManager } from './YouTubeAccountsManager'
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Sparkles,
  Layers,
  Youtube,
  AlertCircle,
  Video,
  Upload,
  Image as ImageIcon,
  FolderOpen,
  Info,
  Filter
} from 'lucide-react'
import { toast } from 'sonner'

export interface BulkYouTubeVideoItem {
  id: string
  channelId?: string
  videoId: string
  title: string
  description: string
  tags: string[]
  publishTime: string
  existingPublishAt?: string
  status: 'idle' | 'scheduling' | 'success' | 'failed'
  metadataStatus?: 'idle' | 'updating' | 'success' | 'failed'
  privacyStatus?: string
  error?: string
  channelTitle?: string
  thumbnailUrl?: string
  thumbnailFile?: File
  thumbnailPreview?: string
  thumbnailFileName?: string
  thumbnailStatus?: 'idle' | 'updating' | 'success' | 'failed'
}

interface YouTubeScheduleProps {
  initialVideos?: Partial<BulkYouTubeVideoItem>[]
}

interface ParsedTxtTitle {
  stt: number
  title: string
}

interface ImageSTTItem {
  stt: number
  file: File
  fileName: string
  previewUrl: string
}

// Parse image files and match STT by filename digits (e.g. 1.png -> STT 1, 2.jpg -> STT 2)
const parseImagesAndMatchSTT = (files: FileList | File[]): ImageSTTItem[] => {
  const fileArray = Array.from(files).filter(
    (file) =>
      file.type.startsWith('image/') ||
      /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name)
  )

  const items: ImageSTTItem[] = fileArray.map((file, idx) => {
    const match = file.name.match(/(\d+)/)
    const stt = match ? parseInt(match[1], 10) : idx + 1
    return {
      stt,
      file,
      fileName: file.name,
      previewUrl: URL.createObjectURL(file)
    }
  })

  items.sort((a, b) => a.stt - b.stt)
  return items
}

// Parse titles from TXT content supporting formats like:
// 1.
// Title line...
// 2. Title line...
const parseTitlesFromTxt = (text: string): ParsedTxtTitle[] => {
  if (!text || !text.trim()) return []

  const result: ParsedTxtTitle[] = []

  // Match numbered block pattern: e.g. "1." or "1)" followed by text up to next number header or end of file
  const numberedBlockRegex = /(?:^|\n)\s*(\d+)[\.\)]\s*([\s\S]*?)(?=(?:\n\s*\d+[\.\)]|$))/g
  let match: RegExpExecArray | null

  while ((match = numberedBlockRegex.exec(text)) !== null) {
    const stt = parseInt(match[1], 10)
    let content = match[2].trim()
    content = content.replace(/\n+/g, ' ').trim()

    if (content) {
      result.push({ stt, title: content })
    }
  }

  // Fallback line-by-line if no numbered block headers matched
  if (result.length === 0) {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    lines.forEach((line, idx) => {
      const cleaned = line.replace(/^\d+[\.\)]\s*/, '').trim()
      if (cleaned) {
        result.push({ stt: idx + 1, title: cleaned })
      }
    })
  }

  result.sort((a, b) => a.stt - b.stt)
  return result
}

// Helper to extract YouTube Video ID from string or URL
const extractVideoId = (input: string): string => {
  const trimmed = input.trim()
  if (!trimmed) return ''
  // Try matching standard URL formats
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)
  return match ? match[1] : trimmed
}

export const YouTubeSchedule = ({ initialVideos }: YouTubeScheduleProps) => {
  const [searchParams, setSearchParams] = useSearchParams()

  // Connected Channels State
  const [channels, setChannels] = useState<YouTubeChannelItem[]>([])
  const [selectedChannelId, setSelectedChannelId] = useState<string>(() => localStorage.getItem('youtube_selected_channel') || '')

  // Schedule Distribution state
  const defaultStartDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10) // Tomorrow
  const [startDate, setStartDate] = useState<string>(defaultStartDate)
  const [timeSlots, setTimeSlots] = useState<string[]>(['18:00'])
  const [scheduleMode, setScheduleMode] = useState<'by_day' | 'by_slot'>('by_day')

  // Synthetic Media (AI) option: 'none' = không áp dụng, 'true' = Có, 'false' = Không
  const [syntheticMediaOption, setSyntheticMediaOption] = useState<'none' | 'true' | 'false'>('none')

  // Active Tab state: 'edit' (mặc định - Chỉnh sửa Tiêu đề & Thumbnail), 'schedule' (Lên lịch công chiếu)
  const [activeTab, setActiveTab] = useState<'edit' | 'schedule'>('edit')

  // Client-side status filter state: 'all' (mặc định - Tất cả), 'unscheduled' (Chưa lên lịch), 'scheduled' (Đang chờ công chiếu)
  const [statusFilter, setStatusFilter] = useState<'all' | 'unscheduled' | 'scheduled'>('all')

  // Time slot helper functions
  const handleAddTimeSlot = () => {
    const defaultNextTimes = ['08:00', '12:00', '16:00', '18:00', '20:00', '22:00']
    const existingSet = new Set(timeSlots)
    const available = defaultNextTimes.find((t) => !existingSet.has(t)) || '12:00'
    setTimeSlots((prev) => [...prev, available])
  }

  const handleRemoveTimeSlot = (index: number) => {
    if (timeSlots.length <= 1) {
      toast.error('Cần giữ lại ít nhất 1 khung giờ công chiếu!')
      return
    }
    setTimeSlots((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleUpdateTimeSlot = (index: number, value: string) => {
    setTimeSlots((prev) => prev.map((t, idx) => (idx === index ? value : t)))
  }

  // Video Queue List (Initial empty, fetched from real connected channel API #5.1)
  const [videos, setVideos] = useState<BulkYouTubeVideoItem[]>([])
  const [loadingChannelVideos, setLoadingChannelVideos] = useState(false)

  const filteredVideos = videos.filter((item) => {
    const isFuturePublish = Boolean(item.existingPublishAt && new Date(item.existingPublishAt).getTime() > Date.now())
    if (statusFilter === 'scheduled') return isFuturePublish
    if (statusFilter === 'unscheduled') return !isFuturePublish
    return true
  })

  // Progress state
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)

  // TXT Titles Import state
  const [txtContent, setTxtContent] = useState('')
  const txtFileInputRef = useRef<HTMLInputElement>(null)

  // Thumbnail Folder Upload state
  const [sttImageItems, setSttImageItems] = useState<ImageSTTItem[]>([])

  // State for updating metadata & thumbnail in Tab 2
  const [isSavingEditTab, setIsSavingEditTab] = useState(false)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const parsedTxtTitles = parseTitlesFromTxt(txtContent)

  // Handle image files / folder upload
  const handleImageFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const parsedImages = parseImagesAndMatchSTT(files)
    if (parsedImages.length === 0) {
      toast.error('Không tìm thấy file ảnh hợp lệ (PNG/JPG/WEBP)!')
      return
    }

    setSttImageItems(parsedImages)
    toast.success(`Đã nạp ${parsedImages.length} ảnh thumbnail từ folder/files!`)
    handleApplyThumbnailsToVideos(parsedImages)
    e.target.value = ''
  }

  // Apply thumbnails to video list by STT
  const handleApplyThumbnailsToVideos = (imagesList?: ImageSTTItem[]) => {
    const targetImages = imagesList || sttImageItems
    if (targetImages.length === 0) {
      toast.error('Chưa nạp ảnh thumbnail nào!')
      return
    }

    if (videos.length === 0) {
      toast.error('Danh sách video trống. Vui lòng chọn kênh hoặc thêm video trước!')
      return
    }

    const imageMap = new Map<number, ImageSTTItem>()
    targetImages.forEach((img) => imageMap.set(img.stt, img))

    let updatedCount = 0
    setVideos((prev) =>
      prev.map((vid, idx) => {
        const stt = idx + 1
        const matchedImage = imageMap.get(stt) || (targetImages[idx] ? targetImages[idx] : null)
        if (matchedImage) {
          updatedCount++
          return {
            ...vid,
            thumbnailFile: matchedImage.file,
            thumbnailPreview: matchedImage.previewUrl,
            thumbnailFileName: matchedImage.fileName
          }
        }
        return vid
      })
    )

    toast.success(`Đã gắn ảnh thumbnail thành công cho ${updatedCount} video theo đúng STT!`)
  }

  // Bulk update thumbnails to YouTube API (POST /api/v1/youtube/thumbnail)
  // Combined bulk update: Metadata & Thumbnail per video using Promise.all
  const handleBulkSaveEditTab = async () => {
    const targetChannelId = selectedChannelId || (videos.length > 0 ? videos[0].channelId : '')
    if (!targetChannelId) {
      toast.error('Vui lòng chọn Kênh YouTube trước!')
      return
    }

    const targetList = filteredVideos.filter((v) => v.videoId.trim())
    if (targetList.length === 0) {
      toast.error('Chưa có video nào với Video ID hợp lệ trong bộ lọc!')
      return
    }

    setIsSavingEditTab(true)
    let successCount = 0
    let failCount = 0

    for (const vid of targetList) {
      const promises: Promise<boolean>[] = []
      const chanId = vid.channelId || targetChannelId

      // 1. Metadata update promise (if title is present)
      if (vid.title.trim()) {
        handleUpdateVideo(vid.id, 'metadataStatus', 'updating')
        const metaPayload: UpdateMetadataYouTubePayload = {
          channelId: chanId,
          videoId: vid.videoId.trim(),
          title: vid.title.trim(),
          description: vid.description.trim(),
          tags: vid.tags && vid.tags.length > 0 ? vid.tags : undefined,
          ...(syntheticMediaOption !== 'none' && { containsSyntheticMedia: syntheticMediaOption === 'true' })
        }

        promises.push(
          youtubeService
            .updateMetadata(metaPayload)
            .then((res) => {
              if (res.success) {
                handleUpdateVideo(vid.id, 'metadataStatus', 'success')
                return true
              } else {
                handleUpdateVideo(vid.id, 'metadataStatus', 'failed')
                if (res.message || res.error) {
                  handleUpdateVideo(vid.id, 'error', res.message || res.error)
                }
                return false
              }
            })
            .catch(() => {
              handleUpdateVideo(vid.id, 'metadataStatus', 'failed')
              return false
            })
        )
      }

      // 2. Thumbnail upload promise (if thumbnailFile is present)
      if (vid.thumbnailFile) {
        handleUpdateVideo(vid.id, 'thumbnailStatus', 'updating')
        promises.push(
          youtubeService
            .updateThumbnail(chanId, vid.videoId.trim(), vid.thumbnailFile)
            .then((res) => {
              if (res.success) {
                handleUpdateVideo(vid.id, 'thumbnailStatus', 'success')
                return true
              } else {
                handleUpdateVideo(vid.id, 'thumbnailStatus', 'failed')
                if (res.message || res.error) {
                  handleUpdateVideo(vid.id, 'error', res.message || res.error)
                }
                return false
              }
            })
            .catch(() => {
              handleUpdateVideo(vid.id, 'thumbnailStatus', 'failed')
              return false
            })
        )
      }

      if (promises.length > 0) {
        const results = await Promise.all(promises)
        const allOk = results.every((r) => r === true)
        if (allOk) {
          successCount++
        } else {
          failCount++
        }
      }
    }

    setIsSavingEditTab(false)
    if (successCount > 0) {
      toast.success(`Đã cập nhật thành công Tiêu đề & Thumbnail cho ${successCount} video lên YouTube!`)
    }
    if (failCount > 0) {
      toast.error(`Có ${failCount} video gặp lỗi khi cập nhật.`)
    }
  }

  // Handle upload of .txt file
  const handleTxtFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      if (text) {
        setTxtContent(text)
        const parsed = parseTitlesFromTxt(text)
        toast.success(`Đã nạp file "${file.name}" - Tìm thấy ${parsed.length} tiêu đề theo STT!`)
      }
    }
    reader.onerror = () => {
      toast.error('Không thể đọc file .txt!')
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // Apply titles from TXT content to video list by STT
  const handleApplyTxtTitlesToVideos = () => {
    const parsed = parseTitlesFromTxt(txtContent)
    if (parsed.length === 0) {
      toast.error('Không tìm thấy tiêu đề hợp lệ trong dữ liệu TXT!')
      return
    }

    if (videos.length === 0) {
      toast.error('Danh sách video trống. Vui lòng chọn kênh hoặc thêm video trước!')
      return
    }

    const titleMap = new Map<number, string>()
    parsed.forEach((item) => titleMap.set(item.stt, item.title))

    let updatedCount = 0
    setVideos((prev) =>
      prev.map((vid, idx) => {
        const stt = idx + 1
        const newTitle = titleMap.get(stt) || (parsed[idx] ? parsed[idx].title : null)
        if (newTitle) {
          updatedCount++
          return { ...vid, title: newTitle }
        }
        return vid
      })
    )

    toast.success(`Đã thay thế tiêu đề thành công cho ${updatedCount} video theo đúng STT!`)
  }

  const hasInitialFetchedRef = useRef(false)
  const isFetchingVideosRef = useRef(false)

  // Handle tab change and re-fetch channel videos
  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue as 'edit' | 'schedule')
    const chId = selectedChannelId || (channels.length > 0 ? channels[0].channelId : '')
    if (chId) {
      handleFetchChannelVideos(chId)
    }
  }

  // Fetch real videos for selected channel (API #5.1: GET /api/v1/youtube/videos?channelId=xxx)
  const handleFetchChannelVideos = async (targetChannelId?: string) => {
    const chId = targetChannelId || selectedChannelId
    if (!chId) {
      toast.error('Vui lòng chọn Kênh YouTube trước!')
      return
    }

    if (isFetchingVideosRef.current) return
    isFetchingVideosRef.current = true
    setLoadingChannelVideos(true)

    try {
      const res = await youtubeService.getChannelVideos(chId, 100)
      if (res.success && res.videos) {
        const realItems: BulkYouTubeVideoItem[] = res.videos.map((v, idx) => {
          const rawPub = v.publishAt || v.raw?.status?.publishAt || v.raw?.detailedStatus?.publishAt || undefined
          return {
            id: `channel-vid-${v.id}-${idx}`,
            channelId: chId,
            videoId: v.id,
            title: v.title || `Video #${idx + 1}`,
            description: v.description || '',
            tags: [] as string[],
            publishTime: '',
            existingPublishAt: rawPub,
            thumbnailUrl: v.thumbnailUrl || (v.id ? `https://img.youtube.com/vi/${v.id}/hqdefault.jpg` : ''),
            status: 'idle' as const,
            privacyStatus: v.privacyStatus
          }
        }).reverse()

        setVideos(realItems)
        toast.success(`Đã tải ${realItems.length} video thực tế từ kênh thành công!`)
      } else {
        toast.error(res.message || 'Không thể lấy danh sách video của kênh')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi khi gọi API lấy danh sách video kênh')
    } finally {
      setLoadingChannelVideos(false)
      isFetchingVideosRef.current = false
    }
  }

  const hasFetchedChannelsRef = useRef(false)
  const [loadingChannels, setLoadingChannels] = useState(false)

  // Fetch connected channels ONCE on mount
  const fetchChannels = async () => {
    if (hasFetchedChannelsRef.current) return
    hasFetchedChannelsRef.current = true
    setLoadingChannels(true)

    try {
      const res = await youtubeService.getConnectedChannels()
      if (res.success) {
        const chans = res.channels || []
        setChannels(chans)
        const activeId = selectedChannelId || (chans.length > 0 ? chans[0].channelId : '')
        if (activeId) {
          if (!selectedChannelId) setSelectedChannelId(activeId)
          if (!hasInitialFetchedRef.current) {
            hasInitialFetchedRef.current = true
            handleFetchChannelVideos(activeId)
          }
        }
      }
    } catch (err: any) {
      toast.error('Lỗi khi lấy danh sách kênh YouTube đã kết nối')
    } finally {
      setLoadingChannels(false)
    }
  }

  const handleRefreshChannels = () => {
    hasFetchedChannelsRef.current = false
    fetchChannels()
  }

  useEffect(() => {
    fetchChannels()
  }, [])

  // Check for successful OAuth redirect parameters and show popup notification
  useEffect(() => {
    const connectedSuccess = searchParams.get('connected_success')
    const channelTitle = searchParams.get('channelTitle')

    if (connectedSuccess === '1') {
      toast.success(
        channelTitle
          ? `Kết nối thành công kênh YouTube: "${channelTitle}"!`
          : 'Kết nối kênh YouTube thành công!'
      )

      // Clean up connected_success parameters from URL while keeping tab=schedule
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('connected_success')
      newParams.delete('channelTitle')
      setSearchParams(newParams, { replace: true })

      handleRefreshChannels()
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (selectedChannelId) localStorage.setItem('youtube_selected_channel', selectedChannelId)
  }, [selectedChannelId])

  // Load initial videos if passed
  useEffect(() => {
    if (initialVideos && initialVideos.length > 0) {
      const formatted: BulkYouTubeVideoItem[] = initialVideos.map((item, idx) => ({
        id: `scanned-yt-${Date.now()}-${idx}`,
        channelId: item.channelId || selectedChannelId || '',
        videoId: extractVideoId(item.videoId || ''),
        title: item.title || `Video #${idx + 1}`,
        description: item.description || '',
        tags: item.tags || [],
        publishTime: '',
        status: 'idle'
      }))
      setVideos((prev) => [...formatted, ...prev])
      toast.success(`Đã thêm ${initialVideos.length} video vào hàng chờ!`)
    }
  }, [initialVideos])

  // Auto calculate publish times by Start Date, Time Slots & Distribution Mode
  const handleAutoDistributeTime = () => {
    if (!startDate) {
      toast.error('Vui lòng chọn Ngày bắt đầu công chiếu')
      return
    }

    if (timeSlots.length === 0) {
      toast.error('Vui lòng thêm ít nhất 1 khung giờ công chiếu trong ngày')
      return
    }

    const targetVideos = filteredVideos
    if (targetVideos.length === 0) {
      toast.error('Danh sách video hiển thị trống. Hãy chọn bộ lọc khác hoặc tải video từ kênh!')
      return
    }

    const slots = timeSlots
    const K = slots.length
    const total = targetVideos.length

    const [year, month, day] = startDate.split('-').map(Number)
    const targetIdMap = new Map<string, string>()

    if (scheduleMode === 'by_slot') {
      const X = total
      const Y = K
      const M = Math.ceil(X / Y)

      let N: number
      if (X < Y) {
        N = X
      } else if (X % Y === 0) {
        N = M
      } else {
        N = M + 1
      }
      if (Y > N) N = Y

      const videoMappings: { slotIdx: number; dayOffset: number }[] = []
      let remaining = X
      let counter = 0

      for (let slotIdx = 0; slotIdx < Y && remaining > 0; slotIdx++) {
        const countForThisSlot = Math.min(remaining, N)
        for (let dayOffset = 0; dayOffset < countForThisSlot; dayOffset++) {
          videoMappings[counter] = { slotIdx, dayOffset }
          counter++
        }
        remaining -= countForThisSlot
      }

      targetVideos.forEach((vid, idx) => {
        const mapping = videoMappings[idx] || { slotIdx: Y - 1, dayOffset: 0 }
        const slotTime = slots[mapping.slotIdx] || slots[0] || '18:00'
        const [hours, minutes] = slotTime.split(':').map(Number)

        const dateObj = new Date(year, month - 1, day + mapping.dayOffset, hours || 0, minutes || 0, 0, 0)
        targetIdMap.set(vid.id, dateObj.toISOString())
      })
    } else {
      targetVideos.forEach((vid, idx) => {
        const slotIdx = idx % K
        const dayOffset = Math.floor(idx / K)

        const slotTime = slots[slotIdx] || slots[0] || '18:00'
        const [hours, minutes] = slotTime.split(':').map(Number)

        const dateObj = new Date(year, month - 1, day + dayOffset, hours || 0, minutes || 0, 0, 0)
        targetIdMap.set(vid.id, dateObj.toISOString())
      })
    }

    setVideos((prev) =>
      prev.map((vid) =>
        targetIdMap.has(vid.id) ? { ...vid, publishTime: targetIdMap.get(vid.id)! } : vid
      )
    )

    const modeLabel =
      scheduleMode === 'by_slot'
        ? 'Đăng hết danh sách theo từng Khung Giờ (Slot 1 ➔ Slot 2...)'
        : 'Phủ lần lượt từng Khung Giờ mỗi Ngày'

    toast.success(
      `Đã tự động phân bổ lịch công chiếu cho ${targetVideos.length} video với ${K} khung giờ (${modeLabel})!`
    )
  }

  // Update single item
  const handleUpdateVideo = (id: string, field: keyof BulkYouTubeVideoItem, value: any) => {
    setVideos((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  // Remove single video
  const handleRemoveVideo = (id: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== id))
    toast.info('Đã xoá video khỏi hàng chờ')
  }

  // Clear all
  const handleClearAll = () => {
    setVideos([])
    toast.info('Đã xoá toàn bộ hàng chờ')
  }

  // Schedule Single Video (API #6)
  const handleScheduleSingle = async (item: BulkYouTubeVideoItem) => {
    const targetChannelId = item.channelId || selectedChannelId
    if (!targetChannelId) {
      toast.error('Vui lòng chọn Kênh YouTube đã kết nối!')
      return
    }

    if (!item.videoId.trim()) {
      toast.error('Video ID không được để trống!')
      return
    }

    if (!item.title.trim()) {
      toast.error('Tiêu đề video không được để trống!')
      return
    }

    // Validate 15 minutes in future
    const pubMs = new Date(item.publishTime).getTime()
    const minAllowedMs = Date.now() + 14 * 60 * 1000 + 30 * 1000 // ~15 mins
    if (isNaN(pubMs) || pubMs < minAllowedMs) {
      toast.error(`Thời gian công chiếu của "${item.title}" phải cách hiện tại ít nhất 15 phút!`)
      return
    }

    handleUpdateVideo(item.id, 'status', 'scheduling')

    try {
      const payload: ScheduleYouTubePayload = {
        channelId: targetChannelId,
        videoId: item.videoId.trim(),
        publishTime: new Date(item.publishTime).toISOString()
      }

      const res = await youtubeService.scheduleVideo(payload)

      if (res.success) {
        handleUpdateVideo(item.id, 'status', 'success')
        handleUpdateVideo(item.id, 'channelTitle', res.channelTitle)
        toast.success(`Đã hẹn giờ công chiếu cho video: "${item.title}" thành công!`)
      } else {
        handleUpdateVideo(item.id, 'status', 'failed')
        handleUpdateVideo(item.id, 'error', res.message || res.error || 'Lỗi công chiếu')
        toast.error(res.message || 'Lỗi khi hẹn giờ công chiếu video')
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message
        ? Array.isArray(err.response.data.message)
          ? err.response.data.message.join(', ')
          : err.response.data.message
        : err.message || 'Lỗi hệ thống'
      handleUpdateVideo(item.id, 'status', 'failed')
      handleUpdateVideo(item.id, 'error', msg)
      toast.error(`Lỗi: ${msg}`)
    }
  }

  // Run Bulk Schedule
  const handleRunBulkSchedule = async () => {
    if (!selectedChannelId && channels.length === 0) {
      toast.error('Vui lòng kết nối kênh YouTube trước khi lên lịch!')
      return
    }

    const pending = filteredVideos.filter((v) => v.status === 'idle' || v.status === 'failed')
    if (pending.length === 0) {
      toast.info('Không có video nào đang chờ lên lịch')
      return
    }

    setIsProcessing(true)
    setProgress(0)
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i]
      const targetChannelId = item.channelId || selectedChannelId

      if (!targetChannelId || !item.videoId.trim() || !item.title.trim()) {
        handleUpdateVideo(item.id, 'status', 'failed')
        handleUpdateVideo(item.id, 'error', 'Thiếu thông tin bắt buộc (ChannelId, VideoId, Title)')
        failCount++
        setProgress(Math.round(((i + 1) / pending.length) * 100))
        continue
      }

      const pubMs = new Date(item.publishTime).getTime()
      if (isNaN(pubMs) || pubMs < Date.now() + 14 * 60 * 1000 + 30 * 1000) {
        handleUpdateVideo(item.id, 'status', 'failed')
        handleUpdateVideo(item.id, 'error', 'Thời gian công chiếu phải cách hiện tại ít nhất 15 phút')
        failCount++
        setProgress(Math.round(((i + 1) / pending.length) * 100))
        continue
      }

      handleUpdateVideo(item.id, 'status', 'scheduling')

      try {
        const payload: ScheduleYouTubePayload = {
          channelId: targetChannelId,
          videoId: item.videoId.trim(),
          publishTime: new Date(item.publishTime).toISOString()
        }

        const res = await youtubeService.scheduleVideo(payload)

        if (res.success) {
          handleUpdateVideo(item.id, 'status', 'success')
          handleUpdateVideo(item.id, 'channelTitle', res.channelTitle)
          successCount++

          // If thumbnail file is attached, update thumbnail as well
          if (item.thumbnailFile) {
            try {
              handleUpdateVideo(item.id, 'thumbnailStatus', 'updating')
              const thumbRes = await youtubeService.updateThumbnail(targetChannelId, item.videoId.trim(), item.thumbnailFile)
              if (thumbRes.success) {
                handleUpdateVideo(item.id, 'thumbnailStatus', 'success')
              } else {
                handleUpdateVideo(item.id, 'thumbnailStatus', 'failed')
              }
            } catch (e) {
              handleUpdateVideo(item.id, 'thumbnailStatus', 'failed')
            }
          }
        } else {
          handleUpdateVideo(item.id, 'status', 'failed')
          handleUpdateVideo(item.id, 'error', res.message || res.error || 'Lỗi API')
          failCount++
        }
      } catch (err: any) {
        const msg = err?.response?.data?.message
          ? Array.isArray(err.response.data.message)
            ? err.response.data.message.join(', ')
            : err.response.data.message
          : err.message || 'Lỗi hệ thống'
        handleUpdateVideo(item.id, 'status', 'failed')
        handleUpdateVideo(item.id, 'error', msg)
        failCount++
      }

      setProgress(Math.round(((i + 1) / pending.length) * 100))
      await new Promise((r) => setTimeout(r, 400))
    }

    setIsProcessing(false)
    toast.success(`Hoàn tất lên lịch công chiếu! ${successCount} thành công, ${failCount} thất bại.`)
  }

  return (
    <div className='space-y-6'>
      {/* 1. Accounts & OAuth Manager Section */}
      <YouTubeAccountsManager
        channels={channels}
        loadingChannels={loadingChannels}
        onChannelChange={handleRefreshChannels}
      />

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className='w-full'>
        <TabsList className='h-10 bg-muted/60 border border-border/50 rounded-xl p-1 gap-1'>
          <TabsTrigger
            value='edit'
            className='rounded-lg text-xs font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm px-5 flex items-center gap-2'
          >
            <ImageIcon className='h-3.5 w-3.5' />
            Chỉnh sửa Tiêu đề & Thumbnail
          </TabsTrigger>
          <TabsTrigger
            value='schedule'
            className='rounded-lg text-xs font-semibold data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-sm px-5 flex items-center gap-2'
          >
            <Play className='h-3.5 w-3.5' />
            Lên lịch công chiếu
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: CHỈNH SỬA TIÊU ĐỀ & THUMBNAIL */}
        {/* ─────────────────────────────────────────── */}
        <TabsContent value='edit' className='mt-5 space-y-5'>

          {/* Sử dụng AI Card */}
          <Card className='p-4 shadow-sm border-purple-500/20 bg-card/60 backdrop-blur-sm'>
            <div className='flex flex-wrap items-center gap-4'>
              <div className='flex items-center gap-2'>
                <Info className='h-4 w-4 text-purple-500 shrink-0' />
                <div>
                  <p className='text-xs font-bold text-foreground'>Sử dụng AI — Khai báo nội dung tổng hợp</p>
                  <p className='text-[11px] text-muted-foreground'>Bạn có sử dụng AI để tạo hoặc chỉnh sửa nội dung theo bất kỳ cách nào sau đây không? (Áp dụng cho tất cả video khi lên lịch)</p>
                </div>
              </div>
              <Select
                value={syntheticMediaOption}
                onValueChange={(val: 'none' | 'true' | 'false') => setSyntheticMediaOption(val)}
              >
                <SelectTrigger className='h-9 text-xs w-56 border-purple-500/30 font-medium bg-background'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='none' className='text-xs'>Không áp dụng</SelectItem>
                  <SelectItem value='true' className='text-xs'>Có — Dùng AI tạo/chỉnh sửa nội dung</SelectItem>
                  <SelectItem value='false' className='text-xs'>Không — Không dùng AI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>



          {/* TXT Title Replacement Card */}
          <Card className='p-5 shadow-md border-blue-500/20 bg-card/60 backdrop-blur-sm space-y-4'>
            <div className='flex flex-wrap items-center justify-between gap-2 border-b border-blue-500/20 pb-3'>
              <div>
                <h3 className='font-bold text-base text-foreground flex items-center gap-2'>
                  <Upload className='h-5 w-5 text-blue-600 dark:text-blue-400' />
                  Nạp & Thay thế Tiêu đề từ File .TXT (Theo đúng STT)
                </h3>
                <p className='text-xs text-muted-foreground mt-0.5'>
                  Chọn file <code className='text-blue-500 font-bold'>.txt</code> hoặc dán nội dung tiêu đề phân theo số thứ tự (<code className='text-blue-500 font-mono'>1., 2., 3...</code>) để thay thế tự động vào danh sách video.
                </p>
              </div>

              <div className='flex items-center gap-2'>
                <input
                  type='file'
                  ref={txtFileInputRef}
                  accept='.txt'
                  className='hidden'
                  onChange={handleTxtFileUpload}
                />
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => txtFileInputRef.current?.click()}
                  className='h-9 text-xs border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 flex items-center gap-1.5 font-semibold shadow-sm'
                >
                  <Upload className='h-4 w-4' /> Chọn File .TXT
                </Button>
              </div>
            </div>

            <div className='space-y-3'>
              <Textarea
                placeholder={`1.\n🔴GOD WANTS YOU TO BE WITH THIS PERSON. THE NAME WILL SHOCK YOU. OPEN THIS NOW BEFORE ITS TOO LATE\n\n2.\n🔴GOD IS ALIGNING YOU WITH A YOUNGER PARTNER, AND THE REASON WILL SHOCK YOU. OPEN THIS IMMEDIATELY..\n\n3.\n🔴YOUR MOTHER WHO IS IN HEAVEN WITH GOD HAS BEEN TRYING TO CONTACT YOU SINCE YESTERDAY. DONT SKIP GOD`}
                value={txtContent}
                onChange={(e) => setTxtContent(e.target.value)}
                className='h-48 text-xs font-mono bg-background focus-visible:ring-blue-500 border-blue-500/20 resize-none overflow-y-auto'
              />

              <div className='flex flex-wrap items-center justify-between gap-3 pt-1'>
                <div>
                  {parsedTxtTitles.length > 0 ? (
                    <div className='flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-medium'>
                      <span>✨ Tìm thấy <strong>{parsedTxtTitles.length}</strong> tiêu đề (STT #{parsedTxtTitles[0].stt} ➔ #{parsedTxtTitles[parsedTxtTitles.length - 1].stt})</span>
                      <Badge variant='outline' className='text-[10px] bg-blue-500/10 border-blue-500/30 font-mono'>
                        Khớp {Math.min(parsedTxtTitles.length, videos.length)}/{videos.length} Video
                      </Badge>
                    </div>
                  ) : (
                    <p className='text-xs text-muted-foreground'>
                      Chưa nạp tiêu đề nào. Vui lòng bấm <strong>"Chọn File .TXT"</strong> hoặc dán nội dung vào khung trên.
                    </p>
                  )}
                </div>

                <Button
                  size='sm'
                  onClick={handleApplyTxtTitlesToVideos}
                  disabled={parsedTxtTitles.length === 0 || videos.length === 0}
                  className='bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 flex items-center gap-2 shadow-md'
                >
                  <CheckCircle2 className='h-4 w-4' />
                  Áp dụng Tiêu đề vào {videos.length} Video theo STT
                </Button>
              </div>
            </div>
          </Card>

          {/* Thumbnail Folder Upload Card */}
          <Card className='p-5 shadow-md border-emerald-500/20 bg-card/60 backdrop-blur-sm space-y-4'>
            <div className='flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/20 pb-3'>
              <div>
                <h3 className='font-bold text-base text-foreground flex items-center gap-2'>
                  <ImageIcon className='h-5 w-5 text-emerald-600 dark:text-emerald-400' />
                  Nạp & Gắn Ảnh Thumbnail từ Folder (1.png, 2.png...)
                </h3>
                <p className='text-xs text-muted-foreground mt-0.5'>
                  Tải thư mục chứa ảnh đại diện (ví dụ: <code className='text-emerald-500 font-bold'>1.png</code>, <code className='text-emerald-500 font-bold'>2.jpg</code>...) để tự động gắn vào danh sách video theo đúng STT.
                </p>
              </div>

              <div className='flex flex-wrap items-center gap-2'>
                <input
                  type='file'
                  ref={folderInputRef}
                  // @ts-ignore
                  webkitdirectory=''
                  directory=''
                  multiple
                  accept='image/*'
                  className='hidden'
                  onChange={handleImageFilesUpload}
                />
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => folderInputRef.current?.click()}
                  className='h-9 text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-1.5 font-semibold shadow-sm'
                >
                  <FolderOpen className='h-4 w-4' /> Chọn Folder Ảnh
                </Button>
              </div>
            </div>

            {sttImageItems.length > 0 ? (
              <div className='space-y-3'>
                <div className='p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-xs text-emerald-600 dark:text-emerald-400 flex flex-wrap items-center justify-between gap-2'>
                  <span>
                    ✨ Đã nhận diện <strong>{sttImageItems.length}</strong> file ảnh (từ STT <strong>#{sttImageItems[0].stt}</strong> ➔ STT <strong>#{sttImageItems[sttImageItems.length - 1].stt}</strong>)
                  </span>
                  <Badge variant='outline' className='text-[10px] bg-emerald-500/20 border-emerald-500/30 font-mono'>
                    Khớp {Math.min(sttImageItems.length, videos.length)}/{videos.length} Video
                  </Badge>
                </div>

                <div className='flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin'>
                  {sttImageItems.map((imgItem) => (
                    <div
                      key={imgItem.fileName}
                      className='shrink-0 w-28 p-1.5 border rounded-lg bg-background/80 space-y-1 text-center shadow-xs'
                    >
                      <div className='relative aspect-video rounded overflow-hidden bg-muted border'>
                        <img src={imgItem.previewUrl} alt={imgItem.fileName} className='w-full h-full object-cover' />
                        <span className='absolute top-0.5 left-0.5 bg-black/70 text-white text-[9px] font-bold px-1 rounded'>
                          #{imgItem.stt}
                        </span>
                      </div>
                      <p className='text-[10px] font-mono text-muted-foreground truncate' title={imgItem.fileName}>
                        {imgItem.fileName}
                      </p>
                    </div>
                  ))}
                </div>

                <div className='flex flex-wrap justify-end gap-2 pt-1'>
                  <Button
                    size='sm'
                    onClick={() => handleApplyThumbnailsToVideos()}
                    disabled={videos.length === 0}
                    className='text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-9 px-4 flex items-center gap-1.5 shadow-sm'
                  >
                    <CheckCircle2 className='h-4 w-4' />
                    Gắn Thumbnail vào Danh sách Video theo STT
                  </Button>
                </div>
              </div>
            ) : (
              <p className='text-xs text-muted-foreground py-1'>
                Chưa chọn folder ảnh nào. Bấm <strong>"Chọn Folder Ảnh"</strong> để chọn thư mục chứa các file như <code className='text-emerald-500 font-mono'>1.png</code>, <code className='text-emerald-500 font-mono'>2.png</code>...
              </p>
            )}
          </Card>

          {/* Video Preview Table - Edit Mode (read-only thumbnails + titles) */}
          <Card className='p-5 shadow-md border-muted/50 bg-card/60 backdrop-blur-sm space-y-4'>
            <div className='flex flex-wrap items-center justify-between gap-3 border-b pb-3'>
              <div>
                <h3 className='font-bold text-base text-foreground flex items-center gap-2'>
                  <Layers className='h-5 w-5 text-blue-500' />
                  Danh sách Video chỉnh sửa ({filteredVideos.length}/{videos.length})
                </h3>
                <p className='text-xs text-muted-foreground mt-0.5'>
                  Cập nhật Tiêu đề, Mô tả, Tags & Thumbnail lên YouTube.
                </p>
              </div>

              <div className='flex flex-wrap items-center gap-2.5'>
                {/* Bộ lọc trạng thái client */}
                <div className='flex items-center gap-1.5 bg-background border border-muted-foreground/20 rounded-md px-2.5 py-1 shadow-2xs'>
                  <Filter className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
                  <span className='text-xs font-semibold text-muted-foreground shrink-0'>Lọc:</span>
                  <Select
                    value={statusFilter}
                    onValueChange={(val: 'all' | 'unscheduled' | 'scheduled') => setStatusFilter(val)}
                  >
                    <SelectTrigger className='h-7 text-xs w-44 font-medium border-0 shadow-none focus:ring-0 p-0'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all' className='text-xs font-medium'>
                        Tất cả video ({videos.length})
                      </SelectItem>
                      <SelectItem value='unscheduled' className='text-xs font-medium'>
                        Chưa lên lịch ({videos.filter(v => !(v.existingPublishAt && new Date(v.existingPublishAt).getTime() > Date.now())).length})
                      </SelectItem>
                      <SelectItem value='scheduled' className='text-xs font-medium'>
                        Đang chờ công chiếu ({videos.filter(v => Boolean(v.existingPublishAt && new Date(v.existingPublishAt).getTime() > Date.now())).length})
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  size='sm'
                  onClick={handleBulkSaveEditTab}
                  disabled={isSavingEditTab || filteredVideos.length === 0}
                  className='text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold h-9 px-4 flex items-center gap-2 shadow-md'
                >
                  {isSavingEditTab ? (
                    <><RefreshCw className='h-4 w-4 animate-spin' /> Đang cập nhật Tiêu đề & Thumbnail...</>
                  ) : (
                    <><Upload className='h-4 w-4' /> Cập nhật Tiêu đề & Thumbnail lên YouTube ({filteredVideos.length})</>
                  )}
                </Button>
              </div>
            </div>

            <div className='rounded-md border overflow-x-auto'>
              <Table>
                <TableHeader className='bg-muted/40'>
                  <TableRow>
                    <TableHead className='w-12 text-center'>STT</TableHead>
                    <TableHead className='w-28'>Thumbnail</TableHead>
                    <TableHead className='w-28 font-mono'>Video ID</TableHead>
                    <TableHead className='min-w-[260px]'>Tiêu đề & Mô tả</TableHead>
                    <TableHead className='w-[150px]'>Trạng thái Cập nhật</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVideos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className='text-center py-10 text-muted-foreground text-sm'>
                        Không có video nào phù hợp với bộ lọc hiện tại.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVideos.map((item, idx) => {
                      const thumbSrc = item.thumbnailPreview || item.thumbnailUrl || (item.videoId ? `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg` : '')
                      return (
                        <TableRow key={item.id} className='hover:bg-muted/20 transition-colors'>
                          <TableCell className='text-center font-mono text-xs text-muted-foreground font-bold'>
                            {idx + 1}
                          </TableCell>
                          <TableCell>
                            <div className='relative w-24 h-14 rounded overflow-hidden bg-black border border-muted flex items-center justify-center group'>
                              {thumbSrc ? (
                                <img src={thumbSrc} alt={item.title} className='w-full h-full object-cover group-hover:scale-105 transition-transform' onError={(e) => { ; (e.target as HTMLElement).style.display = 'none' }} />
                              ) : (
                                <Video className='h-5 w-5 text-muted-foreground' />
                              )}
                            </div>
                          {item.thumbnailFileName && (
                            <p className='text-[9px] font-mono text-emerald-600 dark:text-emerald-400 mt-1 truncate max-w-[96px]' title={item.thumbnailFileName}>
                              📁 {item.thumbnailFileName}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className='text-[11px] font-mono text-muted-foreground'>{item.videoId || '—'}</span>
                        </TableCell>
                        <TableCell className='space-y-1.5'>
                          <Input
                            value={item.title}
                            onChange={(e) => handleUpdateVideo(item.id, 'title', e.target.value)}
                            placeholder='Tiêu đề video'
                            className='h-8 text-xs font-semibold'
                          />
                          <Textarea
                            value={item.description}
                            onChange={(e) => handleUpdateVideo(item.id, 'description', e.target.value)}
                            placeholder='Mô tả video'
                            className='text-[11px] h-[48px] py-1 resize-none'
                          />
                        </TableCell>
                        <TableCell className='space-y-1'>
                          {/* Metadata Status */}
                          <div className='flex items-center gap-1'>
                            <span className='text-[10px] text-muted-foreground font-semibold'>Metadata:</span>
                            {item.metadataStatus === 'success' && (
                              <Badge variant='outline' className='text-[9px] px-1.5 py-0 bg-blue-500/20 text-blue-600 border-blue-500/30'>Đã cập nhật</Badge>
                            )}
                            {item.metadataStatus === 'updating' && (
                              <RefreshCw className='h-3 w-3 animate-spin text-blue-500' />
                            )}
                            {item.metadataStatus === 'failed' && (
                              <Badge variant='outline' className='text-[9px] px-1.5 py-0 bg-red-500/20 text-red-500 border-red-500/30'>Lỗi</Badge>
                            )}
                            {(!item.metadataStatus || item.metadataStatus === 'idle') && (
                              <span className='text-[10px] text-muted-foreground italic'>Chưa gửi</span>
                            )}
                          </div>

                          {/* Thumbnail Status */}
                          <div className='flex items-center gap-1'>
                            <span className='text-[10px] text-muted-foreground font-semibold'>Thumbnail:</span>
                            {item.thumbnailStatus === 'success' && (
                              <Badge variant='outline' className='text-[9px] px-1.5 py-0 bg-emerald-500/20 text-emerald-600 border-emerald-500/30'>Uploaded</Badge>
                            )}
                            {item.thumbnailStatus === 'updating' && (
                              <RefreshCw className='h-3 w-3 animate-spin text-emerald-500' />
                            )}
                            {item.thumbnailStatus === 'failed' && (
                              <Badge variant='outline' className='text-[9px] px-1.5 py-0 bg-red-500/20 text-red-500 border-red-500/30'>Lỗi</Badge>
                            )}
                            {(!item.thumbnailStatus || item.thumbnailStatus === 'idle') && (
                              <span className='text-[10px] text-muted-foreground italic'>Chưa gửi</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      

        

        {/* ─────────────────────────────────────────── */}
        {/* TAB 2: LÊN LỊCH CÔNG CHIẾU */}
        {/* ─────────────────────────────────────────── */}
        <TabsContent value='schedule' className='mt-5 space-y-5'>

          {/* Channel Selector Card */}
          <Card className='p-5 shadow-md border-red-500/20 bg-card/70 backdrop-blur-sm space-y-4'>
            <div className='flex items-center justify-between border-b pb-3'>
              <div className='flex items-center gap-2'>
                <Youtube className='h-5 w-5 text-red-600' />
                <h3 className='font-semibold text-base text-foreground'>Chọn Kênh YouTube công chiếu</h3>
              </div>
            </div>

            <div className='space-y-3'>
              <label className='text-xs font-semibold text-muted-foreground block'>
                Kênh công chiếu mặc định (*)
              </label>

              {channels.length === 0 ? (
                <div className='p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2'>
                  <AlertCircle className='h-4 w-4 shrink-0' />
                  <span>Chưa kết nối kênh YouTube nào. Hãy kết nối kênh ở mục phía trên!</span>
                </div>
              ) : (
                <div className='flex flex-wrap gap-3 items-center'>
                  <Select
                    value={selectedChannelId}
                    onValueChange={(val) => {
                      setSelectedChannelId(val)
                      handleFetchChannelVideos(val)
                    }}
                  >
                    <SelectTrigger className='h-10 text-xs border-muted-foreground/30 focus:ring-red-500 font-medium flex-1 min-w-[240px]'>
                      <SelectValue placeholder='-- Chọn Kênh YouTube --' />
                    </SelectTrigger>
                    <SelectContent>
                      {channels.map((chan) => (
                        <SelectItem key={chan.channelId} value={chan.channelId} className='text-xs'>
                          <div className='flex items-center gap-2'>
                            <span className='font-bold'>{chan.channelTitle}</span>
                            <span className='text-muted-foreground text-[11px] font-mono'>({chan.channelId})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={() => handleFetchChannelVideos(selectedChannelId)}
                    disabled={loadingChannelVideos || !selectedChannelId}
                    variant='outline'
                    className='h-10 text-xs border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 flex items-center gap-1.5 shrink-0 font-semibold'
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingChannelVideos ? 'animate-spin' : ''}`} />
                    Tải video từ Kênh
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Auto Distribute Time Panel */}
          <Card className='p-5 shadow-md border-orange-500/20 bg-card/70 backdrop-blur-sm space-y-4'>
            <div className='flex flex-wrap items-center justify-between gap-2 border-b border-orange-500/20 pb-3'>
              <div>
                <h3 className='font-bold text-base text-foreground flex items-center gap-2'>
                  <Calendar className='h-5 w-5 text-orange-500' />
                  Tự động phân bổ lịch công chiếu (Khung Giờ trong Ngày)
                </h3>
                <p className='text-xs text-muted-foreground mt-0.5'>
                  Thiết lập ngày bắt đầu và các khung giờ đăng trong ngày để tự động tính mốc thời gian công chiếu.
                </p>
              </div>

              <Button
                onClick={handleAutoDistributeTime}
                disabled={videos.length === 0}
                className='bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs h-9 px-4 flex items-center gap-1.5 shadow-md'
              >
                <Sparkles className='h-4 w-4' />
                Áp dụng phân bổ lịch cho {videos.length} Video
              </Button>
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-3 gap-5 items-start'>
              {/* Col 1: Start Date */}
              <div className='space-y-1.5'>
                <label className='text-xs font-semibold text-muted-foreground block'>
                  1. Ngày bắt đầu công chiếu (*)
                </label>
                <Input
                  type='date'
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className='text-xs h-10 font-mono bg-background border-orange-500/30 focus-visible:ring-orange-500'
                />
                <p className='text-[11px] text-muted-foreground'>
                  Lịch công chiếu sẽ được tính bắt đầu từ ngày này.
                </p>
              </div>

              {/* Col 2: Schedule Mode */}
              <div className='space-y-1.5'>
                <label className='text-xs font-semibold text-muted-foreground block'>
                  2. Chế độ phân bổ lịch (*)
                </label>
                <Select
                  value={scheduleMode}
                  onValueChange={(val: 'by_day' | 'by_slot') => setScheduleMode(val)}
                >
                  <SelectTrigger className='h-10 text-xs font-medium bg-background border-orange-500/30 focus:ring-orange-500'>
                    <SelectValue placeholder='Chọn chế độ phân bổ' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='by_day' className='text-xs py-2'>
                      <div className='space-y-0.5'>
                        <div className='font-bold text-foreground'>Option 1: Phủ lần lượt các Khung Giờ mỗi Ngày</div>
                        <div className='text-[11px] text-muted-foreground'>
                          Ví dụ: 100 video, 5 khung giờ ➔ Video 1-5 chạy 5 slot Ngày 1, Video 6-10 chạy 5 slot Ngày 2...
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value='by_slot' className='text-xs py-2'>
                      <div className='space-y-0.5'>
                        <div className='font-bold text-foreground'>Option 2: Đăng hết danh sách theo từng Khung Giờ</div>
                        <div className='text-[11px] text-muted-foreground'>
                          Ví dụ: 100 video, 5 khung giờ ➔ Video 1-20 chạy Slot 1 (20 ngày), Video 21-40 chạy Slot 2...
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className='text-[11px] text-muted-foreground'>
                  Chọn cách hệ thống chia danh sách video vào các khung giờ.
                </p>
              </div>

              {/* Col 3: Time Slots */}
              <div className='space-y-2 border-t lg:border-t-0 lg:border-l pt-3 lg:pt-0 pl-0 lg:pl-5 border-muted-foreground/20'>
                <div className='flex items-center justify-between'>
                  <label className='text-xs font-semibold text-muted-foreground block'>
                    3. Các Khung Giờ công chiếu ({timeSlots.length} slot) (*)
                  </label>
                  <Button
                    size='sm'
                    variant='ghost'
                    onClick={handleAddTimeSlot}
                    className='h-7 text-xs text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 flex items-center gap-1 font-semibold'
                  >
                    <Plus className='h-3.5 w-3.5' /> Thêm
                  </Button>
                </div>

                <div className='flex flex-wrap gap-2 max-h-40 min-h-[76px] overflow-y-auto p-2 border rounded-lg bg-background/50 border-orange-500/20 items-center'>
                  {timeSlots.map((slot, idx) => (
                    <div
                      key={idx}
                      className='flex items-center gap-1.5 p-1 px-1.5 bg-card border rounded-md shadow-2xs border-orange-500/20 hover:border-orange-500/40 transition-colors group'
                    >
                      <span className='text-[11px] font-mono text-orange-600 dark:text-orange-400 px-1 font-bold'>
                        #{idx + 1}
                      </span>
                      <Input
                        type='time'
                        value={slot}
                        onChange={(e) => handleUpdateTimeSlot(idx, e.target.value)}
                        className='h-7 text-xs font-mono w-24 px-1.5 border-muted focus-visible:ring-orange-500'
                      />
                      {timeSlots.length > 1 && (
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => handleRemoveTimeSlot(idx)}
                          className='h-6 w-6 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded'
                        >
                          <Trash2 className='h-3 w-3' />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <p className='text-[11px] text-muted-foreground'>
                  💡 Bấm <strong>"+ Thêm"</strong> để bổ sung mốc giờ đăng trong ngày.
                </p>
              </div>
            </div>
          </Card>

          {/* Main Videos Table - Schedule Mode */}
          <Card className='p-5 shadow-md border-muted/50 bg-card/60 backdrop-blur-sm space-y-4'>
            <div className='flex flex-wrap items-center justify-between gap-3 border-b pb-4'>
              <div>
                <h3 className='font-bold text-lg text-foreground flex items-center gap-2'>
                  <Layers className='h-5 w-5 text-red-600' />
                  Danh sách Video công chiếu ({filteredVideos.length}/{videos.length})
                </h3>
                <p className='text-xs text-muted-foreground'>
                  Các video Private trên YouTube sẽ được chuyển sang Public đúng giờ hẹn.
                </p>
              </div>

              <div className='flex flex-wrap items-center gap-3'>
                {/* Bộ lọc trạng thái client */}
                <div className='flex items-center gap-1.5 bg-background border border-muted-foreground/20 rounded-md px-2.5 py-1 shadow-2xs'>
                  <Filter className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
                  <span className='text-xs font-semibold text-muted-foreground shrink-0'>Lọc:</span>
                  <Select
                    value={statusFilter}
                    onValueChange={(val: 'all' | 'unscheduled' | 'scheduled') => setStatusFilter(val)}
                  >
                    <SelectTrigger className='h-7 text-xs w-44 font-medium border-0 shadow-none focus:ring-0 p-0'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all' className='text-xs font-medium'>
                        Tất cả video ({videos.length})
                      </SelectItem>
                      <SelectItem value='unscheduled' className='text-xs font-medium'>
                        Chưa lên lịch ({videos.filter(v => !(v.existingPublishAt && new Date(v.existingPublishAt).getTime() > Date.now())).length})
                      </SelectItem>
                      <SelectItem value='scheduled' className='text-xs font-medium'>
                        Đang chờ công chiếu ({videos.filter(v => Boolean(v.existingPublishAt && new Date(v.existingPublishAt).getTime() > Date.now())).length})
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {videos.length > 0 && (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleClearAll}
                    disabled={isProcessing}
                    className='text-xs text-muted-foreground hover:text-red-500'
                  >
                    Xoá tất cả
                  </Button>
                )}
                <Button
                  onClick={handleRunBulkSchedule}
                  disabled={isProcessing || filteredVideos.length === 0 || (!selectedChannelId && channels.length === 0)}
                  className='bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-lg shadow-red-500/20 text-xs font-bold px-4 py-2 flex items-center gap-2'
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className='h-4 w-4 animate-spin' /> Đang xử lý... ({progress}%)
                    </>
                  ) : (
                    <>
                      <Play className='h-4 w-4 fill-current' /> Bắt đầu lên lịch ({filteredVideos.filter(v => v.status !== 'success').length})
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Processing Progress Bar */}
            {isProcessing && (
              <div className='space-y-1.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 animate-in fade-in'>
                <div className='flex justify-between text-xs font-semibold text-red-600 dark:text-red-400'>
                  <span>Đang gửi request thiết lập publishAt tới YouTube...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className='h-2 bg-red-500/20' />
              </div>
            )}

            {/* Videos Table */}
            <div className='rounded-md border overflow-x-auto'>
              <Table>
                <TableHeader className='bg-muted/40'>
                  <TableRow>
                    <TableHead className='w-12 text-center'>STT</TableHead>
                    <TableHead className='w-24'>Thumbnail</TableHead>
                    <TableHead className='w-28'>Video ID</TableHead>
                    <TableHead className='w-[180px]'>Lịch hiện tại (publishAt)</TableHead>
                    <TableHead className='w-[190px]'>Thời gian công chiếu mới (Áp dụng từ trên)</TableHead>
                    <TableHead className='w-[140px] font-medium'>Trạng thái</TableHead>
                    <TableHead className='w-[110px] text-right'>Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVideos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className='text-center py-10 text-muted-foreground text-sm'>
                        Không có Video nào phù hợp với bộ lọc hiện tại ({statusFilter === 'unscheduled' ? 'Chưa lên lịch' : statusFilter === 'scheduled' ? 'Đang chờ công chiếu' : 'Tất cả'}).
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVideos.map((item, idx) => {
                      const isFuturePublish = item.existingPublishAt && new Date(item.existingPublishAt).getTime() > Date.now()
                      const thumbSrc = item.thumbnailPreview || item.thumbnailUrl || (item.videoId ? `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg` : '')
                      return (
                        <TableRow key={item.id} className='hover:bg-muted/20 transition-colors'>
                          <TableCell className='text-center font-mono text-xs text-muted-foreground'>
                            {idx + 1}
                          </TableCell>
                          <TableCell>
                            <div className='relative w-20 h-12 rounded overflow-hidden bg-black border border-muted flex items-center justify-center group'>
                              {thumbSrc ? (
                                <img src={thumbSrc} alt={item.title} className='w-full h-full object-cover group-hover:scale-105 transition-transform' onError={(e) => { ; (e.target as HTMLElement).style.display = 'none' }} />
                              ) : (
                                <Video className='h-5 w-5 text-muted-foreground' />
                              )}
                            </div>
                            <p className='text-[10px] font-medium text-foreground mt-1 truncate max-w-[90px]' title={item.title}>
                              {item.title}
                            </p>
                          </TableCell>
                          <TableCell>
                            <span className='text-xs font-mono text-muted-foreground'>{item.videoId || '—'}</span>
                          </TableCell>
                          <TableCell className='space-y-1'>
                            {item.existingPublishAt ? (
                              <div className='space-y-0.5'>
                                <div className='text-xs font-semibold text-foreground font-mono flex items-center gap-1.5'>
                                  <Clock className='h-3.5 w-3.5 text-blue-500 shrink-0' />
                                  {new Date(item.existingPublishAt).toLocaleString('vi-VN', {
                                    year: 'numeric', month: '2-digit', day: '2-digit',
                                    hour: '2-digit', minute: '2-digit'
                                  })}
                                </div>
                                {isFuturePublish && (
                                  <Badge variant='outline' className='text-[9px] px-1 py-0 bg-blue-500/10 text-blue-600 border-blue-500/30 font-medium'>
                                    Đang chờ công chiếu
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className='text-xs text-muted-foreground italic'>Chưa có lịch</span>
                            )}
                          </TableCell>
                          <TableCell className='space-y-1'>
                            {item.publishTime ? (
                              <div className='text-xs font-semibold text-orange-600 dark:text-orange-400 font-mono flex items-center gap-1.5'>
                                <Clock className='h-3.5 w-3.5 text-orange-500 shrink-0' />
                                {new Date(item.publishTime).toLocaleString('vi-VN', {
                                  year: 'numeric', month: '2-digit', day: '2-digit',
                                  hour: '2-digit', minute: '2-digit'
                                })}
                              </div>
                            ) : (
                              <span className='text-xs text-muted-foreground italic'>Chưa phân bổ</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.status === 'idle' && (
                              isFuturePublish ? (
                                <Badge variant='outline' className='text-[11px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'>
                                  <Clock className='h-3 w-3 mr-1' /> Đang chờ công chiếu
                                </Badge>
                              ) : (
                                <Badge variant='outline' className='text-[11px] bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30'>
                                  <Clock className='h-3 w-3 mr-1' /> Chờ
                                </Badge>
                              )
                            )}
                            {item.status === 'scheduling' && (
                              <Badge variant='outline' className='text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse'>
                                <RefreshCw className='h-3 w-3 mr-1 animate-spin' /> Đang hẹn...
                              </Badge>
                            )}
                            {item.status === 'success' && (
                              <div className='space-y-0.5'>
                                <Badge variant='outline' className='text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'>
                                  <CheckCircle2 className='h-3 w-3 mr-1' /> Đã lên lịch
                                </Badge>
                                <p className='text-[10px] text-emerald-600 dark:text-emerald-400 font-mono'>Private -&gt; Public</p>
                              </div>
                            )}
                            {item.status === 'failed' && (
                              <div className='space-y-0.5'>
                                <Badge variant='outline' className='text-[11px] bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'>
                                  <XCircle className='h-3 w-3 mr-1' /> Lỗi
                                </Badge>
                                {item.error && (
                                  <p className='text-[10px] text-red-500 truncate max-w-[120px]' title={item.error}>{item.error}</p>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className='text-right'>
                            <div className='flex items-center justify-end gap-1'>
                              <Button
                                size='sm' variant='ghost'
                                onClick={() => handleScheduleSingle(item)}
                                disabled={isProcessing || item.status === 'scheduling'}
                                className='h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10'
                                title='Lên lịch chỉ riêng video này'
                              >
                                <Play className='h-3.5 w-3.5' />
                              </Button>
                              <Button
                                size='sm' variant='ghost'
                                onClick={() => handleRemoveVideo(item.id)}
                                disabled={isProcessing}
                                className='h-7 w-7 p-0 text-red-500 hover:bg-red-500/10'
                                title='Xoá khỏi hàng chờ'
                              >
                                <Trash2 className='h-3.5 w-3.5' />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ─────────────────────────────────────────── */}
        </Tabs>
    </div>
  )
}
