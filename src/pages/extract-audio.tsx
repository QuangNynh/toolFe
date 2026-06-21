import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import {
  Music,
  Upload,
  Download,
  FileVideo,
  Loader2,
  X,
  Volume2
} from 'lucide-react'
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_SERVER_LOCAL

const FORMATS = [
  { value: 'mp3', label: 'MP3' },
  { value: 'wav', label: 'WAV' },
  { value: 'aac', label: 'AAC' },
  { value: 'ogg', label: 'OGG' }
]

const BITRATES = [
  { value: '128', label: '128 kbps' },
  { value: '192', label: '192 kbps' },
  { value: '256', label: '256 kbps' },
  { value: '320', label: '320 kbps (Cao nhất)' }
]

const ExtractAudioPage = () => {
  const [file, setFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [format, setFormat] = useState('mp3')
  const [bitrate, setBitrate] = useState('320')
  const [isExtracting, setIsExtracting] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Simulate progress
  useEffect(() => {
    if (!isExtracting) {
      setProgress(0)
      return
    }
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) return prev
        return prev + Math.random() * 6
      })
    }, 600)
    return () => clearInterval(interval)
  }, [isExtracting])

  // Clean up video preview URL
  useEffect(() => {
    return () => {
      if (videoPreview) URL.revokeObjectURL(videoPreview)
    }
  }, [videoPreview])

  const isVideoFile = (f: File) => {
    return f.type.startsWith('video/') || /\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i.test(f.name)
  }

  const handleFileSelect = (selectedFile: File) => {
    if (!isVideoFile(selectedFile)) {
      toast.error('Chỉ chấp nhận file video (mp4, mkv, avi, mov, ...)')
      return
    }
    if (videoPreview) URL.revokeObjectURL(videoPreview)
    setFile(selectedFile)
    setVideoPreview(URL.createObjectURL(selectedFile))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) handleFileSelect(selected)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) handleFileSelect(droppedFile)
  }

  const clearFile = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview)
    setFile(null)
    setVideoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleExtract = async () => {
    if (!file) {
      toast.error('Vui lòng chọn file video')
      return
    }

    setIsExtracting(true)
    setProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('format', format)
      formData.append('bitrate', bitrate)

      const response = await axios.post(`${BASE_URL}media/extract-audio`, formData, {
        headers: {
          accept: '*/*',
          'Content-Type': 'multipart/form-data'
        },
        responseType: 'blob',
        timeout: 600000
      })

      setProgress(100)

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition']
      let filename = `${file.name.replace(/\.[^/.]+$/, '')}.${format}`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/)
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1])
        }
      }

      // Download the audio file
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Tách audio thành công! File đã được tải xuống.')
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        try {
          const text = await error.response.data.text()
          const parsed = JSON.parse(text)
          toast.error(parsed.message || parsed.error || 'Tách audio thất bại')
        } catch {
          toast.error(`Tách audio thất bại (${error.response.status})`)
        }
      } else {
        toast.error('Đã xảy ra lỗi khi tách audio')
      }
    } finally {
      setIsExtracting(false)
    }
  }

  return (
    <div className='container mx-auto p-6 max-w-4xl'>
      <Card className='p-0 overflow-hidden border-0 shadow-lg'>
        {/* Header gradient */}
        <div className='bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-6 py-5'>
          <div className='flex items-center gap-3'>
            <div className='bg-white/20 backdrop-blur-sm rounded-xl p-2.5'>
              <Music className='h-6 w-6 text-white' />
            </div>
            <div>
              <h2 className='text-xl font-bold text-white'>Tách Audio từ Video</h2>
              <p className='text-white/70 text-sm'>Trích xuất file âm thanh từ video nhanh chóng</p>
            </div>
          </div>
        </div>

        <div className='p-6 space-y-6'>
          {/* Settings row */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label className='text-sm font-medium flex items-center gap-1.5'>
                <Volume2 className='h-3.5 w-3.5 text-emerald-500' />
                Định dạng
              </Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger id='format-select' className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label className='text-sm font-medium flex items-center gap-1.5'>
                <Music className='h-3.5 w-3.5 text-teal-500' />
                Bitrate
              </Label>
              <Select value={bitrate} onValueChange={setBitrate}>
                <SelectTrigger id='bitrate-select' className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BITRATES.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* File upload area */}
          {!file ? (
            <div
              className={`relative border-2 border-dashed rounded-xl transition-all duration-300 ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 scale-[1.01]'
                  : 'border-muted-foreground/25 hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-500/5'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type='file'
                accept='video/*,.mp4,.mkv,.avi,.mov,.wmv,.flv,.webm'
                onChange={handleInputChange}
                className='absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10'
                id='video-file-input'
              />
              <div className='flex flex-col items-center justify-center py-12 px-4 pointer-events-none'>
                <div className='bg-muted rounded-full p-3.5 mb-3'>
                  <Upload className='h-8 w-8 text-muted-foreground' />
                </div>
                <p className='font-medium text-foreground'>Kéo thả file video vào đây</p>
                <p className='text-sm text-muted-foreground mt-1'>
                  hoặc nhấn để chọn file • MP4, MKV, AVI, MOV, ...
                </p>
              </div>
            </div>
          ) : (
            <div className='border rounded-xl overflow-hidden bg-muted/30'>
              {/* Video preview */}
              {videoPreview && (
                <div className='relative bg-black'>
                  <video
                    src={videoPreview}
                    controls
                    className='w-full max-h-[360px] object-contain'
                  />
                </div>
              )}
              {/* File info bar */}
              <div className='flex items-center justify-between px-4 py-3'>
                <div className='flex items-center gap-3 min-w-0'>
                  <div className='bg-emerald-100 dark:bg-emerald-500/20 rounded-lg p-2 shrink-0'>
                    <FileVideo className='h-5 w-5 text-emerald-600 dark:text-emerald-400' />
                  </div>
                  <div className='min-w-0'>
                    <p className='font-medium text-sm truncate'>{file.name}</p>
                    <p className='text-xs text-muted-foreground'>{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={clearFile}
                  className='shrink-0 text-muted-foreground hover:text-destructive'
                >
                  <X className='h-4 w-4' />
                </Button>
              </div>
            </div>
          )}

          {/* Progress bar */}
          {isExtracting && (
            <div className='space-y-2 animate-in fade-in slide-in-from-top-2'>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-muted-foreground flex items-center gap-2'>
                  <Loader2 className='h-3.5 w-3.5 animate-spin' />
                  Đang tách audio...
                </span>
                <span className='font-mono text-xs text-muted-foreground'>
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress value={progress} className='h-2' />
            </div>
          )}

          {/* Extract button */}
          <Button
            onClick={handleExtract}
            disabled={!file || isExtracting}
            className='w-full h-12 text-base font-semibold bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:shadow-emerald-500/40 hover:scale-[1.01] active:scale-[0.99]'
            id='extract-audio-btn'
          >
            {isExtracting ? (
              <span className='flex items-center gap-2'>
                <Loader2 className='h-5 w-5 animate-spin' />
                Đang xử lý...
              </span>
            ) : (
              <span className='flex items-center gap-2'>
                <Download className='h-5 w-5' />
                Tách Audio & Tải xuống
              </span>
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default ExtractAudioPage
