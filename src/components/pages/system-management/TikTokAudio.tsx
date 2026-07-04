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
import { CheckCircle, Clock, ExternalLink, Loader2, XCircle, Download, FileSpreadsheet, Music, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

type AudioStatus = 'idle' | 'pending' | 'loading' | 'success' | 'failed'

interface TikTokAudioItem {
  id: string
  title: string
  url: string
  view_count?: number
  like_count?: number
  created_at?: string
  thumbnails?: Array<{ id: string; url: string }>
  status: AudioStatus
  progress: number
  error?: string
  audioUrl?: string
}

export const TikTokAudio = () => {
  const [channelUrl, setChannelUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [audioData, setAudioData] = useState<TikTokAudioItem[]>([])
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null)
  
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 })

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

  const handleFetchVideos = async () => {
    if (!channelUrl.trim()) {
      toast.error('Vui lòng nhập URL kênh TikTok')
      return
    }

    setIsLoading(true)
    try {
      const response = await tiktokService.getChannelVideos(channelUrl)
      if (response.success && response.videos) {
        // Map videos and reverse to display newer or matching order
        const mappedData: TikTokAudioItem[] = response.videos.map((video: any) => ({
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
        
        setAudioData(mappedData.reverse())
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
    if (audioData.length === 0) {
      toast.error('Không có dữ liệu để xuất')
      return
    }

    try {
      const excelData = audioData.map((item, index) => ({
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
      XLSX.utils.book_append_sheet(workbook, worksheet, 'TikTok Audio List')

      const fileName = `tiktok-videos-${Date.now()}.xlsx`
      XLSX.writeFile(workbook, fileName)

      toast.success(`Đã xuất ${audioData.length} video ra file Excel`)
    } catch (error) {
      console.error(error)
      toast.error('Không thể xuất file Excel')
    }
  }

  const updateItemStatus = (
    id: string,
    updates: Partial<Omit<TikTokAudioItem, 'id' | 'title' | 'url'>>
  ) => {
    setAudioData((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    )
  }

  const triggerDownload = (audioUrl: string, title: string, index: number) => {
    try {
      const link = document.createElement('a')
      link.href = audioUrl
      link.download = `${title.replace(/[\\/:*?"<>|]/g, '') || index}.mp3`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('File download failed:', error)
    }
  }

  // Tải lẻ từng file
  const handleDownloadSingle = async (item: TikTokAudioItem, index: number) => {
    if (isProcessing) return

    try {
      updateItemStatus(item.id, { status: 'loading', progress: 10 })
      
      const response = await tiktokService.getAudio(item.url)
      
      if (response.success && response.audioUrl) {
        updateItemStatus(item.id, {
          status: 'success',
          progress: 100,
          audioUrl: response.audioUrl
        })
        triggerDownload(response.audioUrl, response.title || item.title, index)
        toast.success(`Đã tải xong: ${item.title}`)
      } else {
        updateItemStatus(item.id, {
          status: 'failed',
          progress: 0,
          error: response.error || 'Tải thất bại'
        })
        toast.error(`Lỗi khi tải: ${item.title}`)
      }
    } catch (error) {
      updateItemStatus(item.id, {
        status: 'failed',
        progress: 0,
        error: error instanceof Error ? error.message : 'Lỗi không xác định'
      })
    }
  }

  // Chạy lần lượt tải tất cả
  const handleProcessAll = async () => {
    const pendingItems = audioData.filter((item) => item.status === 'idle' || item.status === 'failed')

    if (pendingItems.length === 0) {
      toast.error('Không có video nào cần tải')
      return
    }

    setIsProcessing(true)
    let successCount = 0

    // Set all pending items status to 'pending'
    setAudioData(prev => 
      prev.map(item => 
        item.status === 'idle' || item.status === 'failed' 
          ? { ...item, status: 'pending' } 
          : item
      )
    )

    for (let i = 0; i < audioData.length; i++) {
      const item = audioData[i]
      if (item.status !== 'idle' && item.status !== 'failed' && item.status !== 'pending') {
        continue
      }

      const index = i + 1

      try {
        updateItemStatus(item.id, { status: 'loading', progress: 0 })

        // Progress Simulation
        const progressInterval = setInterval(() => {
          setAudioData((prev) =>
            prev.map((dataItem) => {
              if (dataItem.id === item.id && dataItem.status === 'loading') {
                const newProgress = Math.min(dataItem.progress + 10, 90)
                return { ...dataItem, progress: newProgress }
              }
              return dataItem
            })
          )
        }, 300)

        // API Call
        const response = await tiktokService.getAudio(item.url)

        clearInterval(progressInterval)

        if (response.success && response.audioUrl) {
          updateItemStatus(item.id, {
            status: 'success',
            progress: 100,
            audioUrl: response.audioUrl
          })
          triggerDownload(response.audioUrl, response.title || item.title, index)
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
    toast.success(`Đã hoàn thành: Tải thành công ${successCount}/${pendingItems.length} audio`)
  }

  const handleDelete = (id: string) => {
    setVideoToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (videoToDelete) {
      setAudioData((prev) => prev.filter((item) => item.id !== videoToDelete))
      toast.success('Đã xóa video')
      setDeleteDialogOpen(false)
      setVideoToDelete(null)
    }
  }

  const cancelDelete = () => {
    setDeleteDialogOpen(false)
    setVideoToDelete(null)
  }

  const getThumbnailUrl = (item: TikTokAudioItem) => {
    if (item.thumbnails && item.thumbnails.length > 0) {
      const cover = item.thumbnails.find(t => t.id === 'cover' || t.id === 'originCover')
      return cover ? cover.url : item.thumbnails[0].url
    }
    return ''
  }

  const renderStatus = (item: TikTokAudioItem) => {
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
      case 'loading':
        return (
          <div className='space-y-1 min-w-[120px]'>
            <div className='flex items-center gap-1.5 text-blue-600 text-xs font-semibold'>
              <Loader2 className='h-3 w-3 animate-spin' />
              <span>Đang tải... {item.progress}%</span>
            </div>
            <Progress value={item.progress} className='h-1.5 bg-blue-100' />
          </div>
        )
      case 'success':
        return (
          <div className='flex items-center gap-1.5 text-emerald-600 text-sm font-semibold'>
            <CheckCircle className='h-3.5 w-3.5' />
            <span>Thành công</span>
          </div>
        )
      case 'failed':
        return (
          <div className='flex items-center gap-1.5 text-rose-600 text-sm font-semibold' title={item.error}>
            <XCircle className='h-3.5 w-3.5' />
            <span>Lỗi</span>
          </div>
        )
    }
  }

  const columns: ColumnDef<TikTokAudioItem>[] = [
    {
      id: 'index',
      header: 'STT',
      cell: ({ row }) => {
        const index = row.index + 1 + pagination.pageIndex * pagination.pageSize
        return <div className='font-medium text-slate-700 dark:text-slate-300'>{index}</div>
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
            className='w-12 h-16 object-cover rounded-md border shadow-sm'
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div className='w-12 h-16 bg-slate-100 rounded-md border flex items-center justify-center text-xs text-slate-400'>
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
        <div className='font-mono text-xs max-w-[120px] truncate' title={row.original.id}>
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
            className='max-w-md cursor-pointer hover:text-indigo-600 transition-colors font-medium text-slate-800 dark:text-slate-200 line-clamp-2'
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
        <div className='text-right font-medium text-slate-700 dark:text-slate-300'>
          {formatViewCount(row.original.view_count)}
        </div>
      ),
      size: 100
    },
    {
      accessorKey: 'like_count',
      header: 'Lượt thích',
      cell: ({ row }) => (
        <div className='text-right font-medium text-slate-700 dark:text-slate-300'>
          {formatViewCount(row.original.like_count)}
        </div>
      ),
      size: 100
    },
    {
      accessorKey: 'created_at',
      header: 'Ngày đăng',
      cell: ({ row }) => (
        <div className='text-slate-600 dark:text-slate-400 font-medium text-sm'>
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
              disabled={isProcessing || data.status === 'loading'}
              onClick={() => handleDownloadSingle(data, row.index + 1)}
              className='h-8 px-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-medium'
            >
              <Download className='h-3.5 w-3.5 mr-1' />
              Tải MP3
            </Button>
            <a
              href={data.url}
              target='_blank'
              rel='noopener noreferrer'
              className='h-8 w-8 inline-flex items-center justify-center rounded-md border text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-colors'
              title='Xem trên TikTok'
            >
              <ExternalLink className='h-3.5 w-3.5' />
            </a>
            <Button
              variant='ghost'
              size='sm'
              disabled={isProcessing}
              onClick={() => handleDelete(data.id)}
              className='h-8 w-8 p-0 text-rose-600 hover:bg-rose-50'
            >
              <Trash2 className='h-3.5 w-3.5' />
            </Button>
          </div>
        )
      }
    }
  ]

  return (
    <div className='container mx-auto p-4 max-w-6xl space-y-6'>
      {/* Header Banner */}
      <Card className='p-0 overflow-hidden border-0 shadow-xl bg-card/60 backdrop-blur-md'>
        <div className='bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 px-6 py-5 shadow-md'>
          <div className='flex items-center gap-3'>
            <div className='bg-white/20 backdrop-blur-sm rounded-xl p-2.5'>
              <Music className='h-6 w-6 text-white' />
            </div>
            <div>
              <h2 className='text-xl font-bold text-white'>Lấy thông tin kênh TikTok</h2>
              <p className='text-white/70 text-sm'>
                Nhập link kênh TikTok để quét toàn bộ video, xem thống kê chi tiết lượt xem, lượt thích, ngày đăng và tải tệp âm thanh.
              </p>
            </div>
          </div>
        </div>

        {/* Input Controls */}
        <div className='p-6 space-y-4'>
          <div>
            <label className='text-sm font-semibold mb-2 block text-slate-700 dark:text-slate-300'>
              URL Kênh TikTok
            </label>
            <Input
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              placeholder='Ví dụ: https://www.tiktok.com/@gospelglow8'
              disabled={isLoading || isProcessing}
              className='bg-white dark:bg-slate-950 shadow-sm border-slate-200'
            />
          </div>

          <div className='flex flex-wrap gap-2 pt-2'>
            <Button 
              onClick={handleFetchVideos} 
              disabled={isLoading || isProcessing}
              className='bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md shadow-indigo-100 dark:shadow-none'
            >
              {isLoading ? (
                <>
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                  Đang quét kênh...
                </>
              ) : (
                'Quét danh sách video'
              )}
            </Button>
            
            {audioData.length > 0 && (
              <>
                <Button
                  onClick={handleProcessAll}
                  disabled={isProcessing || isLoading}
                  className='bg-emerald-600 hover:bg-emerald-700 text-white font-medium'
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                      Đang tải lần lượt...
                    </>
                  ) : (
                    'Tải tất cả Audio (Lần lượt)'
                  )}
                </Button>
                <Button
                  variant='outline'
                  onClick={handleExportExcel}
                  disabled={isProcessing || isLoading}
                  className='border-slate-200 text-slate-700 hover:bg-slate-50 font-medium'
                >
                  <FileSpreadsheet className='h-4 w-4 mr-2 text-emerald-600' />
                  Xuất file Excel
                </Button>
                <Button
                  variant='ghost'
                  onClick={() => {
                    setAudioData([])
                    setChannelUrl('')
                  }}
                  disabled={isProcessing || isLoading}
                  className='text-slate-500 hover:text-slate-700 font-medium'
                >
                  Xóa kết quả
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Video DataTable Card */}
      {audioData.length > 0 && (
        <Card className='p-6 border-0 shadow-lg bg-card/60 backdrop-blur-md'>
          <div className='flex justify-between items-center mb-4 border-b pb-3'>
            <h3 className='text-lg font-bold text-indigo-950 dark:text-white'>
              Tìm thấy {audioData.length} video của kênh
            </h3>
          </div>
          <DataTable
            columns={columns}
            data={audioData}
            pageSizeOptions={[50, 100]}
            pagination={pagination}
            onPaginationChange={setPagination}
          />
        </Card>
      )}

      {/* Delete Item Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa khỏi danh sách</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa video này khỏi danh sách xử lý?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={cancelDelete}>
              Huỷ
            </Button>
            <Button variant='destructive' onClick={confirmDelete}>
              Xoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
