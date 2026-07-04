import { DataTable } from '@/components/common/data-table'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { youtubeService } from '@/services/youtube.service'
import type { ColumnDef } from '@tanstack/react-table'
import {
  CheckCircle,
  Clock,
  Download,
  Loader2,
  Upload,
  XCircle,
  FileText,
  Copy,
  Eye,
  Trash2
} from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

type AudioStatus = 'pending' | 'loading' | 'success' | 'failed'

interface AudioDataItem {
  file: File
  fileName: string
  fileSize: number
  status: AudioStatus
  progress: number
  scriptContent?: string
  error?: string
}

export const AudioToScript = () => {
  const [audioData, setAudioData] = useState<AudioDataItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  // Dialog for deletion
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<string | null>(null)

  // Dialog for script preview
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [previewContent, setPreviewContent] = useState({ title: '', text: '' })

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const audioFiles = Array.from(files).filter((file) => {
      // Accept typical audio MIME types or file extensions
      const isAudio = file.type.startsWith('audio/') ||
        /\.(mp3|wav|ogg|m4a|aac|wma|flac)$/i.test(file.name)
      if (!isAudio) {
        toast.error(`${file.name} không phải là file âm thanh hợp lệ`)
      }
      return isAudio
    })

    if (audioFiles.length === 0) {
      toast.error('Không tìm thấy file âm thanh hợp lệ nào')
      return
    }

    const newItems: AudioDataItem[] = audioFiles.map((file) => ({
      file,
      fileName: file.name,
      fileSize: file.size,
      status: 'pending',
      progress: 0
    }))

    setAudioData((prev) => [...prev, ...newItems])
    toast.success(`Đã thêm ${audioFiles.length} file âm thanh`)

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const updateItemStatus = (
    fileName: string,
    updates: Partial<Omit<AudioDataItem, 'file' | 'fileName' | 'fileSize'>>
  ) => {
    setAudioData((prev) =>
      prev.map((item) => (item.fileName === fileName ? { ...item, ...updates } : item))
    )
  }

  const downloadSingleScript = (scriptContent: string, fileName: string) => {
    try {
      const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName.replace(/\.[^/.]+$/, '_kịch_bản.txt')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success(`Đã tải xuống kịch bản của ${fileName}`)
    } catch (error) {
      console.error('Download failed:', error)
      toast.error('Không thể tải xuống kịch bản')
    }
  }

  const downloadAllTxt = () => {
    try {
      const successItems = audioData.filter(item => item.status === 'success' && item.scriptContent)
      if (successItems.length === 0) {
        toast.error('Không có kịch bản thành công nào để tải xuống')
        return
      }

      const formattedItems = successItems.map((item, index) => {
        return `${index + 1}. 1000$1h\n\n${item.scriptContent}`
      })

      const text = formattedItems.join('\n\n\n\n')
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'export_kịch_bản.txt'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('Đã tải xuống file export_kịch_bản.txt thành công!')
    } catch (error) {
      console.error('Download failed:', error)
      toast.error('Không thể tải xuống file kịch bản')
    }
  }

  const copyAllTxt = () => {
    const successItems = audioData.filter(item => item.status === 'success' && item.scriptContent)
    if (successItems.length === 0) {
      toast.error('Không có kịch bản thành công nào để sao chép')
      return
    }

    const formattedItems = successItems.map((item, index) => {
      const nameWithoutExt = item.fileName.replace(/\.[^/.]+$/, "")
      return `${index + 1}. ${nameWithoutExt}\n\n${item.scriptContent}`
    })

    const text = formattedItems.join('\n\n\n\n')
    navigator.clipboard.writeText(text)
    toast.success('Đã sao chép tất cả kịch bản vào Clipboard!')
  }

  const handleProcessFiles = async () => {
    const pendingFiles = audioData.filter((item) => item.status === 'pending')

    if (pendingFiles.length === 0) {
      toast.error('Không có file nào đang ở trạng thái Chờ xử lý')
      return
    }

    setIsProcessing(true)
    let successCount = 0

    // Run sequentially (chạy lần lượt)
    for (const item of pendingFiles) {
      try {
        updateItemStatus(item.fileName, { status: 'loading', progress: 0 })

        // Simulating incremental progress while uploading/processing
        const progressInterval = setInterval(() => {
          setAudioData((prev) =>
            prev.map((dataItem) => {
              if (dataItem.fileName === item.fileName && dataItem.status === 'loading') {
                const newProgress = Math.min(dataItem.progress + 5, 95)
                return { ...dataItem, progress: newProgress }
              }
              return dataItem
            })
          )
        }, 500)

        // API Call
        const response = await youtubeService.audioToScript(item.file)

        clearInterval(progressInterval)

        if (response.success && response.scriptContent) {
          updateItemStatus(item.fileName, {
            status: 'success',
            progress: 100,
            scriptContent: response.scriptContent
          })
          successCount++
        } else {
          updateItemStatus(item.fileName, {
            status: 'failed',
            progress: 0,
            error: response.error || 'Server error or invalid response format'
          })
        }
      } catch (error) {
        updateItemStatus(item.fileName, {
          status: 'failed',
          progress: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    setIsProcessing(false)
    toast.success(`Đã hoàn thành: Chuyển đổi thành công ${successCount}/${pendingFiles.length} file`)
  }

  const handleDeleteFile = (fileName: string) => {
    setFileToDelete(fileName)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (fileToDelete) {
      setAudioData((prev) => prev.filter((item) => item.fileName !== fileToDelete))
      toast.success('Đã xóa file khỏi danh sách')
      setDeleteDialogOpen(false)
      setFileToDelete(null)
    }
  }

  const cancelDelete = () => {
    setDeleteDialogOpen(false)
    setFileToDelete(null)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const openPreview = (title: string, text: string) => {
    setPreviewContent({ title, text })
    setPreviewDialogOpen(true)
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
          <div className='space-y-2 min-w-[200px]'>
            <div className='flex items-center gap-2 text-blue-600'>
              <Loader2 className='h-4 w-4 animate-spin' />
              <span>Đang xử lý... {item.progress}%</span>
            </div>
            <Progress value={item.progress} className='h-2 bg-blue-100' />
          </div>
        )
      case 'success':
        return (
          <div className='flex items-center gap-2 text-emerald-600 font-medium'>
            <CheckCircle className='h-4 w-4' />
            <span>Thành công</span>
          </div>
        )
      case 'failed':
        return (
          <div className='flex items-center gap-2 text-rose-600 font-medium'>
            <XCircle className='h-4 w-4' />
            <span>Thất bại</span>
          </div>
        )
    }
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
      accessorKey: 'fileName',
      header: 'Tên file âm thanh',
      cell: ({ row }) => (
        <div className='max-w-xs truncate font-medium' title={row.original.fileName}>
          {row.original.fileName}
        </div>
      )
    },
    {
      accessorKey: 'fileSize',
      header: 'Dung lượng',
      cell: ({ row }) => formatFileSize(row.original.fileSize)
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => renderStatus(row.original)
    },
    {
      accessorKey: 'error',
      header: 'Lỗi',
      cell: ({ row }) => {
        if (row.original.status !== 'failed') return '-'
        return (
          <div className='max-w-xs truncate text-rose-600' title={row.original.error}>
            {row.original.error}
          </div>
        )
      }
    },
    {
      id: 'actions',
      header: 'Thao tác',
      cell: ({ row }) => (
        <div className='flex gap-2'>
          {row.original.status === 'success' && row.original.scriptContent && (
            <>
              <Button
                size='sm'
                variant='outline'
                className='h-8 px-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                onClick={() => openPreview(row.original.fileName, row.original.scriptContent!)}
              >
                <Eye className='h-3.5 w-3.5 mr-1' />
                Xem
              </Button>
              <Button
                size='sm'
                variant='outline'
                className='h-8 px-2'
                onClick={() => downloadSingleScript(row.original.scriptContent!, row.original.fileName)}
              >
                <Download className='h-3.5 w-3.5 mr-1' />
                Tải
              </Button>
            </>
          )}
          <Button
            size='sm'
            variant='ghost'
            className='h-8 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700'
            onClick={() => handleDeleteFile(row.original.fileName)}
            disabled={isProcessing && row.original.status === 'loading'}
          >
            <Trash2 className='h-3.5 w-3.5' />
          </Button>
        </div>
      )
    }
  ]

  const successCount = audioData.filter((item) => item.status === 'success').length
  const failedCount = audioData.filter((item) => item.status === 'failed').length
  const processingCount = audioData.filter((item) => item.status === 'loading').length
  const pendingCount = audioData.filter((item) => item.status === 'pending').length

  return (
    <div className='container mx-auto p-4 max-w-6xl space-y-6'>
      {/* Page Header */}
      <Card className='p-0 overflow-hidden border-0 shadow-xl bg-card/60 backdrop-blur-md'>
        <div className='bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-6 py-5 shadow-md'>
          <div className='flex items-center gap-3'>
            <div className='bg-white/20 backdrop-blur-sm rounded-xl p-2.5'>
              <FileText className='h-6 w-6 text-white' />
            </div>
            <div>
              <h2 className='text-xl font-bold text-white'>Xuất kịch bản từ Audio</h2>
              <p className='text-white/70 text-sm'>
                Chuyển đổi danh sách file âm thanh thành kịch bản văn bản. Hệ thống sẽ xử lý tuần tự từng file.
              </p>
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className='p-6 space-y-6'>
          <div className='border-2 border-dashed border-muted rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-4 hover:border-indigo-400 transition-colors bg-slate-50/50 dark:bg-slate-900/10'>
            <div className='bg-indigo-100 dark:bg-indigo-950/40 p-3 rounded-full text-indigo-600 dark:text-indigo-400'>
              <Upload className='h-8 w-8' />
            </div>
            <div>
              <p className='font-semibold text-lg'>Tải lên các file âm thanh của bạn</p>
              <p className='text-sm text-muted-foreground mt-1'>
                Hỗ trợ tải lên nhiều file cùng lúc (MP3, WAV, OGG, M4A, v.v.)
              </p>
            </div>

            <input
              ref={fileInputRef}
              type='file'
              accept='audio/*'
              multiple
              onChange={handleFileSelect}
              className='hidden'
              id='audio-file-input'
              disabled={isProcessing}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className='bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md shadow-indigo-100 dark:shadow-none'
            >
              Chọn các file âm thanh
            </Button>
          </div>

          {audioData.length > 0 && (
            <div className='flex flex-wrap gap-3 items-center justify-between border-t pt-4'>
              <div className='flex flex-wrap gap-2 text-sm text-muted-foreground'>
                <span className='px-2.5 py-1 bg-slate-100 rounded-full font-medium'>
                  Tổng số: {audioData.length}
                </span>
                {pendingCount > 0 && (
                  <span className='px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full font-medium'>
                    Chờ xử lý: {pendingCount}
                  </span>
                )}
                {processingCount > 0 && (
                  <span className='px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full font-medium animate-pulse'>
                    Đang xử lý: {processingCount}
                  </span>
                )}
                {successCount > 0 && (
                  <span className='px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full font-medium'>
                    Thành công: {successCount}
                  </span>
                )}
                {failedCount > 0 && (
                  <span className='px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-100 rounded-full font-medium'>
                    Thất bại: {failedCount}
                  </span>
                )}
              </div>

              <div className='flex gap-2'>
                <Button
                  onClick={handleProcessFiles}
                  disabled={isProcessing || pendingCount === 0}
                  className='bg-indigo-600 hover:bg-indigo-700 text-white font-medium'
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                      Đang xử lý tuần tự...
                    </>
                  ) : (
                    'Bắt đầu xử lý'
                  )}
                </Button>

                {successCount > 0 && (
                  <>
                    <Button
                      variant='outline'
                      onClick={downloadAllTxt}
                      className='border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-medium'
                    >
                      <Download className='h-4 w-4 mr-2' />
                      Tải file .TXT tổng hợp
                    </Button>
                    <Button
                      variant='outline'
                      onClick={copyAllTxt}
                      className='border-slate-200 text-slate-700 hover:bg-slate-50 font-medium'
                    >
                      <Copy className='h-4 w-4 mr-2' />
                      Sao chép toàn bộ kịch bản
                    </Button>
                  </>
                )}

                <Button
                  variant='ghost'
                  onClick={() => setAudioData([])}
                  disabled={isProcessing}
                  className='text-slate-500 hover:text-slate-700'
                >
                  Xoá danh sách
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Audio Items Table */}
      {audioData.length > 0 && (
        <Card className='p-6 border-0 shadow-lg bg-card/60 backdrop-blur-md'>
          <h3 className='text-lg font-semibold mb-4 text-indigo-950 dark:text-white'>Danh sách file âm thanh</h3>
          <DataTable
            columns={columns}
            data={audioData}
            pageSizeOptions={[50, 100]}
            pagination={pagination}
            onPaginationChange={setPagination}
          />
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá file khỏi danh sách</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xoá file này khỏi danh sách xử lý? Hành động này không thể hoàn tác.
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

      {/* Script Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className='max-w-3xl max-h-[80vh] flex flex-col'>
          <DialogHeader>
            <DialogTitle className='text-indigo-900 truncate pr-6'>
              Kịch bản chi tiết: {previewContent.title}
            </DialogTitle>
            <DialogDescription>
              Nội dung văn bản được giải mã từ file âm thanh.
            </DialogDescription>
          </DialogHeader>

          <div className='flex-1 overflow-y-auto my-4 p-4 bg-slate-50 rounded-lg border dark:bg-slate-900/50'>
            <pre className='whitespace-pre-wrap text-sm font-sans leading-relaxed'>
              {previewContent.text}
            </pre>
          </div>

          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              variant='outline'
              onClick={() => {
                navigator.clipboard.writeText(previewContent.text)
                toast.success('Đã sao chép kịch bản vào Clipboard!')
              }}
            >
              <Copy className='h-4 w-4 mr-2' />
              Sao chép
            </Button>
            <Button onClick={() => setPreviewDialogOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
