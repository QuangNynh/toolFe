import { DataTable } from '@/components/common/data-table'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
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
import { CheckCircle, Clock, ExternalLink, Loader2, XCircle, Download, FileSpreadsheet, Video, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

type VideoStatus = 'pending' | 'loading' | 'success' | 'failed'

interface VideoDataItem {
  videoUrl: string
  status: VideoStatus
  progress: number
  videoDownloadUrl?: string
  title?: string
  error?: string
}

export const TikTokVideo = () => {
  const [urlText, setUrlText] = useState('')
  const [isFormatted, setIsFormatted] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [videoData, setVideoData] = useState<VideoDataItem[]>([])
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null)
  
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 })

  const formatUrls = () => {
    if (!urlText.trim()) {
      toast.error('Vui lòng nhập danh sách link video TikTok')
      return
    }

    const urls = urlText
      .split(/[\s,\n\t]+/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0)

    const formattedUrls = urls.join(', ')
    setUrlText(formattedUrls)
    setIsFormatted(true)
    toast.success('Đã định dạng danh sách link thành công')
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} đã được sao chép!`)
    } catch {
      toast.error('Không thể sao chép')
    }
  }

  const handleExportExcel = () => {
    if (videoData.length === 0) {
      toast.error('Không có dữ liệu để xuất')
      return
    }

    try {
      const excelData = videoData.map((item, index) => ({
        STT: index + 1,
        'Video URL': item.videoUrl,
        'Tiêu đề': item.title || '-',
        'Trạng thái': item.status === 'success' ? 'Thành công' : item.status === 'failed' ? 'Thất bại' : 'Đang chờ/Đang tải',
        'Chi tiết lỗi': item.error || ''
      }))

      const worksheet = XLSX.utils.json_to_sheet(excelData)

      worksheet['!cols'] = [
        { wch: 5 },  // STT
        { wch: 50 }, // Video URL
        { wch: 40 }, // Tiêu đề
        { wch: 15 }, // Trạng thái
        { wch: 30 }  // Chi tiết lỗi
      ]

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'TikTok Video List')

      const fileName = `tiktok-download-videos-${Date.now()}.xlsx`
      XLSX.writeFile(workbook, fileName)

      toast.success(`Đã xuất ${videoData.length} video ra file Excel`)
    } catch (error) {
      console.error(error)
      toast.error('Không thể xuất file Excel')
    }
  }

  const updateItemStatus = (
    videoUrl: string,
    updates: Partial<Omit<VideoDataItem, 'videoUrl'>>
  ) => {
    setVideoData((prev) =>
      prev.map((item) => (item.videoUrl === videoUrl ? { ...item, ...updates } : item))
    )
  }

  const triggerDownload = (downloadUrl: string, index: number) => {
    try {
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `${index}.mp4`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('File download failed:', error)
    }
  }

  // Tải lẻ từng tệp
  const handleDownloadSingle = async (item: VideoDataItem, index: number) => {
    if (isProcessing) return

    try {
      updateItemStatus(item.videoUrl, { status: 'loading', progress: 10 })
      
      const response = await tiktokService.getVideo(item.videoUrl)
      
      if (response.success && response.videoUrl) {
        updateItemStatus(item.videoUrl, {
          status: 'success',
          progress: 100,
          videoDownloadUrl: response.videoUrl,
          title: response.title
        })
        triggerDownload(response.videoUrl, index)
        toast.success(`Đã tải xong video số ${index}`)
      } else {
        updateItemStatus(item.videoUrl, {
          status: 'failed',
          progress: 0,
          error: response.error || 'Tải thất bại'
        })
        toast.error(`Lỗi khi tải video số ${index}`)
      }
    } catch (error) {
      updateItemStatus(item.videoUrl, {
        status: 'failed',
        progress: 0,
        error: error instanceof Error ? error.message : 'Lỗi không xác định'
      })
    }
  }

  // Chạy tuần tự tải tất cả
  const handleProcessAll = async () => {
    if (!urlText.trim()) {
      toast.error('Vui lòng nhập danh sách link video TikTok')
      return
    }

    if (!isFormatted) {
      toast.error('Vui lòng định dạng danh sách link trước')
      return
    }

    const urls = urlText
      .split(/[\s,\n\t]+/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0)

    if (urls.length === 0) {
      toast.error('Không tìm thấy link video TikTok hợp lệ nào')
      return
    }

    const initialData: VideoDataItem[] = urls.map((url) => ({
      videoUrl: url,
      status: 'pending',
      progress: 0
    }))
    
    setVideoData(initialData)
    setIsProcessing(true)

    let successCount = 0

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      const index = i + 1

      try {
        updateItemStatus(url, { status: 'loading', progress: 0 })

        const progressInterval = setInterval(() => {
          setVideoData((prev) =>
            prev.map((dataItem) => {
              if (dataItem.videoUrl === url && dataItem.status === 'loading') {
                const newProgress = Math.min(dataItem.progress + 10, 90)
                return { ...dataItem, progress: newProgress }
              }
              return dataItem
            })
          )
        }, 300)

        const response = await tiktokService.getVideo(url)

        clearInterval(progressInterval)

        if (response.success && response.videoUrl) {
          updateItemStatus(url, {
            status: 'success',
            progress: 100,
            videoDownloadUrl: response.videoUrl,
            title: response.title
          })
          triggerDownload(response.videoUrl, index)
          successCount++
        } else {
          updateItemStatus(url, {
            status: 'failed',
            progress: 0,
            error: response.error || 'Server error'
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
    toast.success(`Đã hoàn thành: Tải thành công ${successCount}/${urls.length} video TikTok`)
  }

  const handleDelete = (videoUrl: string) => {
    setVideoToDelete(videoUrl)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (videoToDelete) {
      setVideoData((prev) => prev.filter((item) => item.videoUrl !== videoToDelete))
      toast.success('Đã xóa video khỏi danh sách')
      setDeleteDialogOpen(false)
      setVideoToDelete(null)
    }
  }

  const cancelDelete = () => {
    setDeleteDialogOpen(false)
    setVideoToDelete(null)
  }

  const renderStatus = (item: VideoDataItem) => {
    switch (item.status) {
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
            <div className='flex items-center gap-1.5 text-pink-400 text-xs font-semibold'>
              <Loader2 className='h-3 w-3 animate-spin' />
              <span>Đang tải... {item.progress}%</span>
            </div>
            <Progress value={item.progress} className='h-1.5 bg-pink-950' />
          </div>
        )
      case 'success':
        return (
          <div className='flex items-center gap-1.5 text-pink-400 text-sm font-semibold'>
            <CheckCircle className='h-3.5 w-3.5' />
            <span>Thành công</span>
          </div>
        )
      case 'failed':
        return (
          <div className='flex items-center gap-1.5 text-rose-500 text-sm font-semibold' title={item.error}>
            <XCircle className='h-3.5 w-3.5' />
            <span>Thất bại</span>
          </div>
        )
    }
  }

  const columns: ColumnDef<VideoDataItem>[] = [
    {
      id: 'index',
      header: 'STT',
      cell: ({ row }) => {
        const index = row.index + 1 + pagination.pageIndex * pagination.pageSize
        return <div className='font-medium text-slate-300'>{index}</div>
      },
      size: 60
    },
    {
      accessorKey: 'videoUrl',
      header: 'Link Video TikTok',
      cell: ({ row }) => (
        <div className='flex items-center gap-1 max-w-sm truncate'>
          <a
            href={row.original.videoUrl}
            target='_blank'
            rel='noopener noreferrer'
            className='text-pink-400 hover:underline font-medium truncate'
          >
            {row.original.videoUrl}
          </a>
        </div>
      )
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái xử lý',
      cell: ({ row }) => renderStatus(row.original),
      size: 140
    },
    {
      accessorKey: 'title',
      header: 'Tiêu đề',
      cell: ({ row }) => {
        const title = row.original.title || '-'
        return (
          <div
            className='max-w-xs truncate cursor-pointer hover:text-pink-400 transition-colors font-medium text-slate-200'
            title={`${title}\n\nClick để sao chép`}
            onClick={() => copyToClipboard(title, 'Tiêu đề')}
          >
            {title}
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
          <div className='max-w-xs truncate text-rose-500 font-medium' title={row.original.error}>
            {row.original.error}
          </div>
        )
      }
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
              className='h-8 px-2 border-pink-800 text-pink-400 hover:bg-pink-950/30 hover:text-pink-300 font-medium'
            >
              <Download className='h-3.5 w-3.5 mr-1' />
              Tải MP4
            </Button>
            <a
              href={data.videoUrl}
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
              onClick={() => handleDelete(data.videoUrl)}
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
          <div className='absolute inset-0 bg-black/10 mix-blend-overlay' />
          
          <div className='flex items-center gap-3 relative z-10'>
            <div className='bg-black/30 backdrop-blur-md rounded-xl p-2.5 border border-white/10'>
              <Video className='h-6 w-6 text-white' />
            </div>
            <div>
              <h2 className='text-xl font-extrabold text-white tracking-wide'>Tải Video TikTok hàng loạt</h2>
              <p className='text-slate-200/80 text-sm font-medium mt-0.5'>
                Dán danh sách link video TikTok của bạn vào khung bên dưới để tự động tải xuống video MP4 không logo lần lượt.
              </p>
            </div>
          </div>
        </div>

        {/* Input Controls */}
        <div className='p-6 space-y-4 bg-zinc-950/40'>
          <div>
            <label className='text-sm font-semibold mb-2 block text-slate-300'>
              Danh sách link video TikTok (Mỗi dòng một link hoặc ngăn cách bởi dấu phẩy, khoảng trắng)
            </label>
            <Textarea
              value={urlText}
              onChange={(e) => {
                setUrlText(e.target.value)
                setIsFormatted(false)
              }}
              placeholder='Dán các link video TikTok tại đây...&#10;https://www.tiktok.com/@user/video/7348463423828725038&#10;https://www.tiktok.com/@user/video/7347363525313973546'
              className='min-h-[180px] max-h-[300px] resize-y bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-700 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 shadow-sm font-mono text-sm'
              disabled={isProcessing}
            />
          </div>

          <div className='flex flex-wrap gap-2.5 pt-2'>
            <Button 
              onClick={formatUrls} 
              disabled={isProcessing || !urlText.trim()}
              variant='outline'
              className='border-zinc-800 bg-zinc-900 text-slate-300 hover:bg-zinc-800 font-medium'
            >
              Định dạng danh sách link
            </Button>
            
            <Button
              onClick={handleProcessAll}
              disabled={!isFormatted || isProcessing || !urlText.trim()}
              className='bg-[#fe0979] hover:bg-pink-600 text-white font-bold shadow-md shadow-pink-950/20'
            >
              {isProcessing ? (
                <>
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                  Đang tải lần lượt...
                </>
              ) : (
                'Bắt đầu tải Video'
              )}
            </Button>

            {videoData.length > 0 && (
              <>
                <Button
                  variant='outline'
                  onClick={handleExportExcel}
                  disabled={isProcessing}
                  className='border-zinc-800 bg-zinc-900 text-slate-300 hover:bg-zinc-800 font-medium'
                >
                  <FileSpreadsheet className='h-4 w-4 mr-2 text-emerald-500' />
                  Xuất file Excel
                </Button>
                <Button
                  variant='ghost'
                  onClick={() => {
                    setVideoData([])
                    setUrlText('')
                    setIsFormatted(false)
                  }}
                  disabled={isProcessing}
                  className='text-zinc-500 hover:text-zinc-300 font-medium'
                >
                  Xóa kết quả
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Progress DataTable Card */}
      {videoData.length > 0 && (
        <Card className='p-6 border-zinc-800 shadow-2xl bg-zinc-950/80 backdrop-blur-md'>
          <div className='flex justify-between items-center mb-4 border-b border-zinc-800 pb-3'>
            <h3 className='text-lg font-bold text-slate-100 flex items-center gap-2'>
              <span className='w-2.5 h-2.5 rounded-full bg-[#fe0979] animate-pulse' />
              Danh sách video ({videoData.length} link)
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
              Bạn có chắc chắn muốn xóa link video này khỏi danh sách xử lý?
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
