import { useSearchParams } from 'react-router-dom'
import { DataTable } from '@/components/common/data-table'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  pinterestService,
  type PinterestChannelItem,
  type PinterestChannelResponse
} from '@/services/pinterest.service'
import type { ColumnDef } from '@tanstack/react-table'
import {
  CheckCircle,
  Clock,
  ExternalLink,
  Loader2,
  XCircle,
  Download,
  Video,
  ListRestart,
  Copy,
  FileSpreadsheet,
  Image as ImageIcon,
  Calendar
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { PinterestBulkSchedule } from './PinterestBulkSchedule'


type AudioStatus = 'pending' | 'loading' | 'success' | 'failed'

interface AudioDataItem {
  videoUrl: string
  status: AudioStatus
  progress: number
  audioUrl?: string
  title?: string
  error?: string
}

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

export const AudioPinterest = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'channel'

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val }, { replace: true })
  }

  // Tab 1: Channel Info state
  const [channelInputText, setChannelInputText] = useState('')
  const [channelLoading, setChannelLoading] = useState(false)
  const [channelData, setChannelData] = useState<PinterestChannelResponse | null>(null)
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video'>('all')
  const [channelPagination, setChannelPagination] = useState({ pageIndex: 0, pageSize: 100 })
  const [channelRowLoading, setChannelRowLoading] = useState<Record<string, { audio?: boolean; video?: boolean; image?: boolean }>>({})
  const [scanTrigger, setScanTrigger] = useState(0)
  const [isClearingCache, setIsClearingCache] = useState(false)
  const [isExportingImages, setIsExportingImages] = useState(false)

  // Tab 2: Bulk Video Download state
  const [videoUrlText, setVideoUrlText] = useState('')
  const [isVideoFormatted, setIsVideoFormatted] = useState(false)
  const [isProcessingVideo, setIsProcessingVideo] = useState(false)
  const [videoDownloadData, setVideoDownloadData] = useState<AudioDataItem[]>([])
  const [videoPagination, setVideoPagination] = useState({ pageIndex: 0, pageSize: 50 })

  // Tab 3: Bulk Audio Download state
  const [urlText, setUrlText] = useState('')
  const [isFormatted, setIsFormatted] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [audioData, setAudioData] = useState<AudioDataItem[]>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 })

  // Tab 4: Bulk Image Download state
  const [imageUrlText, setImageUrlText] = useState('')
  const [isImageFormatted, setIsImageFormatted] = useState(false)
  const [isProcessingImage, setIsProcessingImage] = useState(false)
  const [imageDownloadData, setImageDownloadData] = useState<AudioDataItem[]>([])
  const [imagePagination, setImagePagination] = useState({ pageIndex: 0, pageSize: 50 })

  const formatUrls = () => {
    if (!urlText.trim()) {
      toast.error('Vui lòng nhập danh sách URLs')
      return
    }

    const urls = urlText
      .split(/[\s,\n\t]+/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0)

    const formattedUrls = urls.join(', ')
    setUrlText(formattedUrls)
    setIsFormatted(true)
    toast.success('Định dạng URL thành công')
  }

  const formatVideoUrls = () => {
    if (!videoUrlText.trim()) {
      toast.error('Vui lòng nhập danh sách URLs')
      return
    }

    const urls = videoUrlText
      .split(/[\s,\n\t]+/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0)

    const formattedUrls = urls.join(', ')
    setVideoUrlText(formattedUrls)
    setIsVideoFormatted(true)
    toast.success('Định dạng URL thành công')
  }

  const formatImageUrls = () => {
    if (!imageUrlText.trim()) {
      toast.error('Vui lòng nhập danh sách URLs')
      return
    }

    const urls = imageUrlText
      .split(/[\s,\n\t]+/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0)

    const formattedUrls = urls.join(', ')
    setImageUrlText(formattedUrls)
    setIsImageFormatted(true)
    toast.success('Định dạng URL thành công')
  }

  const updateItemStatus = (
    videoUrl: string,
    updates: Partial<Omit<AudioDataItem, 'videoUrl'>>
  ) => {
    setAudioData((prev) =>
      prev.map((item) => (item.videoUrl === videoUrl ? { ...item, ...updates } : item))
    )
  }

  const downloadFile = (fileUrl: string, filename: string, blob?: Blob) => {
    try {
      const link = document.createElement('a')
      link.href = fileUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setTimeout(() => {
        if (blob) {
          URL.revokeObjectURL(fileUrl)
        }
      }, 100)
    } catch (error) {
      console.error('Download failed:', error)
      toast.error('Không thể tải xuống tệp tin')
    }
  }

  const handleGetChannel = () => {
    if (!channelInputText.trim()) {
      toast.error('Vui lòng nhập link kênh Pinterest')
      return
    }

    setChannelData(null)
    setTypeFilter('all')
    setChannelPagination({ pageIndex: 0, pageSize: 100 })
    setScanTrigger((prev) => prev + 1)
  }

  const handleTypeChange = (value: string) => {
    const newType = value as 'all' | 'image' | 'video'
    setTypeFilter(newType)
    setChannelPagination({ pageIndex: 0, pageSize: 100 })
  }

  const handleClearCache = async () => {
    setIsClearingCache(true)
    try {
      const response = await pinterestService.clearCache()
      if (response.success) {
        toast.success(response.message || `Đã xóa thành công ${response.deletedFilesCount} file cache.`)
      } else {
        toast.error('Không thể xóa bộ nhớ đệm.')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Lỗi khi xóa bộ nhớ đệm')
    } finally {
      setIsClearingCache(false)
    }
  }

  useEffect(() => {
    if (scanTrigger === 0) return

    const fetchChannel = async () => {
      setChannelLoading(true)
      try {
        const data = await pinterestService.getChannel(
          channelInputText,
          typeFilter === 'all' ? undefined : typeFilter,
          channelPagination.pageIndex + 1,
          channelPagination.pageSize
        )
        if (data.success) {
          setChannelData(data)
        } else {
          toast.error(data.error || 'Không thể lấy thông tin kênh')
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Lỗi khi tải dữ liệu kênh')
      } finally {
        setChannelLoading(false)
      }
    }

    fetchChannel()
  }, [scanTrigger, typeFilter, channelPagination.pageIndex, channelPagination.pageSize])

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-'
    const date = new Date(timestamp * 1000)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const handleExportChannelExcel = async () => {
    if (!channelInputText.trim() || !channelData) {
      toast.error('Không có dữ liệu kênh để xuất')
      return
    }

    setChannelLoading(true)
    try {
      const typeParam = typeFilter === 'all' ? undefined : typeFilter
      const response = await pinterestService.exportChannelExcel(channelInputText, typeParam)
      
      const blobUrl = URL.createObjectURL(response.blob)
      downloadFile(blobUrl, response.filename, response.blob)
      toast.success('Đã xuất file Excel kênh thành công!')
    } catch (error) {
      console.error(error)
      toast.error('Không thể xuất file Excel kênh')
    } finally {
      setChannelLoading(false)
    }
  }

  const handleExportChannelImages = async () => {
    if (!channelInputText.trim() || !channelData) {
      toast.error('Không có dữ liệu kênh để tải ảnh')
      return
    }

    setIsExportingImages(true)
    try {
      const typeParam = typeFilter === 'all' ? undefined : typeFilter
      const response = await pinterestService.exportChannelImagesZip(channelInputText, typeParam)
      
      const blobUrl = URL.createObjectURL(response.blob)
      downloadFile(blobUrl, response.filename, response.blob)
      toast.success('Đã tải bộ ảnh bài viết dạng file ZIP thành công!')
    } catch (error) {
      console.error(error)
      toast.error('Không thể tải bộ ảnh bài viết')
    } finally {
      setIsExportingImages(false)
    }
  }

  const handleDownloadChannelAudio = async (pinUrl: string, id: string, index: number) => {
    setChannelRowLoading((prev) => ({ ...prev, [id]: { ...prev[id], audio: true } }))
    try {
      const response = await pinterestService.getAudio(pinUrl)
      if (response.success && response.audioUrl) {
        const filename = `${index}.mp3`
        downloadFile(response.audioUrl, filename, response.blob)
        toast.success(`Đã tải audio: ${filename}`)
      } else {
        toast.error(response.error || 'Failed to download audio')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Download failed')
    } finally {
      setChannelRowLoading((prev) => ({ ...prev, [id]: { ...prev[id], audio: false } }))
    }
  }

  const handleDownloadChannelVideo = async (pinUrl: string, id: string, index: number) => {
    setChannelRowLoading((prev) => ({ ...prev, [id]: { ...prev[id], video: true } }))
    try {
      const response = await pinterestService.getVideo(pinUrl)
      if (response.success && response.videoUrl) {
        const filename = `${index}.mp4`
        downloadFile(response.videoUrl, filename, response.blob)
        toast.success(`Đã tải video: ${filename}`)
      } else {
        toast.error(response.error || 'Failed to download video')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Download failed')
    } finally {
      setChannelRowLoading((prev) => ({ ...prev, [id]: { ...prev[id], video: false } }))
    }
  }

  const handleDownloadChannelImage = async (pinUrl: string, id: string, index: number) => {
    setChannelRowLoading((prev) => ({ ...prev, [id]: { ...prev[id], image: true } }))
    try {
      const response = await pinterestService.getImage(pinUrl)
      if (response.success && response.imageUrl) {
        const filename = `${index}.jpg`
        downloadFile(response.imageUrl, filename, response.blob)
        toast.success(`Đã tải ảnh: ${filename}`)
      } else {
        toast.error(response.error || 'Failed to download image')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Download failed')
    } finally {
      setChannelRowLoading((prev) => ({ ...prev, [id]: { ...prev[id], image: false } }))
    }
  }

  const handleGetAudioBulk = async () => {
    if (!urlText.trim()) {
      toast.error('Vui lòng nhập URLs')
      return
    }

    if (!isFormatted) {
      toast.error('Vui lòng định dạng URLs trước')
      return
    }

    const urls = urlText
      .split(/[\s,\n\t]+/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0)

    if (urls.length === 0) {
      toast.error('Không tìm thấy link Pinterest nào hợp lệ')
      return
    }

    const initialData: AudioDataItem[] = urls.map((url) => ({
      videoUrl: url,
      status: 'pending',
      progress: 0
    }))
    setAudioData(initialData)
    setIsProcessing(true)

    let successCount = 0

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      const index = i + 1

      try {
        updateItemStatus(url, { status: 'loading', progress: 0 })

        const progressInterval = setInterval(() => {
          setAudioData((prev) =>
            prev.map((item) => {
              if (item.videoUrl === url && item.status === 'loading') {
                const newProgress = Math.min(item.progress + 15, 90)
                return { ...item, progress: newProgress }
              }
              return item
            })
          )
        }, 300)

        const response = await pinterestService.getAudio(url)
        clearInterval(progressInterval)

        if (response.success && response.audioUrl) {
          updateItemStatus(url, {
            status: 'success',
            progress: 100,
            audioUrl: response.audioUrl,
            title: response.title || `Pinterest Audio ${index}`
          })

          const filename = `${index}.mp3`
          downloadFile(response.audioUrl, filename, response.blob)
          successCount++
          toast.success(`Đã tải: ${filename}`)
        } else {
          updateItemStatus(url, {
            status: 'failed',
            progress: 0,
            error: response.error || 'Lỗi không xác định'
          })
        }
      } catch (error) {
        updateItemStatus(url, {
          status: 'failed',
          progress: 0,
          error: error instanceof Error ? error.message : 'Lỗi không xác định'
        })
      }
    }

    setIsProcessing(false)
    toast.success(`Hoàn thành: Đã tải ${successCount}/${urls.length} file audio`)
  }

  const handleGetVideoBulk = async () => {
    if (!videoUrlText.trim()) {
      toast.error('Vui lòng nhập URLs')
      return
    }

    if (!isVideoFormatted) {
      toast.error('Vui lòng định dạng URLs trước')
      return
    }

    const urls = videoUrlText
      .split(/[\s,\n\t]+/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0)

    if (urls.length === 0) {
      toast.error('Không tìm thấy link Pinterest nào hợp lệ')
      return
    }

    const initialData: AudioDataItem[] = urls.map((url) => ({
      videoUrl: url,
      status: 'pending',
      progress: 0
    }))
    setVideoDownloadData(initialData)
    setIsProcessingVideo(true)

    let successCount = 0

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      const index = i + 1

      try {
        setVideoDownloadData((prev) =>
          prev.map((item) => (item.videoUrl === url ? { ...item, status: 'loading', progress: 0 } : item))
        )

        const progressInterval = setInterval(() => {
          setVideoDownloadData((prev) =>
            prev.map((item) => {
              if (item.videoUrl === url && item.status === 'loading') {
                const newProgress = Math.min(item.progress + 15, 90)
                return { ...item, progress: newProgress }
              }
              return item
            })
          )
        }, 300)

        const response = await pinterestService.getVideo(url)
        clearInterval(progressInterval)

        if (response.success && response.videoUrl) {
          setVideoDownloadData((prev) =>
            prev.map((item) =>
              item.videoUrl === url
                ? {
                    ...item,
                    status: 'success',
                    progress: 100,
                    audioUrl: response.videoUrl,
                    title: response.title || `Pinterest Video ${index}`
                  }
                : item
            )
          )

          const filename = `${index}.mp4`
          downloadFile(response.videoUrl, filename, response.blob)
          successCount++
          toast.success(`Đã tải: ${filename}`)
        } else {
          setVideoDownloadData((prev) =>
            prev.map((item) =>
              item.videoUrl === url
                ? { ...item, status: 'failed', progress: 0, error: response.error || 'Lỗi không xác định' }
                : item
            )
          )
        }
      } catch (error) {
        setVideoDownloadData((prev) =>
          prev.map((item) =>
            item.videoUrl === url
              ? {
                  ...item,
                  status: 'failed',
                  progress: 0,
                  error: error instanceof Error ? error.message : 'Lỗi không xác định'
                }
              : item
          )
        )
      }
    }

    setIsProcessingVideo(false)
    toast.success(`Hoàn thành: Đã tải ${successCount}/${urls.length} file video`)
  }

  const handleGetImageBulk = async () => {
    if (!imageUrlText.trim()) {
      toast.error('Vui lòng nhập URLs')
      return
    }

    if (!isImageFormatted) {
      toast.error('Vui lòng định dạng URLs trước')
      return
    }

    const urls = imageUrlText
      .split(/[\s,\n\t]+/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0)

    if (urls.length === 0) {
      toast.error('Không tìm thấy link Pinterest nào hợp lệ')
      return
    }

    const initialData: AudioDataItem[] = urls.map((url) => ({
      videoUrl: url,
      status: 'pending',
      progress: 0
    }))
    setImageDownloadData(initialData)
    setIsProcessingImage(true)

    let successCount = 0

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      const index = i + 1

      try {
        setImageDownloadData((prev) =>
          prev.map((item) => (item.videoUrl === url ? { ...item, status: 'loading', progress: 0 } : item))
        )

        const progressInterval = setInterval(() => {
          setImageDownloadData((prev) =>
            prev.map((item) => {
              if (item.videoUrl === url && item.status === 'loading') {
                const newProgress = Math.min(item.progress + 15, 90)
                return { ...item, progress: newProgress }
              }
              return item
            })
          )
        }, 300)

        const response = await pinterestService.getImage(url)
        clearInterval(progressInterval)

        if (response.success && response.imageUrl) {
          setImageDownloadData((prev) =>
            prev.map((item) =>
              item.videoUrl === url
                ? {
                    ...item,
                    status: 'success',
                    progress: 100,
                    audioUrl: response.imageUrl,
                    title: response.title || `Pinterest Image ${index}`
                  }
                : item
            )
          )

          const filename = `${index}.jpg`
          downloadFile(response.imageUrl, filename, response.blob)
          successCount++
          toast.success(`Đã tải: ${filename}`)
        } else {
          setImageDownloadData((prev) =>
            prev.map((item) =>
              item.videoUrl === url
                ? { ...item, status: 'failed', progress: 0, error: response.error || 'Lỗi không xác định' }
                : item
            )
          )
        }
      } catch (error) {
        setImageDownloadData((prev) =>
          prev.map((item) =>
            item.videoUrl === url
              ? {
                  ...item,
                  status: 'failed',
                  progress: 0,
                  error: error instanceof Error ? error.message : 'Lỗi không xác định'
                }
              : item
          )
        )
      }
    }

    setIsProcessingImage(false)
    toast.success(`Hoàn thành: Đã tải ${successCount}/${urls.length} file ảnh`)
  }

  const renderStatus = (item: AudioDataItem) => {
    switch (item.status) {
      case 'pending':
        return (
          <div className='flex items-center gap-2 text-gray-500'>
            <Clock className='h-4 w-4' />
            <span>Chờ xử lý</span>
          </div>
        )
      case 'loading':
        return (
          <div className='space-y-2 min-w-[150px]'>
            <div className='flex items-center gap-2 text-red-600 dark:text-red-400'>
              <Loader2 className='h-4 w-4 animate-spin' />
              <span>Đang tải... {item.progress}%</span>
            </div>
            <Progress value={item.progress} className='h-1.5' />
          </div>
        )
      case 'success':
        return (
          <div className='flex items-center gap-2 text-green-600 font-medium'>
            <CheckCircle className='h-4 w-4' />
            <span>Thành công</span>
          </div>
        )
      case 'failed':
        return (
          <div className='flex items-center gap-2 text-red-600 font-medium'>
            <XCircle className='h-4 w-4' />
            <span>Thất bại</span>
          </div>
        )
    }
  }

  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return '-'
    return new Intl.NumberFormat().format(num)
  }

  const columns: ColumnDef<AudioDataItem>[] = [
    {
      id: 'index',
      header: 'STT',
      cell: ({ row }) => {
        const index = row.index + 1 + pagination.pageIndex * pagination.pageSize
        return <div className='font-medium'>{index}</div>
      },
      size: 60
    },
    {
      accessorKey: 'videoUrl',
      header: 'URL Pin',
      cell: ({ row }) => (
        <a
          href={row.original.videoUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='text-red-600 hover:underline flex items-center gap-1 font-mono text-xs'
        >
          <span className='max-w-xs truncate'>{row.original.videoUrl}</span>
          <ExternalLink className='h-3 w-3' />
        </a>
      )
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => renderStatus(row.original)
    },
    {
      accessorKey: 'title',
      header: 'Tên file',
      cell: ({ row }) => {
        if (!row.original.title) return '-'
        return (
          <div className='max-w-xs truncate font-medium' title={row.original.title}>
            {row.original.title}
          </div>
        )
      }
    },
    {
      accessorKey: 'error',
      header: 'Chi tiết lỗi',
      cell: ({ row }) => {
        if (row.original.status !== 'failed') return '-'
        return (
          <div className='max-w-xs truncate text-red-600 text-xs' title={row.original.error}>
            {row.original.error}
          </div>
        )
      }
    }
  ]

  const videoColumns: ColumnDef<AudioDataItem>[] = [
    {
      id: 'index',
      header: 'STT',
      cell: ({ row }) => {
        const index = row.index + 1 + videoPagination.pageIndex * videoPagination.pageSize
        return <div className='font-medium'>{index}</div>
      },
      size: 60
    },
    {
      accessorKey: 'videoUrl',
      header: 'URL Pin',
      cell: ({ row }) => (
        <a
          href={row.original.videoUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='text-red-600 hover:underline flex items-center gap-1 font-mono text-xs'
        >
          <span className='max-w-xs truncate'>{row.original.videoUrl}</span>
          <ExternalLink className='h-3 w-3' />
        </a>
      )
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => renderStatus(row.original)
    },
    {
      accessorKey: 'title',
      header: 'Tên file',
      cell: ({ row }) => {
        if (!row.original.title) return '-'
        return (
          <div className='max-w-xs truncate font-medium' title={row.original.title}>
            {row.original.title}
          </div>
        )
      }
    },
    {
      accessorKey: 'error',
      header: 'Chi tiết lỗi',
      cell: ({ row }) => {
        if (row.original.status !== 'failed') return '-'
        return (
          <div className='max-w-xs truncate text-red-600 text-xs' title={row.original.error}>
            {row.original.error}
          </div>
        )
      }
    }
  ]

  const imageColumns: ColumnDef<AudioDataItem>[] = [
    {
      id: 'index',
      header: 'STT',
      cell: ({ row }) => {
        const index = row.index + 1 + imagePagination.pageIndex * imagePagination.pageSize
        return <div className='font-medium'>{index}</div>
      },
      size: 60
    },
    {
      accessorKey: 'videoUrl',
      header: 'URL Pin',
      cell: ({ row }) => (
        <a
          href={row.original.videoUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='text-red-600 hover:underline flex items-center gap-1 font-mono text-xs'
        >
          <span className='max-w-xs truncate'>{row.original.videoUrl}</span>
          <ExternalLink className='h-3 w-3' />
        </a>
      )
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => renderStatus(row.original)
    },
    {
      accessorKey: 'title',
      header: 'Tên file',
      cell: ({ row }) => {
        if (!row.original.title) return '-'
        return (
          <div className='max-w-xs truncate font-medium' title={row.original.title}>
            {row.original.title}
          </div>
        )
      }
    },
    {
      accessorKey: 'error',
      header: 'Chi tiết lỗi',
      cell: ({ row }) => {
        if (row.original.status !== 'failed') return '-'
        return (
          <div className='max-w-xs truncate text-red-600 text-xs' title={row.original.error}>
            {row.original.error}
          </div>
        )
      }
    }
  ]

  const channelColumns: ColumnDef<PinterestChannelItem>[] = [
    {
      id: 'index',
      header: 'STT',
      cell: ({ row }) => {
        const index = row.index + 1 + channelPagination.pageIndex * channelPagination.pageSize
        return <div className='font-medium'>{index}</div>
      },
      size: 50
    },
    {
      accessorKey: 'image_url',
      header: 'Ảnh',
      cell: ({ row }) => {
        if (!row.original.image_url) return '-'
        return (
          <img
            src={row.original.image_url}
            alt='Thumbnail'
            className='w-10 h-14 object-cover rounded border bg-muted'
          />
        )
      },
      size: 60
    },
    {
      accessorKey: 'id',
      header: 'Link pin',
      cell: ({ row }) => (
        <a
          href={row.original.pin_url}
          target='_blank'
          rel='noopener noreferrer'
          className='text-red-600 hover:underline flex items-center gap-1 font-mono text-xs'
        >
          <span className='max-w-[100px] truncate'>{row.original.id}</span>
          <ExternalLink className='h-3 w-3' />
        </a>
      ),
      size: 110
    },
    {
      accessorKey: 'type',
      header: 'Loại',
      cell: ({ row }) => {
        const type = row.original.type
        if (type === 'video') return <span className='text-xs font-medium text-blue-600 dark:text-blue-400'>Video</span>
        return <span className='text-xs font-medium text-zinc-600 dark:text-zinc-400'>Ảnh</span>
      },
      size: 100
    },
    {
      accessorKey: 'title',
      header: 'Tiêu đề / Mô tả',
      cell: ({ row }) => {
        const displayTitle = row.original.title || row.original.description || ''
        if (!displayTitle.trim()) return '-'
        return (
          <div className='flex items-center gap-1.5 max-w-xs group/caption'>
            <span className='truncate text-xs font-normal' title={displayTitle}>
              {displayTitle}
            </span>
            <Button
              size='icon'
              variant='ghost'
              className='h-6 w-6 opacity-0 group-hover/caption:opacity-100 transition-opacity shrink-0'
              onClick={() => {
                navigator.clipboard.writeText(displayTitle)
                toast.success('Đã sao chép mô tả!')
              }}
              title='Sao chép mô tả'
            >
              <Copy className='h-3 w-3 text-muted-foreground hover:text-red-600' />
            </Button>
          </div>
        )
      }
    },
    {
      accessorKey: 'like_count',
      header: 'Lượt thích',
      cell: ({ row }) => formatNumber(row.original.like_count)
    },
    {
      accessorKey: 'repin_count',
      header: 'Chia sẻ',
      cell: ({ row }) => formatNumber(row.original.repin_count)
    },
    {
      accessorKey: 'save_count',
      header: 'Lượt lưu',
      cell: ({ row }) => formatNumber(row.original.save_count)
    },
    {
      accessorKey: 'comment_count',
      header: 'Bình luận',
      cell: ({ row }) => formatNumber(row.original.comment_count)
    },
    {
      accessorKey: 'takenAt',
      header: 'Ngày tạo',
      cell: ({ row }) => formatDate(row.original.takenAt),
      size: 110
    },
    {
      id: 'actions',
      header: 'Thao tác',
      cell: ({ row }) => {
        const item = row.original
        const loadingState = channelRowLoading[item.id] || {}

        if (item.type === 'video') {
          return (
            <div className='flex items-center gap-2'>
              {loadingState.audio ? (
                <div className='flex items-center gap-1 text-[11px] text-red-600 font-medium'>
                  <Loader2 className='h-3 w-3 animate-spin' />
                  <span>MP3...</span>
                </div>
              ) : (
                <Button
                  size='sm'
                  variant='outline'
                  className='h-7 px-2 text-xs border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20'
                  onClick={() => handleDownloadChannelAudio(item.pin_url, item.id, row.index + 1)}
                  disabled={loadingState.video}
                >
                  Tải MP3
                </Button>
              )}

              {loadingState.video ? (
                <div className='flex items-center gap-1 text-[11px] text-red-600 font-medium'>
                  <Loader2 className='h-3 w-3 animate-spin' />
                  <span>MP4...</span>
                </div>
              ) : (
                <Button
                  size='sm'
                  variant='outline'
                  className='h-7 px-2 text-xs border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20'
                  onClick={() => handleDownloadChannelVideo(item.pin_url, item.id, row.index + 1)}
                  disabled={loadingState.audio}
                >
                  Tải Video
                </Button>
              )}
            </div>
          )
        }

        return (
          <div className='flex items-center gap-2'>
            {loadingState.image ? (
              <Loader2 className='h-3 w-3 animate-spin text-red-600' />
            ) : (
              <Button
                size='sm'
                variant='outline'
                className='h-7 px-2 text-xs border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20'
                onClick={() => handleDownloadChannelImage(item.pin_url, item.id, row.index + 1)}
              >
                Tải Ảnh
              </Button>
            )}
          </div>
        )
      }
    }
  ]

  const filteredChannelItems = channelData?.items || []

  return (
    <div className='space-y-6 mx-auto'>
      <div className='flex items-center gap-3 border-b pb-4'>
        <div className='p-2 bg-gradient-to-tr from-red-500 to-rose-600 rounded-lg text-white shadow-md'>
          <PinterestIcon className='h-6 w-6' />
        </div>
        <div>
          <h1 className='text-2xl font-bold tracking-tight bg-gradient-to-r from-red-500 to-rose-600 bg-clip-text text-transparent'>
            Pinterest Downloader
          </h1>
          <p className='text-muted-foreground text-sm'>
            Tải ảnh, video, và nhạc chất lượng cao từ các ghim (pins) Pinterest cá nhân hoặc theo kênh.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className='w-full'>
        <TabsList className='grid w-full grid-cols-2 sm:grid-cols-5 h-auto p-1 max-w-[1000px] mb-4'>
          <TabsTrigger value='channel' className='flex items-center gap-1.5 py-2'>
            <PinterestIcon className='h-4 w-4' />
            Lấy thông tin kênh
          </TabsTrigger>
          <TabsTrigger value='schedule' className='flex items-center gap-1.5 py-2'>
            <Calendar className='h-4 w-4 text-red-500' />
            Lên lịch hàng loạt
          </TabsTrigger>
          <TabsTrigger value='bulk-video' className='flex items-center gap-1.5 py-2'>
            <Video className='h-4 w-4' />
            Tải video hàng loạt
          </TabsTrigger>
          <TabsTrigger value='bulk' className='flex items-center gap-1.5 py-2'>
            <ListRestart className='h-4 w-4' />
            Tải audio hàng loạt
          </TabsTrigger>
          <TabsTrigger value='bulk-image' className='flex items-center gap-1.5 py-2'>
            <ImageIcon className='h-4 w-4' />
            Tải ảnh hàng loạt
          </TabsTrigger>
        </TabsList>

        {/* PROFILE/CHANNEL SCANNER TAB */}
        <TabsContent value='channel' className='space-y-4'>
          <Card className='p-6 shadow-md border-muted/50 bg-card/60 backdrop-blur-sm'>
            <div className='space-y-4'>
              <div>
                <label className='text-sm font-semibold mb-2 block text-foreground'>
                  Nhập URL kênh Pinterest (ví dụ: https://www.pinterest.com/svetochkapower/_created/)
                </label>
                <div className='flex gap-2'>
                  <div className='relative flex-1'>
                    <PinterestIcon className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
                    <Input
                      value={channelInputText}
                      onChange={(e) => setChannelInputText(e.target.value)}
                      placeholder='URL kênh Pinterest'
                      className='pl-9 h-11'
                      disabled={channelLoading}
                    />
                  </div>
                  <Button
                    onClick={handleGetChannel}
                    disabled={channelLoading}
                    className='h-11 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-medium shadow'
                  >
                    {channelLoading ? (
                      <>
                        <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                        Đang quét kênh...
                      </>
                    ) : (
                      'Quét kênh'
                    )}
                  </Button>
                  <Button
                    onClick={handleClearCache}
                    disabled={channelLoading || isClearingCache}
                    variant='outline'
                    className='h-11 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 font-medium'
                  >
                    {isClearingCache ? (
                      <>
                        <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                        Đang xóa...
                      </>
                    ) : (
                      'Xóa cache'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {channelData?.user && (
            <Card className='p-6 border-muted shadow-md bg-card/40 backdrop-blur-md flex items-center gap-4'>
              <div className='h-16 w-16 rounded-full flex items-center justify-center border-2 border-red-500 shadow-md bg-muted text-red-600'>
                <PinterestIcon className='h-8 w-8' />
              </div>
              <div className='space-y-1'>
                <div className='flex items-center gap-1.5'>
                  <h2 className='text-lg font-bold text-foreground'>{channelData.user.full_name || channelData.user.username}</h2>
                </div>
                <p className='text-sm text-red-600 font-mono'>@{channelData.user.username}</p>
                <p className='text-xs text-muted-foreground font-mono'>ID: {channelData.user.id}</p>
                {(channelData.user.follower_count !== undefined || channelData.user.pin_count !== undefined) && (
                  <div className='flex gap-4 mt-2 text-xs font-medium text-muted-foreground'>
                    <div>
                      <span className='font-bold text-foreground'>{formatNumber(channelData.user.follower_count)}</span> người theo dõi
                    </div>
                    <div>
                      <span className='font-bold text-foreground'>{formatNumber(channelData.user.pin_count)}</span> ghim
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {channelData && (
            <div className='space-y-3'>
              <div className='flex justify-between items-center border-b pb-2 pt-2'>
                <h3 className='text-sm font-semibold text-muted-foreground'>Danh sách Ghim của kênh</h3>
                <div className='flex gap-2 items-center'>
                  {/* Select Filter */}
                  <Select value={typeFilter} onValueChange={handleTypeChange}>
                    <SelectTrigger className='w-[150px] h-8 text-xs'>
                      <SelectValue placeholder='Lọc bài viết' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>Tất cả</SelectItem>
                      <SelectItem value='image'>Ảnh</SelectItem>
                      <SelectItem value='video'>Video</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Excel Export Button */}
                  <Button
                    onClick={handleExportChannelExcel}
                    disabled={!channelData || !channelData.items || channelData.items.length === 0}
                    className='bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs h-8 px-3 flex items-center gap-1.5 shadow'
                  >
                    <FileSpreadsheet className='h-4 w-4' />
                    Xuất Excel
                  </Button>

                  {/* Zip Images Export Button */}
                  <Button
                    onClick={handleExportChannelImages}
                    disabled={!channelData || !channelData.items || channelData.items.length === 0 || isExportingImages}
                    className='bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs h-8 px-3 flex items-center gap-1.5 shadow'
                  >
                    {isExportingImages ? (
                      <>
                        <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                        Đang tải ZIP...
                      </>
                    ) : (
                      <>
                        <Download className='h-4 w-4' />
                        Tải ảnh ZIP
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Card className='p-4 shadow-lg border-muted/60 overflow-x-auto bg-card/50'>
                <DataTable
                  columns={channelColumns}
                  data={filteredChannelItems}
                  pageSizeOptions={[100, 200]}
                  manualPagination={true}
                  pageCount={Math.ceil((channelData?.pagination?.totalCount || 0) / channelPagination.pageSize)}
                  pagination={channelPagination}
                  onPaginationChange={setChannelPagination}
                />
              </Card>
            </div>
          )}
        </TabsContent>

        {/* BULK VIDEO DOWNLOADER TAB */}
        <TabsContent value='bulk-video' className='space-y-4'>
          <Card className='p-6 shadow-md border-muted/50 bg-card/60 backdrop-blur-sm'>
            <div className='space-y-4'>
              <div>
                <label className='text-sm font-semibold mb-2 block text-foreground'>
                  Nhập danh sách link Pinterest để tải video (Mỗi dòng hoặc dấu cách là một link)
                </label>
                <Textarea
                  value={videoUrlText}
                  onChange={(e) => {
                    setVideoUrlText(e.target.value)
                    setIsVideoFormatted(false)
                  }}
                  placeholder='https://www.pinterest.com/pin/861735709966971659/'
                  className='min-h-[120px] max-h-[250px] font-mono text-sm'
                  disabled={isProcessingVideo}
                />
              </div>

              <div className='flex gap-2'>
                <Button
                  onClick={formatVideoUrls}
                  disabled={isProcessingVideo}
                  variant='outline'
                  className='border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20'
                >
                  Định dạng URL
                </Button>
                <Button
                  onClick={handleGetVideoBulk}
                  disabled={!isVideoFormatted || isProcessingVideo}
                  className='bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow font-medium'
                >
                  {isProcessingVideo ? (
                    <>
                      <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                      Đang xử lý...
                    </>
                  ) : (
                    'Tải Video Hàng Loạt'
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {videoDownloadData.length > 0 && (
            <Card className='p-4 shadow-lg border-muted/60 overflow-x-auto bg-card/50'>
              <DataTable
                columns={videoColumns}
                data={videoDownloadData}
                pageSizeOptions={[50, 100]}
                pagination={videoPagination}
                onPaginationChange={setVideoPagination}
              />
            </Card>
          )}
        </TabsContent>

        {/* BULK AUDIO DOWNLOADER TAB */}
        <TabsContent value='bulk' className='space-y-4'>
          <Card className='p-6 shadow-md border-muted/50 bg-card/60 backdrop-blur-sm'>
            <div className='space-y-4'>
              <div>
                <label className='text-sm font-semibold mb-2 block text-foreground'>
                  Nhập danh sách link Pinterest để tải audio (Mỗi dòng hoặc dấu cách là một link)
                </label>
                <Textarea
                  value={urlText}
                  onChange={(e) => {
                    setUrlText(e.target.value)
                    setIsFormatted(false)
                  }}
                  placeholder='https://www.pinterest.com/pin/861735709966971659/'
                  className='min-h-[120px] max-h-[250px] font-mono text-sm'
                  disabled={isProcessing}
                />
              </div>

              <div className='flex gap-2'>
                <Button
                  onClick={formatUrls}
                  disabled={isProcessing}
                  variant='outline'
                  className='border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20'
                >
                  Định dạng URL
                </Button>
                <Button
                  onClick={handleGetAudioBulk}
                  disabled={!isFormatted || isProcessing}
                  className='bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow font-medium'
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                      Đang xử lý...
                    </>
                  ) : (
                    'Tải Audio Hàng Loạt'
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {audioData.length > 0 && (
            <Card className='p-4 shadow-lg border-muted/60 overflow-x-auto bg-card/50'>
              <DataTable
                columns={columns}
                data={audioData}
                pageSizeOptions={[50, 100]}
                pagination={pagination}
                onPaginationChange={setPagination}
              />
            </Card>
          )}
        </TabsContent>

        {/* BULK IMAGE DOWNLOADER TAB */}
        <TabsContent value='bulk-image' className='space-y-4'>
          <Card className='p-6 shadow-md border-muted/50 bg-card/60 backdrop-blur-sm'>
            <div className='space-y-4'>
              <div>
                <label className='text-sm font-semibold mb-2 block text-foreground'>
                  Nhập danh sách link Pinterest để tải ảnh (Mỗi dòng hoặc dấu cách là một link)
                </label>
                <Textarea
                  value={imageUrlText}
                  onChange={(e) => {
                    setImageUrlText(e.target.value)
                    setIsImageFormatted(false)
                  }}
                  placeholder='https://www.pinterest.com/pin/861735709966971659/'
                  className='min-h-[120px] max-h-[250px] font-mono text-sm'
                  disabled={isProcessingImage}
                />
              </div>

              <div className='flex gap-2'>
                <Button
                  onClick={formatImageUrls}
                  disabled={isProcessingImage}
                  variant='outline'
                  className='border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20'
                >
                  Định dạng URL
                </Button>
                <Button
                  onClick={handleGetImageBulk}
                  disabled={!isImageFormatted || isProcessingImage}
                  className='bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow font-medium'
                >
                  {isProcessingImage ? (
                    <>
                      <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                      Đang xử lý...
                    </>
                  ) : (
                    'Tải Ảnh Hàng Loạt'
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {imageDownloadData.length > 0 && (
            <Card className='p-4 shadow-lg border-muted/60 overflow-x-auto bg-card/50'>
              <DataTable
                columns={imageColumns}
                data={imageDownloadData}
                pageSizeOptions={[50, 100]}
                pagination={imagePagination}
                onPaginationChange={setImagePagination}
              />
            </Card>
          )}
        </TabsContent>

        {/* BULK PIN SCHEDULE TAB */}
        <TabsContent value='schedule' className='space-y-4'>
          <PinterestBulkSchedule />
        </TabsContent>
      </Tabs>
    </div>
  )
}
