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
import { CheckCircle, Clock, Download, Loader2, Upload, XCircle } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

type AudioStatus = 'pending' | 'loading' | 'success' | 'failed'

interface AudioDataItem {
  file: File
  fileName: string
  fileSize: number
  status: AudioStatus
  progress: number
  srtContent?: string
  error?: string
}

export const AudioToSrt = () => {
  const [audioData, setAudioData] = useState<AudioDataItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<string | null>(null)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const audioFiles = Array.from(files).filter((file) => {
      const isAudio = file.type.startsWith('audio/')
      if (!isAudio) {
        toast.error(`${file.name} is not an audio file`)
      }
      return isAudio
    })

    if (audioFiles.length === 0) {
      toast.error('No valid audio files selected')
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
    toast.success(`Added ${audioFiles.length} audio file(s)`)

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

  const downloadSrt = (srtContent: string, fileName: string) => {
    try {
      const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName.replace(/\.[^/.]+$/, '.srt')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
      toast.error('Failed to download SRT file')
    }
  }

  const handleProcessFiles = async () => {
    const pendingFiles = audioData.filter((item) => item.status === 'pending')

    if (pendingFiles.length === 0) {
      toast.error('No pending files to process')
      return
    }

    setIsProcessing(true)
    let successCount = 0

    for (const item of pendingFiles) {
      try {
        updateItemStatus(item.fileName, { status: 'loading', progress: 0 })

        // Giả lập progress
        const progressInterval = setInterval(() => {
          setAudioData((prev) =>
            prev.map((dataItem) => {
              if (dataItem.fileName === item.fileName && dataItem.status === 'loading') {
                const newProgress = Math.min(dataItem.progress + 10, 90)
                return { ...dataItem, progress: newProgress }
              }
              return dataItem
            })
          )
        }, 300)

        const response = await youtubeService.audioToSrt(item.file)

        clearInterval(progressInterval)

        if (response.success && response.srtContent) {
          updateItemStatus(item.fileName, {
            status: 'success',
            progress: 100,
            srtContent: response.srtContent
          })

          // Tự động tải xuống SRT
          downloadSrt(response.srtContent, item.fileName)
          successCount++
          toast.success(`Converted: ${item.fileName}`)
        } else {
          updateItemStatus(item.fileName, {
            status: 'failed',
            progress: 0,
            error: response.error || 'Unknown error'
          })
          toast.error(`Failed: ${item.fileName}`)
        }
      } catch (error) {
        updateItemStatus(item.fileName, {
          status: 'failed',
          progress: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        toast.error(`Error: ${item.fileName}`)
      }
    }

    setIsProcessing(false)
    toast.success(`Completed: ${successCount}/${pendingFiles.length} files converted`)
  }

  const handleDeleteFile = (fileName: string) => {
    setFileToDelete(fileName)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (fileToDelete) {
      setAudioData((prev) => prev.filter((item) => item.fileName !== fileToDelete))
      toast.success('File removed')
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
          <div className='space-y-2 min-w-[200px]'>
            <div className='flex items-center gap-2 text-blue-600'>
              <Loader2 className='h-4 w-4 animate-spin' />
              <span>Processing... {item.progress}%</span>
            </div>
            <Progress value={item.progress} className='h-2' />
          </div>
        )
      case 'success':
        return (
          <div className='flex items-center gap-2 text-green-600'>
            <CheckCircle className='h-4 w-4' />
            <span>Success</span>
          </div>
        )
      case 'failed':
        return (
          <div className='flex items-center gap-2 text-red-600'>
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
      accessorKey: 'fileName',
      header: 'File Name',
      cell: ({ row }) => (
        <div className='max-w-xs truncate' title={row.original.fileName}>
          {row.original.fileName}
        </div>
      )
    },
    {
      accessorKey: 'fileSize',
      header: 'File Size',
      cell: ({ row }) => formatFileSize(row.original.fileSize)
    },
    {
      accessorKey: 'status',
      header: 'Processing Status',
      cell: ({ row }) => renderStatus(row.original)
    },
    {
      accessorKey: 'error',
      header: 'Error',
      cell: ({ row }) => {
        if (row.original.status !== 'failed') return '-'
        return (
          <div className='max-w-xs truncate text-red-600' title={row.original.error}>
            {row.original.error}
          </div>
        )
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className='flex gap-2'>
          {row.original.status === 'success' && row.original.srtContent && (
            <Button
              size='sm'
              variant='outline'
              onClick={() => downloadSrt(row.original.srtContent!, row.original.fileName)}
            >
              <Download className='h-4 w-4 mr-1' />
              Download SRT
            </Button>
          )}
          <Button
            size='sm'
            variant='destructive'
            onClick={() => handleDeleteFile(row.original.fileName)}
            disabled={isProcessing && row.original.status === 'loading'}
          >
            Delete
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className='space-y-4'>
      <Card className='p-6'>
        <div className='space-y-4'>
          <div>
            <label className='text-sm font-medium mb-2 block'>
              Select Audio Files (MP3, WAV, etc.)
            </label>
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
              className='w-full'
            >
              <Upload className='h-4 w-4 mr-2' />
              Select Audio Files
            </Button>
          </div>

          {audioData.length > 0 && (
            <div className='flex gap-2'>
              <Button onClick={handleProcessFiles} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                    Processing...
                  </>
                ) : (
                  'Convert to SRT'
                )}
              </Button>
              <Button variant='outline' onClick={() => setAudioData([])} disabled={isProcessing}>
                Clear All
              </Button>
            </div>
          )}
        </div>
      </Card>

      {audioData.length > 0 && (
        <Card className='p-6'>
          <DataTable
            columns={columns}
            data={audioData}
            pageSizeOptions={[50, 100]}
            pagination={pagination}
            onPaginationChange={setPagination}
          />
        </Card>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this file from the list? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={cancelDelete}>
              Cancel
            </Button>
            <Button variant='destructive' onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
