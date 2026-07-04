import { DataTable } from '@/components/common/data-table'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { tiktokService } from '@/services/tiktok.service'
import type { ColumnDef } from '@tanstack/react-table'
import { CheckCircle, Clock, ExternalLink, Loader2, XCircle, FileSpreadsheet, Trash2, Film, Music } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

type ProcessStatus = 'idle' | 'pending' | 'loading_audio' | 'loading_video' | 'success_audio' | 'success_video' | 'failed'

interface TikTokVideoItem {
  id: string
  title: string
  url: string
  view_count?: number
  like_count?: number
  created_at?: string
  thumbnails?: Array<{ id: string; url: string }>
  status: ProcessStatus
  progress: number
  error?: string
  audioUrl?: string
  videoUrl?: string
}

export const TikTokChannel = () => {
  const [channelUrl, setChannelUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [videoData, setVideoData] = useState<TikTokVideoItem[]>([])
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null)
  
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 })

  const handleFetchVideos = async () => {
    if (!channelUrl.trim()) {
      toast.error('Vui lòng nhập URL kênh TikTok')
      return
    }

    setIsLoading(true)
    try {
      const response = await tiktokService.getChannelVideos(channelUrl)
      if (response.success && response.videos) {
        const mappedData: TikTokVideoItem[] = response.videos.map((video: any) => ({
          id: video.id,
          title: video.title || video.description || 'TikTok Video',
          url: video.url || `https://www.tiktok.com/@channel/video/${video.id}`,
          view_count: video.view_count,
          like_count: video.like_count,
          created_at: video.created_at,
          thumbnails: video.thumbnails,
          status: 'idle',
          progress: 0
        }))
        
        setVideoData(mappedData.reverse())
        toast.success(`Đã tải danh sách ${response.videos.length} video`)
      } else {
        toast.error(response.error || 'Không thể tải danh sách video của kênh')
      }
    } catch (error) {
      toast.error('Lỗi kết nối khi lấy danh sách video')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} đã được sao chép!`)
    } catch {
      toast.error('Không thể sao chép')
    }
  }

  const formatViewCount = (count: number | null | undefined) => {
    if (count == null) return '-'
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toLocaleString()
  }

  const handleExportExcel = () => {
    if (videoData.length === 0) {
      toast.error('Không có dữ liệu để xuất')
      return
    }

    try {
      const excelData = videoData.map((item, index) => ({
        STT: index + 1,
        'Video ID': item.id,
        URL: item.url,
        'Tiêu đề': item.title,
        'Lượt xem': item.view_count || 0,
        'Lượt thích': item.like_count || 0,
        'Ngày đăng': formatDate(item.created_at)
      }))

      const worksheet = XLSX.utils.json_to_sheet(excelData)

      worksheet['!cols'] = [
        { wch: 5 },  // STT
        { wch: 25 }, // Video ID
        { wch: 50 }, // URL
        { wch: 40 }, // Tiêu đề
        { wch: 15 }, // Lượt xem
        { wch: 15 }, // Lượt thích
        { wch: 20 }  // Ngày đăng
      ]

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'TikTok Channel Videos')

      const fileName = `tiktok-channel-${Date.now()}.xlsx`
      XLSX.writeFile(workbook, fileName)

      toast.success(`Đã xuất ${videoData.length} video ra file Excel`)
    } catch (error) {
      console.error(error)
      toast.error('Không thể xuất file Excel')
    }
  }

  const updateItemStatus = (
    id: string,
    updates: Partial<Omit<TikTokVideoItem, 'id' | 'title' | 'url'>>
  ) => {
    setVideoData((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    )
  }

  const triggerDownload = (downloadUrl: string, title: string, index: number, ext: 'mp3' | 'mp4') => {
    try {
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `${title.replace(/[\\/:*?"<>|]/g, '') || index}.${ext}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('File download failed:', error)
    }
  }

  // Tải lẻ MP3
  const handleDownloadAudio = async (item: TikTokVideoItem, index: number) => {
    if (isProcessing) return

    try {
      updateItemStatus(item.id, { status: 'loading_audio', progress: 15 })
      const response = await tiktokService.getAudio(item.url)
      
      if (response.success && response.audioUrl) {
        updateItemStatus(item.id, {
          status: 'success_audio',
          progress: 100,
          audioUrl: response.audioUrl
        })
        triggerDownload(response.audioUrl, response.title || item.title, index, 'mp3')
        toast.success(`Đã tải xong MP3: ${item.title}`)
      } else {
        updateItemStatus(item.id, {
          status: 'failed',
          progress: 0,
          error: response.error || 'Tải MP3 thất bại'
        })
      }
    } catch (error) {
      updateItemStatus(item.id, {
        status: 'failed',
        progress: 0,
        error: error instanceof Error ? error.message : 'Lỗi không xác định'
      })
    }
  }

  // Tải lẻ MP4
  const handleDownloadVideo = async (item: TikTokVideoItem, index: number) => {
    if (isProcessing) return

    try {
      updateItemStatus(item.id, { status: 'loading_video', progress: 15 })
      const response = await tiktokService.getVideo(item.url)
      
      if (response.success && response.videoUrl) {
        updateItemStatus(item.id, {
          status: 'success_video',
          progress: 100,
          videoUrl: response.videoUrl
        })
        triggerDownload(response.videoUrl, response.title || item.title, index, 'mp4')
        toast.success(`Đã tải xong MP4: ${item.title}`)
      } else {
        updateItemStatus(item.id, {
          status: 'failed',
          progress: 0,
          error: response.error || 'Tải MP4 thất bại'
        })
      }
    } catch (error) {
      updateItemStatus(item.id, {
        status: 'failed',
        progress: 0,
        error: error instanceof Error ? error.message : 'Lỗi không xác định'
      })
    }
  }

  // Chạy tuần tự tải tất cả MP3
  const handleProcessAllAudio = async () => {
    const pendingItems = videoData.filter((item) => item.status === 'idle' || item.status === 'failed')

    if (pendingItems.length === 0) {
      toast.error('Không có video nào cần tải')
      return
    }

    setIsProcessing(true)
    let successCount = 0

    setVideoData(prev => 
      prev.map(item => 
        item.status === 'idle' || item.status === 'failed' 
          ? { ...item, status: 'pending' } 
          : item
      )
    )

    for (let i = 0; i < videoData.length; i++) {
      const item = videoData[i]
      if (item.status !== 'idle' && item.status !== 'failed' && item.status !== 'pending') {
        continue
      }

      const index = i + 1

      try {
        updateItemStatus(item.id, { status: 'loading_audio', progress: 10 })

        const progressInterval = setInterval(() => {
          setVideoData((prev) =>
            prev.map((dataItem) => {
              if (dataItem.id === item.id && dataItem.status === 'loading_audio') {
                const newProgress = Math.min(dataItem.progress + 10, 90)
                return { ...dataItem, progress: newProgress }
              }
              return dataItem
            })
          )
        }, 300)

        const response = await tiktokService.getAudio(item.url)

        clearInterval(progressInterval)

        if (response.success && response.audioUrl) {
          updateItemStatus(item.id, {
            status: 'success_audio',
            progress: 100,
            audioUrl: response.audioUrl
          })
          triggerDownload(response.audioUrl, response.title || item.title, index, 'mp3')
          successCount++
        } else {
          updateItemStatus(item.id, {
            status: 'failed',
            progress: 0,
            error: response.error || 'Server error'
          })
        }
      } catch (error) {
        updateItemStatus(item.id, {
          status: 'failed',
          progress: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    setIsProcessing(false)
    toast.success(`Đã hoàn thành: Tải thành công ${successCount}/${pendingItems.length} MP3`)
  }

  const handleDelete = (id: string) => {
    setVideoToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (videoToDelete) {
      setVideoData((prev) => prev.filter((item) => item.id !== videoToDelete))
      toast.success('Đã xóa video')
      setDeleteDialogOpen(false)
      setVideoToDelete(null)
    }
  }

  const cancelDelete = () => {
    setDeleteDialogOpen(false)
    setVideoToDelete(null)
  }

  const getThumbnailUrl = (item: TikTokVideoItem) => {
    if (item.thumbnails && item.thumbnails.length > 0) {
      const cover = item.thumbnails.find(t => t.id === 'cover' || t.id === 'originCover')
      return cover ? cover.url : item.thumbnails[0].url
    }
    return ''
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return `${day}/${month}/${year} ${hours}:${minutes}`
    } catch {
      return dateString
    }
  }

  const renderStatus = (item: TikTokVideoItem) => {
    switch (item.status) {
      case 'idle':
        return <span className='text-gray-400 text-sm font-medium'>Sẵn sàng</span>
      case 'pending':
        return (
          <div className='flex items-center gap-1.5 text-gray-500'>
            <Clock className='h-3.5 w-3.5 animate-pulse' />
            <span className='text-sm'>Đang chờ</span>
          </div>
        )
      case 'loading_audio':
        return (
          <div className='space-y-1 min-w-[120px]'>
            <div className='flex items-center gap-1.5 text-cyan-500 text-xs font-semibold'>
              <Loader2 className='h-3 w-3 animate-spin' />
              <span>Tải MP3... {item.progress}%</span>
            </div>
            <Progress value={item.progress} className='h-1.5 bg-cyan-950' />
          </div>
        )
      case 'loading_video':
        return (
          <div className='space-y-1 min-w-[120px]'>
            <div className='flex items-center gap-1.5 text-pink-500 text-xs font-semibold'>
              <Loader2 className='h-3 w-3 animate-spin' />
              <span>Tải MP4... {item.progress}%</span>
            </div>
            <Progress value={item.progress} className='h-1.5 bg-pink-950' />
          </div>
        )
      case 'success_audio':
        return (
          <div className='flex items-center gap-1.5 text-cyan-400 text-sm font-semibold'>
            <CheckCircle className='h-3.5 w-3.5' />
            <span>Đã tải MP3</span>
          </div>
        )
      case 'success_video':
        return (
          <div className='flex items-center gap-1.5 text-pink-400 text-sm font-semibold'>
            <CheckCircle className='h-3.5 w-3.5' />
            <span>Đã tải MP4</span>
          </div>
        )
      case 'failed':
        return (
          <div className='flex items-center gap-1.5 text-rose-500 text-sm font-semibold' title={item.error}>
            <XCircle className='h-3.5 w-3.5' />
            <span>Lỗi</span>
          </div>
        )
    }
  }

  const columns: ColumnDef<TikTokVideoItem>[] = [
    {
      id: 'index',
      header: 'STT',
      cell: ({ row }) => {
        const index = row.index + 1 + pagination.pageIndex * pagination.pageSize
        return <div className='font-medium text-slate-300'>{index}</div>
      },
      size: 50
    },
    {
      id: 'thumbnail',
      header: 'Ảnh bìa',
      cell: ({ row }) => {
        const url = getThumbnailUrl(row.original)
        return url ? (
          <img
            src={url}
            alt='Cover'
            className='w-12 h-16 object-cover rounded-md border border-zinc-800 shadow-md'
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div className='w-12 h-16 bg-zinc-900 rounded-md border border-zinc-800 flex items-center justify-center text-xs text-zinc-500'>
            Không ảnh
          </div>
        )
      },
      size: 70
    },
    {
      accessorKey: 'id',
      header: 'Video ID',
      cell: ({ row }) => (
        <div className='font-mono text-xs max-w-[120px] truncate text-slate-400' title={row.original.id}>
          {row.original.id}
        </div>
      ),
      size: 130
    },
    {
      accessorKey: 'title',
      header: 'Tiêu đề',
      cell: ({ row }) => {
        const title = row.original.title
        return (
          <div
            className='max-w-md cursor-pointer hover:text-cyan-400 transition-colors font-medium text-slate-200 line-clamp-2'
            title={`${title}\n\nClick để sao chép`}
            onClick={() => copyToClipboard(title, 'Tiêu đề')}
          >
            {title}
          </div>
        )
      }
    },
    {
      accessorKey: 'view_count',
      header: 'Lượt xem',
      cell: ({ row }) => (
        <div className='text-right font-medium text-slate-300'>
          {formatViewCount(row.original.view_count)}
        </div>
      ),
      size: 100
    },
    {
      accessorKey: 'like_count',
      header: 'Lượt thích',
      cell: ({ row }) => (
        <div className='text-right font-medium text-slate-300'>
          {formatViewCount(row.original.like_count)}
        </div>
      ),
      size: 100
    },
    {
      accessorKey: 'created_at',
      header: 'Ngày đăng',
      cell: ({ row }) => (
        <div className='text-slate-400 font-medium text-sm'>
          {formatDate(row.original.created_at)}
        </div>
      ),
      size: 140
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => renderStatus(row.original),
      size: 140
    },
    {
      id: 'actions',
      header: 'Thao tác',
      cell: ({ row }) => {
        const data = row.original
        return (
          <div className='flex items-center gap-1.5'>
            <Button
              variant='outline'
              size='sm'
              disabled={isProcessing || data.status.startsWith('loading')}
              onClick={() => handleDownloadAudio(data, row.index + 1)}
              className='h-8 px-2 border-cyan-800 text-cyan-400 hover:bg-cyan-950/30 hover:text-cyan-300 font-medium'
            >
              <Music className='h-3.5 w-3.5 mr-1' />
              MP3
            </Button>
            <Button
              variant='outline'
              size='sm'
              disabled={isProcessing || data.status.startsWith('loading')}
              onClick={() => handleDownloadVideo(data, row.index + 1)}
              className='h-8 px-2 border-pink-800 text-pink-400 hover:bg-pink-950/30 hover:text-pink-300 font-medium'
            >
              <Film className='h-3.5 w-3.5 mr-1' />
              MP4
            </Button>
            <a
              href={data.url}
              target='_blank'
              rel='noopener noreferrer'
              className='h-8 w-8 inline-flex items-center justify-center rounded-md border border-zinc-800 text-slate-400 hover:bg-zinc-900 hover:text-cyan-400 transition-colors'
              title='Xem trên TikTok'
            >
              <ExternalLink className='h-3.5 w-3.5' />
            </a>
            <Button
              variant='ghost'
              size='sm'
              disabled={isProcessing}
              onClick={() => handleDelete(data.id)}
              className='h-8 w-8 p-0 text-rose-500 hover:bg-rose-950/20'
            >
              <Trash2 className='h-3.5 w-3.5' />
            </Button>
          </div>
        )
      }
    }
  ]

  return (
    <div className='container mx-auto p-4 max-w-6xl space-y-6 dark text-slate-100'>
      {/* Header Banner - TikTok Themed */}
      <Card className='p-0 overflow-hidden border-zinc-800 shadow-2xl bg-zinc-950/80 backdrop-blur-md'>
        <div className='bg-gradient-to-r from-[#00f2fe] via-black to-[#fe0979] px-6 py-5 shadow-lg relative border-b border-zinc-800'>
          {/* Overlay to give a premium feel */}
          <div className='absolute inset-0 bg-black/10 mix-blend-overlay' />
          
          <div className='flex items-center gap-3 relative z-10'>
            <div className='bg-black/30 backdrop-blur-md rounded-xl p-2.5 border border-white/10'>
              <svg viewBox="0 0 24 24" fill="currentColor" className='h-6 w-6 text-white'>
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.63 4.14 1.02 1.11 2.45 1.8 3.97 1.93v3.86c-1.39-.08-2.77-.57-3.92-1.37a8.03 8.03 0 01-2.43-2.6v7.35c.03 1.54-.36 3.09-1.12 4.43-.8 1.42-2 2.58-3.46 3.3-1.52.76-3.25.99-4.9.68-1.63-.3-3.15-1.2-4.22-2.48a8.3 8.3 0 01-1.74-4.52c-.11-1.65.25-3.32 1.05-4.76.81-1.45 2.06-2.61 3.56-3.3 1.25-.57 2.63-.78 3.98-.62V8.2c-1.02-.15-2.07.03-3 .52a4.42 4.42 0 00-2.22 2.5 4.38 4.38 0 00.32 3.65c.67.99 1.76 1.64 2.94 1.77 1.2.14 2.44-.2 3.34-1 .85-.75 1.34-1.85 1.36-2.98V.02z" />
              </svg>
            </div>
            <div>
              <h2 className='text-xl font-extrabold text-white tracking-wide'>LẤY THÔNG TIN KÊNH TIKTOK</h2>
              <p className='text-slate-200/80 text-sm font-medium mt-0.5'>
                Quét toàn bộ danh sách video của Kênh TikTok, xem thống kê tương tác, xuất Excel và tải âm thanh/video.
              </p>
            </div>
          </div>
        </div>

        {/* Input Controls */}
        <div className='p-6 space-y-4 bg-zinc-950/40'>
          <div>
            <label className='text-sm font-semibold mb-2 block text-slate-300'>
              Link Kênh TikTok
            </label>
            <Input
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              placeholder='Ví dụ: https://www.tiktok.com/@gospelglow8'
              disabled={isLoading || isProcessing}
              className='bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
            />
          </div>

          <div className='flex flex-wrap gap-2.5 pt-2'>
            <Button 
              onClick={handleFetchVideos} 
              disabled={isLoading || isProcessing}
              className='bg-white text-black hover:bg-zinc-200 font-bold border-0 shadow-md'
            >
              {isLoading ? (
                <>
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                  Đang quét...
                </>
              ) : (
                'Quét danh sách video'
              )}
            </Button>
            
            {videoData.length > 0 && (
              <>
                <Button
                  onClick={handleProcessAllAudio}
                  disabled={isProcessing || isLoading}
                  className='bg-cyan-500 hover:bg-cyan-600 text-black font-bold shadow-md shadow-cyan-950/20'
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                      Đang tải lần lượt...
                    </>
                  ) : (
                    'Tải tất cả MP3 (Lần lượt)'
                  )}
                </Button>
                <Button
                  variant='outline'
                  onClick={handleExportExcel}
                  disabled={isProcessing || isLoading}
                  className='border-zinc-800 bg-zinc-900 text-slate-300 hover:bg-zinc-800 font-medium'
                >
                  <FileSpreadsheet className='h-4 w-4 mr-2 text-emerald-500' />
                  Xuất file Excel
                </Button>
                <Button
                  variant='ghost'
                  onClick={() => {
                    setVideoData([])
                    setChannelUrl('')
                  }}
                  disabled={isProcessing || isLoading}
                  className='text-zinc-500 hover:text-zinc-300 font-medium'
                >
                  Xóa kết quả
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Video DataTable Card */}
      {videoData.length > 0 && (
        <Card className='p-6 border-zinc-800 shadow-2xl bg-zinc-950/80 backdrop-blur-md'>
          <div className='flex justify-between items-center mb-4 border-b border-zinc-800 pb-3'>
            <h3 className='text-lg font-bold text-slate-100 flex items-center gap-2'>
              <span className='w-2.5 h-2.5 rounded-full bg-[#00f2fe] animate-pulse' />
              Tìm thấy {videoData.length} video của kênh
            </h3>
          </div>
          <DataTable
            columns={columns}
            data={videoData}
            pageSizeOptions={[50, 100]}
            pagination={pagination}
            onPaginationChange={setPagination}
          />
        </Card>
      )}

      {/* Delete Item Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className='bg-zinc-900 border-zinc-800 text-white'>
          <DialogHeader>
            <DialogTitle>Xóa khỏi danh sách</DialogTitle>
            <DialogDescription className='text-zinc-400'>
              Bạn có chắc chắn muốn xóa video này khỏi danh sách xử lý?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={cancelDelete} className='border-zinc-800 hover:bg-zinc-800 text-slate-300'>
              Huỷ
            </Button>
            <Button variant='destructive' onClick={confirmDelete} className='bg-rose-600 hover:bg-rose-700 text-white'>
              Xoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
