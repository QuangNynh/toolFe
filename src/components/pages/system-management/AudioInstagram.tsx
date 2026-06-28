import { DataTable } from '@/components/common/data-table'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { instagramService, type InstagramInfoResponse } from '@/services/instagram.service'
import type { ColumnDef } from '@tanstack/react-table'
import * as XLSX from 'xlsx'
import {
  CheckCircle,
  Clock,
  ExternalLink,
  Loader2,
  XCircle,
  Instagram,
  Download,
  Heart,
  Eye,
  BadgeCheck,
  Video,
  ListRestart,
  Copy,
  FileText,
  FileSpreadsheet
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

type AudioStatus = 'pending' | 'loading' | 'success' | 'failed'

interface AudioDataItem {
  videoUrl: string
  status: AudioStatus
  progress: number
  audioUrl?: string
  title?: string
  error?: string
}

interface BulkInfoItem {
  videoUrl: string
  status: AudioStatus
  progress: number
  title?: string
  username?: string
  fullname?: string
  likes?: number
  isVerified?: boolean
  thumbnailUrl?: string
  views?: number
  error?: string
  downloading?: boolean
  downloadProgress?: number
}

export const AudioInstagram = () => {
  // Tab 2: Bulk Download state
  const [urlText, setUrlText] = useState('')
  const [isFormatted, setIsFormatted] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [audioData, setAudioData] = useState<AudioDataItem[]>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 })

  // Tab 3: Bulk Info state
  const [bulkInfoUrlText, setBulkInfoUrlText] = useState('')
  const [isBulkInfoFormatted, setIsBulkInfoFormatted] = useState(false)
  const [isProcessingInfo, setIsProcessingInfo] = useState(false)
  const [bulkInfoData, setBulkInfoData] = useState<BulkInfoItem[]>([])
  const [infoPagination, setInfoPagination] = useState({ pageIndex: 0, pageSize: 50 })

  // Tab 4: Bulk Video Download state
  const [videoUrlText, setVideoUrlText] = useState('')
  const [isVideoFormatted, setIsVideoFormatted] = useState(false)
  const [isProcessingVideo, setIsProcessingVideo] = useState(false)
  const [videoDownloadData, setVideoDownloadData] = useState<AudioDataItem[]>([])
  const [videoPagination, setVideoPagination] = useState({ pageIndex: 0, pageSize: 50 })

  const formatUrls = () => {
    if (!urlText.trim()) {
      toast.error('Please enter URLs')
      return
    }

    const urls = urlText
      .split(/[\s,\n\t]+/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0)

    const formattedUrls = urls.join(', ')
    setUrlText(formattedUrls)
    setIsFormatted(true)
    toast.success('URLs formatted successfully')
  }

  const formatBulkInfoUrls = () => {
    if (!bulkInfoUrlText.trim()) {
      toast.error('Vui lòng nhập danh sách URLs')
      return
    }

    const urls = bulkInfoUrlText
      .split(/[\s,\n\t]+/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0)

    const formattedUrls = urls.join(', ')
    setBulkInfoUrlText(formattedUrls)
    setIsBulkInfoFormatted(true)
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

  const downloadAudioFile = (audioUrl: string, filename: string, blob?: Blob) => {
    try {
      const link = document.createElement('a')
      link.href = audioUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setTimeout(() => {
        if (blob) {
          URL.revokeObjectURL(audioUrl)
        }
      }, 100)
    } catch (error) {
      console.error('Download failed:', error)
      toast.error('Failed to download audio file')
    }
  }

  const handleGetAudioBulk = async () => {
    if (!urlText.trim()) {
      toast.error('Please enter URLs')
      return
    }

    if (!isFormatted) {
      toast.error('Please format URLs first')
      return
    }

    const urls = urlText
      .split(/[\s,\n\t]+/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0)

    if (urls.length === 0) {
      toast.error('No valid Instagram URLs/Shortcodes found')
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

        const response = await instagramService.getAudio(url)
        clearInterval(progressInterval)

        if (response.success && response.audioUrl) {
          updateItemStatus(url, {
            status: 'success',
            progress: 100,
            audioUrl: response.audioUrl,
            title: response.title || `Instagram Audio ${index}`
          })

          const filename = `instagram_audio_${index}_${Date.now()}.mp3`
          downloadAudioFile(response.audioUrl, filename, response.blob)
          successCount++
          toast.success(`Downloaded: ${filename}`)
        } else {
          updateItemStatus(url, {
            status: 'failed',
            progress: 0,
            error: response.error || 'Unknown error'
          })
        }
      } catch (error) {
        updateItemStatus(url, {
          status: 'failed',
          progress: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    setIsProcessing(false)
    toast.success(`Completed: ${successCount}/${urls.length} audio files downloaded`)
  }

  const formatVideoUrls = () => {
    if (!videoUrlText.trim()) {
      toast.error('Please enter URLs')
      return
    }

    const urls = videoUrlText
      .split(/[\s,\n\t]+/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0)

    const formattedUrls = urls.join(', ')
    setVideoUrlText(formattedUrls)
    setIsVideoFormatted(true)
    toast.success('URLs formatted successfully')
  }

  const handleGetVideoBulk = async () => {
    if (!videoUrlText.trim()) {
      toast.error('Please enter URLs')
      return
    }

    if (!isVideoFormatted) {
      toast.error('Please format URLs first')
      return
    }

    const urls = videoUrlText
      .split(/[\s,\n\t]+/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0)

    if (urls.length === 0) {
      toast.error('No valid Instagram URLs/Shortcodes found')
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

        const response = await instagramService.getVideo(url)
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
                    title: response.title || `Instagram Video ${index}`
                  }
                : item
            )
          )

          const filename = `instagram_video_${index}_${Date.now()}.mp4`
          downloadAudioFile(response.videoUrl, filename, response.blob)
          successCount++
          toast.success(`Downloaded: ${filename}`)
        } else {
          setVideoDownloadData((prev) =>
            prev.map((item) =>
              item.videoUrl === url
                ? { ...item, status: 'failed', progress: 0, error: response.error || 'Unknown error' }
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
                  error: error instanceof Error ? error.message : 'Unknown error'
                }
              : item
          )
        )
      }
    }

    setIsProcessingVideo(false)
    toast.success(`Completed: ${successCount}/${urls.length} video files downloaded`)
  }

  const handleGetInfoBulk = async () => {
    if (!bulkInfoUrlText.trim()) {
      toast.error('Vui lòng nhập danh sách URLs')
      return
    }

    if (!isBulkInfoFormatted) {
      toast.error('Vui lòng định dạng URLs trước')
      return
    }

    const urls = bulkInfoUrlText
      .split(/[\s,\n\t]+/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0)

    if (urls.length === 0) {
      toast.error('Không tìm thấy Instagram URLs/Shortcodes nào hợp lệ')
      return
    }

    const initialData: BulkInfoItem[] = urls.map((url) => ({
      videoUrl: url,
      status: 'pending',
      progress: 0
    }))
    setBulkInfoData(initialData)
    setIsProcessingInfo(true)

    let successCount = 0

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]

      try {
        setBulkInfoData((prev) =>
          prev.map((item) => (item.videoUrl === url ? { ...item, status: 'loading' } : item))
        )

        const data = await instagramService.getInfo(url)

        if (data.success) {
          setBulkInfoData((prev) =>
            prev.map((item) =>
              item.videoUrl === url
                ? {
                  ...item,
                  status: 'success',
                  title: data.title,
                  username: data.username,
                  fullname: data.fullname,
                  likes: data.likes,
                  isVerified: data.isVerified,
                  thumbnailUrl: data.thumbnailUrl,
                  views: data.views
                }
                : item
            )
          )
          successCount++
        } else {
          setBulkInfoData((prev) =>
            prev.map((item) =>
              item.videoUrl === url
                ? { ...item, status: 'failed', error: item.error || 'Failed to fetch info' }
                : item
            )
          )
        }
      } catch (error) {
        setBulkInfoData((prev) =>
          prev.map((item) =>
            item.videoUrl === url
              ? {
                ...item,
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error'
              }
              : item
          )
        )
      }
    }

    setIsProcessingInfo(false)
    toast.success(`Hoàn thành: Lấy thành công thông tin ${successCount}/${urls.length} links`)
  }

  const handleExportTxt = () => {
    const successItems = bulkInfoData.filter((item) => item.status === 'success')
    if (successItems.length === 0) {
      toast.error('Không có thông tin thành công để xuất file')
      return
    }

    let txtContent = ''
    successItems.forEach((item, index) => {
      const url = item.videoUrl.startsWith('http')
        ? item.videoUrl
        : `https://www.instagram.com/p/${item.videoUrl}`
      const caption = item.title || ''
      txtContent += `${index + 1}.\n${url}\n\n${caption}\n\n\n\n`
    })

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `instagram_metadata_${Date.now()}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success('Đã xuất file .txt thành công!')
  }

  const handleExportExcel = () => {
    const successItems = bulkInfoData.filter((item) => item.status === 'success')
    if (successItems.length === 0) {
      toast.error('Không có thông tin thành công để xuất file')
      return
    }

    try {
      const excelData = successItems.map((item, index) => {
        const url = item.videoUrl.startsWith('http')
          ? item.videoUrl
          : `https://www.instagram.com/p/${item.videoUrl}`
        return {
          STT: index + 1,
          'Link Video': url,
          'Lượt xem': item.views ?? 0
        }
      })

      const worksheet = XLSX.utils.json_to_sheet(excelData)
      worksheet['!cols'] = [
        { wch: 8 },   // STT
        { wch: 65 },  // Link Video
        { wch: 15 }   // Lượt xem
      ]

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Instagram Metadata')

      const fileName = `instagram_metadata_${Date.now()}.xlsx`
      XLSX.writeFile(workbook, fileName)

      toast.success('Đã xuất file Excel thành công!')
    } catch (error) {
      console.error(error)
      toast.error('Không thể xuất file Excel')
    }
  }

  const handleDownloadRow = async (url: string, username: string) => {
    setBulkInfoData((prev) =>
      prev.map((item) =>
        item.videoUrl === url
          ? { ...item, downloading: true, downloadProgress: 10 }
          : item
      )
    )

    const progressInterval = setInterval(() => {
      setBulkInfoData((prev) =>
        prev.map((item) => {
          if (item.videoUrl === url && item.downloading) {
            const nextProgress = Math.min((item.downloadProgress || 0) + 15, 90)
            return { ...item, downloadProgress: nextProgress }
          }
          return item
        })
      )
    }, 300)

    try {
      const response = await instagramService.getAudio(url)
      clearInterval(progressInterval)

      if (response.success && response.audioUrl) {
        setBulkInfoData((prev) =>
          prev.map((item) =>
            item.videoUrl === url
              ? { ...item, downloading: false, downloadProgress: 100 }
              : item
          )
        )
        const filename = `${username}_${Date.now()}.mp3`
        downloadAudioFile(response.audioUrl, filename, response.blob)
        toast.success(`Đã tải audio: ${filename}`)
      } else {
        toast.error(response.error || 'Failed to download audio')
        setBulkInfoData((prev) =>
          prev.map((item) =>
            item.videoUrl === url
              ? { ...item, downloading: false, downloadProgress: 0 }
              : item
          )
        )
      }
    } catch (error) {
      clearInterval(progressInterval)
      toast.error(error instanceof Error ? error.message : 'Download failed')
      setBulkInfoData((prev) =>
        prev.map((item) =>
          item.videoUrl === url
            ? { ...item, downloading: false, downloadProgress: 0 }
            : item
        )
      )
    }
  }

  const renderStatus = (item: AudioDataItem) => {
    switch (item.status) {
      case 'pending':
        return (
          <div className='flex items-center gap-2 text-gray-500'>
            <Clock className='h-4 w-4' />
            <span>Pending</span>
          </div>
        )
      case 'loading':
        return (
          <div className='space-y-2 min-w-[150px]'>
            <div className='flex items-center gap-2 text-pink-600'>
              <Loader2 className='h-4 w-4 animate-spin' />
              <span>Loading... {item.progress}%</span>
            </div>
            <Progress value={item.progress} className='h-1.5' />
          </div>
        )
      case 'success':
        return (
          <div className='flex items-center gap-2 text-green-600 font-medium'>
            <CheckCircle className='h-4 w-4' />
            <span>Success</span>
          </div>
        )
      case 'failed':
        return (
          <div className='flex items-center gap-2 text-red-600 font-medium'>
            <XCircle className='h-4 w-4' />
            <span>Failed</span>
          </div>
        )
    }
  }

  const columns: ColumnDef<AudioDataItem>[] = [
    {
      id: 'index',
      header: 'No.',
      cell: ({ row }) => {
        const index = row.index + 1 + pagination.pageIndex * pagination.pageSize
        return <div className='font-medium'>{index}</div>
      },
      size: 60
    },
    {
      accessorKey: 'videoUrl',
      header: 'URL / Shortcode',
      cell: ({ row }) => (
        <a
          href={row.original.videoUrl.startsWith('http') ? row.original.videoUrl : `https://www.instagram.com/p/${row.original.videoUrl}`}
          target='_blank'
          rel='noopener noreferrer'
          className='text-pink-600 hover:underline flex items-center gap-1 font-mono text-xs'
        >
          <span className='max-w-xs truncate'>{row.original.videoUrl}</span>
          <ExternalLink className='h-3 w-3' />
        </a>
      )
    },
    {
      accessorKey: 'status',
      header: 'Processing Status',
      cell: ({ row }) => renderStatus(row.original)
    },
    {
      accessorKey: 'title',
      header: 'FileName',
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
      header: 'Error Detail',
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

  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return '-'
    return new Intl.NumberFormat().format(num)
  }

  const videoColumns: ColumnDef<AudioDataItem>[] = [
    {
      id: 'index',
      header: 'No.',
      cell: ({ row }) => {
        const index = row.index + 1 + videoPagination.pageIndex * videoPagination.pageSize
        return <div className='font-medium'>{index}</div>
      },
      size: 60
    },
    {
      accessorKey: 'videoUrl',
      header: 'URL / Shortcode',
      cell: ({ row }) => (
        <a
          href={row.original.videoUrl.startsWith('http') ? row.original.videoUrl : `https://www.instagram.com/p/${row.original.videoUrl}`}
          target='_blank'
          rel='noopener noreferrer'
          className='text-pink-600 hover:underline flex items-center gap-1 font-mono text-xs'
        >
          <span className='max-w-xs truncate'>{row.original.videoUrl}</span>
          <ExternalLink className='h-3 w-3' />
        </a>
      )
    },
    {
      accessorKey: 'status',
      header: 'Processing Status',
      cell: ({ row }) => renderStatus(row.original)
    },
    {
      accessorKey: 'title',
      header: 'FileName',
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
      header: 'Error Detail',
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

  const infoColumns: ColumnDef<BulkInfoItem>[] = [
    {
      id: 'index',
      header: 'No.',
      cell: ({ row }) => {
        const index = row.index + 1 + infoPagination.pageIndex * infoPagination.pageSize
        return <div className='font-medium'>{index}</div>
      },
      size: 50
    },
    {
      accessorKey: 'videoUrl',
      header: 'URL / Shortcode',
      cell: ({ row }) => (
        <a
          href={row.original.videoUrl.startsWith('http') ? row.original.videoUrl : `https://www.instagram.com/p/${row.original.videoUrl}`}
          target='_blank'
          rel='noopener noreferrer'
          className='text-pink-600 hover:underline flex items-center gap-1 font-mono text-xs'
        >
          <span className='max-w-[150px] truncate'>{row.original.videoUrl}</span>
          <ExternalLink className='h-3 w-3' />
        </a>
      )
    },
    {
      accessorKey: 'username',
      header: 'Kênh',
      cell: ({ row }) => {
        if (!row.original.username) return '-'
        return (
          <div className='flex flex-col'>
            <div className='flex items-center gap-1 font-semibold text-xs text-foreground'>
              <span>{row.original.fullname || row.original.username}</span>
              {row.original.isVerified && (
                <BadgeCheck className='h-3.5 w-3.5 fill-sky-500 text-white dark:text-background' />
              )}
            </div>
            <span className='text-[10px] text-muted-foreground'>@{row.original.username}</span>
          </div>
        )
      }
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => {
        const item = row.original
        switch (item.status) {
          case 'pending':
            return <span className='text-xs text-muted-foreground'>Chờ...</span>
          case 'loading':
            return (
              <div className='flex items-center gap-1.5 text-xs text-pink-600 font-medium'>
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                <span>Đang lấy...</span>
              </div>
            )
          case 'success':
            return <span className='text-xs text-green-600 font-medium'>Thành công</span>
          case 'failed':
            return (
              <span className='text-xs text-red-600 font-medium' title={item.error}>
                Lỗi
              </span>
            )
        }
      }
    },
    {
      accessorKey: 'title',
      header: 'Tiêu đề / Caption',
      cell: ({ row }) => {
        const title = row.original.title
        if (!title) return '-'
        return (
          <div className='flex items-center gap-1.5 max-w-xs group/caption'>
            <span className='truncate text-xs font-normal' title={title}>
              {title}
            </span>
            <Button
              size='icon'
              variant='ghost'
              className='h-6 w-6 opacity-0 group-hover/caption:opacity-100 transition-opacity shrink-0'
              onClick={() => {
                navigator.clipboard.writeText(title)
                toast.success('Đã sao chép tiêu đề!')
              }}
              title='Sao chép tiêu đề'
            >
              <Copy className='h-3 w-3 text-muted-foreground hover:text-pink-600' />
            </Button>
          </div>
        )
      }
    },
    {
      accessorKey: 'likes',
      header: 'Thích',
      cell: ({ row }) => formatNumber(row.original.likes)
    },
    {
      accessorKey: 'views',
      header: 'Lượt xem',
      cell: ({ row }) => formatNumber(row.original.views)
    },

    {
      id: 'actions',
      header: 'Tải Audio',
      cell: ({ row }) => {
        const item = row.original
        if (item.status !== 'success') return '-'
        return (
          <div className='flex items-center gap-2'>
            {item.downloading ? (
              <div className='flex items-center gap-1 text-[11px] text-pink-600 font-medium'>
                <Loader2 className='h-3 w-3 animate-spin' />
                <span>{item.downloadProgress}%</span>
              </div>
            ) : (
              <Button
                size='sm'
                variant='outline'
                className='h-7 px-2 text-xs border-pink-500/20 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/20'
                onClick={() => handleDownloadRow(item.videoUrl, item.username || 'instagram')}
              >
                <Download className='h-3.5 w-3.5 mr-1' />
                Tải MP3
              </Button>
            )}
          </div>
        )
      }
    }
  ]

  return (
    <div className='space-y-6 mx-auto'>
      <div className='flex items-center gap-3 border-b pb-4'>
        <div className='p-2 bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 rounded-lg text-white shadow-md'>
          <Instagram className='h-6 w-6' />
        </div>
        <div>
          <h1 className='text-2xl font-bold tracking-tight bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent'>
            Instagram Downloader
          </h1>
          <p className='text-muted-foreground text-sm'>
            Tải audio và video chất lượng cao từ Instagram Reels và Posts thông qua URL hoặc Shortcode.
          </p>
        </div>
      </div>

      <Tabs defaultValue='bulk-info' className='w-full'>
        <TabsList className='grid w-full grid-cols-3 max-w-[600px] mb-4'>
          <TabsTrigger value='bulk-info' className='flex items-center gap-1.5'>
            <Instagram className='h-4 w-4' />
            Lấy thông tin hàng loạt
          </TabsTrigger>
          <TabsTrigger value='bulk-video' className='flex items-center gap-1.5'>
            <Video className='h-4 w-4' />
            Tải video hàng loạt
          </TabsTrigger>
          <TabsTrigger value='bulk' className='flex items-center gap-1.5'>
            <ListRestart className='h-4 w-4' />
            Tải audio hàng loạt
          </TabsTrigger>
        </TabsList>

        {/* BULK METADATA INFO TAB */}
        <TabsContent value='bulk-info' className='space-y-4'>
          <Card className='p-6 shadow-md border-muted/50 bg-card/60 backdrop-blur-sm'>
            <div className='space-y-4'>
              <div>
                <label className='text-sm font-semibold mb-2 block text-foreground'>
                  Nhập danh sách link Instagram để lấy thông tin chi tiết (Mỗi dòng hoặc dấu cách là một link)
                </label>
                <Textarea
                  value={bulkInfoUrlText}
                  onChange={(e) => {
                    setBulkInfoUrlText(e.target.value)
                    setIsBulkInfoFormatted(false)
                  }}
                  placeholder='https://www.instagram.com/reel/DZw9jWVhz5U/&#10;DZuYteMhr4j'
                  className='min-h-[120px] max-h-[250px] font-mono text-sm'
                  disabled={isProcessingInfo}
                />
              </div>

              <div className='flex gap-2'>
                <Button
                  onClick={formatBulkInfoUrls}
                  disabled={isProcessingInfo}
                  variant='outline'
                  className='border-pink-500/30 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/20'
                >
                  Định dạng URL
                </Button>
                <Button
                  onClick={handleGetInfoBulk}
                  disabled={!isBulkInfoFormatted || isProcessingInfo}
                  className='bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow font-medium'
                >
                  {isProcessingInfo ? (
                    <>
                      <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                      Đang lấy thông tin...
                    </>
                  ) : (
                    'Lấy thông tin hàng loạt'
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {bulkInfoData.length > 0 && (
            <div className='space-y-3'>
              <div className='flex justify-between items-center'>
                <h3 className='text-sm font-semibold text-muted-foreground'>
                  Kết quả ({bulkInfoData.filter((i) => i.status === 'success').length}/{bulkInfoData.length})
                </h3>
                {bulkInfoData.some((i) => i.status === 'success') && (
                  <div className='flex gap-2'>
                    <Button
                      onClick={handleExportTxt}
                      className='bg-zinc-600 hover:bg-zinc-700 text-white text-xs h-9 px-3 flex items-center gap-1.5 shadow'
                    >
                      <FileText className='h-4 w-4' />
                      Xuất file .txt
                    </Button>
                    <Button
                      onClick={handleExportExcel}
                      className='bg-green-600 hover:bg-green-700 text-white text-xs h-9 px-3 flex items-center gap-1.5 shadow'
                    >
                      <FileSpreadsheet className='h-4 w-4' />
                      Xuất file Excel
                    </Button>
                  </div>
                )}
              </div>
              <Card className='p-4 shadow-lg border-muted/60 overflow-x-auto bg-card/50'>
                <DataTable
                  columns={infoColumns}
                  data={bulkInfoData}
                  pageSizeOptions={[50, 100]}
                  pagination={infoPagination}
                  onPaginationChange={setInfoPagination}
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
                  Nhập danh sách link Instagram để tải video (Mỗi dòng hoặc dấu cách là một link)
                </label>
                <Textarea
                  value={videoUrlText}
                  onChange={(e) => {
                    setVideoUrlText(e.target.value)
                    setIsVideoFormatted(false)
                  }}
                  placeholder='https://www.instagram.com/reel/DZw9jWVhz5U/&#10;DZuYteMhr4j'
                  className='min-h-[120px] max-h-[250px] font-mono text-sm'
                  disabled={isProcessingVideo}
                />
              </div>

              <div className='flex gap-2'>
                <Button
                  onClick={formatVideoUrls}
                  disabled={isProcessingVideo}
                  variant='outline'
                  className='border-pink-500/30 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/20'
                >
                  Định dạng URL
                </Button>
                <Button
                  onClick={handleGetVideoBulk}
                  disabled={!isVideoFormatted || isProcessingVideo}
                  className='bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow font-medium'
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

        {/* BULK DOWNLOADER TAB */}
        <TabsContent value='bulk' className='space-y-4'>
          <Card className='p-6 shadow-md border-muted/50 bg-card/60 backdrop-blur-sm'>
            <div className='space-y-4'>
              <div>
                <label className='text-sm font-semibold mb-2 block text-foreground'>
                  Nhập danh sách link Instagram (Mỗi dòng hoặc dấu cách là một link)
                </label>
                <Textarea
                  value={urlText}
                  onChange={(e) => {
                    setUrlText(e.target.value)
                    setIsFormatted(false)
                  }}
                  placeholder='https://www.instagram.com/reel/DZw9jWVhz5U/&#10;DZuYteMhr4j'
                  className='min-h-[120px] max-h-[250px] font-mono text-sm'
                  disabled={isProcessing}
                />
              </div>

              <div className='flex gap-2'>
                <Button
                  onClick={formatUrls}
                  disabled={isProcessing}
                  variant='outline'
                  className='border-pink-500/30 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/20'
                >
                  Định dạng URL
                </Button>
                <Button
                  onClick={handleGetAudioBulk}
                  disabled={!isFormatted || isProcessing}
                  className='bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow font-medium'
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
      </Tabs>
    </div>
  )
}
