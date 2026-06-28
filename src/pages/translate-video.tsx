import React, { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import {
  Film,
  Upload,
  Download,
  Settings2,
  Sparkles,
  FileVideo,
  Loader2,
  X,
  Volume2,
  Mic
} from 'lucide-react'
import { dubService } from '@/services/dub.service'

const STORAGE_KEY_API = 'translate_api_key'

const TRANSLATE_MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Khuyên dùng - Nhanh)', desc: 'Nhanh, hiệu quả cao' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', desc: 'Ổn định, nhanh' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Thông minh nhất nhưng chậm)', desc: 'Thông minh vượt trội' }
]

const TTS_MODELS = [
  { value: 'gemini-3.1-flash-tts-preview', label: 'Gemini 3.1 Flash TTS (Mới nhất - Biểu cảm cao)', desc: 'Giọng đọc tự nhiên, diễn cảm tốt' },
  { value: 'gemini-2.5-flash-preview-tts', label: 'Gemini 2.5 Flash TTS', desc: 'Giọng đọc chuẩn, phản hồi nhanh' }
]

const TranslateVideoPage = () => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEY_API) || '')
  const [tempApiKey, setTempApiKey] = useState('')
  const [showApiDialog, setShowApiDialog] = useState(false)

  const [translateModel, setTranslateModel] = useState('gemini-2.5-flash')
  const [ttsModel, setTtsModel] = useState('gemini-3.1-flash-tts-preview')
  const [voice, setVoice] = useState('Giọng nam Hà Nội trầm ấm')

  const [file, setFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Clean up video preview URL
  useEffect(() => {
    return () => {
      if (videoPreview) URL.revokeObjectURL(videoPreview)
    }
  }, [videoPreview])

  // Progress & status message simulation during synchronous backend process
  useEffect(() => {
    if (!isProcessing) {
      setProgress(0)
      setStatusMessage('')
      return
    }

    let elapsed = 0
    const interval = setInterval(() => {
      elapsed += 1
      
      // Update progress
      setProgress((prev) => {
        if (prev >= 95) return prev
        const step = prev < 50 ? Math.random() * 4 + 1 : Math.random() * 1.5 + 0.2
        return prev + step
      })

      // Update simulated status message
      if (elapsed < 15) {
        setStatusMessage('Đang tách âm thanh giọng nói và nhạc nền bằng Demucs AI...')
      } else if (elapsed < 45) {
        setStatusMessage(`Đang dịch thuật và biên soạn phụ đề bằng ${translateModel}...`)
      } else if (elapsed < 100) {
        setStatusMessage(`Đang lồng tiếng thuyết minh tiếng Việt bằng ${ttsModel}...`)
      } else {
        setStatusMessage('Đang đồng bộ nhạc nền và gộp video thành phẩm...')
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isProcessing, translateModel, ttsModel])

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

  const handleSaveApiKey = () => {
    if (!tempApiKey.trim()) {
      toast.error('Vui lòng nhập API Key')
      return
    }
    localStorage.setItem(STORAGE_KEY_API, tempApiKey.trim())
    setApiKey(tempApiKey.trim())
    setShowApiDialog(false)
    toast.success('Đã lưu API Key (dùng chung cho toàn hệ thống)')
  }

  const handleOpenApiDialog = () => {
    setTempApiKey(apiKey)
    setShowApiDialog(true)
  }

  const handleDubVideo = async () => {
    if (!apiKey) {
      toast.error('Vui lòng cài đặt API Key trước')
      handleOpenApiDialog()
      return
    }
    if (!file) {
      toast.error('Vui lòng chọn video')
      return
    }
    if (!voice.trim()) {
      toast.error('Vui lòng nhập yêu cầu ngữ điệu giọng đọc')
      return
    }

    setIsProcessing(true)
    setProgress(5)
    setStatusMessage('Đang tải video lên máy chủ...')

    try {
      const result = await dubService.dubVideo(file, apiKey, translateModel, ttsModel, voice)

      if (result.success && result.blob) {
        setProgress(100)
        setStatusMessage('Lồng tiếng hoàn thành! Đang chuẩn bị tải xuống...')
        toast.success('Lồng tiếng video thành công!')

        // Trigger download
        const url = URL.createObjectURL(result.blob)
        const link = document.createElement('a')
        link.href = url
        link.download = result.filename || `dubbed-${file.name}`
        link.click()
        URL.revokeObjectURL(url)
        toast.success('Đã tải video lồng tiếng xuống thành công.')
      } else {
        toast.error(result.error || 'Dịch và lồng tiếng video thất bại')
      }
    } catch (error) {
      console.error(error)
      toast.error('Đã xảy ra lỗi khi lồng tiếng video')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className='container mx-auto p-6 max-w-4xl'>
      <Card className='p-0 overflow-hidden border-0 shadow-lg'>
        {/* Header gradient */}
        <div className='bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 px-6 py-5'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='bg-white/20 backdrop-blur-sm rounded-xl p-2.5'>
                <Film className='h-6 w-6 text-white' />
              </div>
              <div>
                <h2 className='text-xl font-bold text-white'>Dịch & Lồng tiếng Video (AI Dubbing)</h2>
                <p className='text-white/70 text-sm'>Dịch thuật và lồng tiếng video đa ngôn ngữ sử dụng song song AI Model</p>
              </div>
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={handleOpenApiDialog}
              className='bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm'
            >
              <Settings2 className='h-4 w-4 mr-1.5' />
              API Key
            </Button>
          </div>
        </div>

        <div className='p-6 space-y-6'>
          {/* Models selection row */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            {/* Model 1: Translate */}
            <div className='space-y-2'>
              <Label className='text-sm font-medium flex items-center gap-1.5'>
                <Sparkles className='h-3.5 w-3.5 text-amber-500' />
                1. Model Dịch thuật & SRT
              </Label>
              <Select value={translateModel} onValueChange={setTranslateModel}>
                <SelectTrigger id='translate-model-select' className='w-full'>
                  <SelectValue placeholder='Chọn model dịch thuật' />
                </SelectTrigger>
                <SelectContent>
                  {TRANSLATE_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <div className='flex flex-col'>
                        <span className='font-medium'>{m.label}</span>
                        <span className='text-xs text-muted-foreground'>{m.desc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Model 2: TTS */}
            <div className='space-y-2'>
              <Label className='text-sm font-medium flex items-center gap-1.5'>
                <Mic className='h-3.5 w-3.5 text-red-500' />
                2. Model Giọng Đọc (TTS)
              </Label>
              <Select value={ttsModel} onValueChange={setTtsModel}>
                <SelectTrigger id='tts-model-select' className='w-full'>
                  <SelectValue placeholder='Chọn model giọng đọc' />
                </SelectTrigger>
                <SelectContent>
                  {TTS_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <div className='flex flex-col'>
                        <span className='font-medium'>{m.label}</span>
                        <span className='text-xs text-muted-foreground'>{m.desc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Voice Prompt Input */}
          <div className='space-y-2'>
            <Label className='text-sm font-medium flex items-center gap-1.5'>
              <Volume2 className='h-3.5 w-3.5 text-orange-500' />
              Yêu cầu ngữ điệu giọng đọc
            </Label>
            <Input
              id='voice-input'
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              placeholder='Ví dụ: Giọng nam Hà Nội trầm ấm, đọc diễn cảm hoặc giọng nữ miền Nam ngọt ngào...'
              className='w-full'
            />
          </div>

          {/* File upload / preview area */}
          {!file ? (
            <div
              className={`relative border-2 border-dashed rounded-xl transition-all duration-300 ${
                isDragging
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10 scale-[1.01]'
                  : 'border-muted-foreground/25 hover:border-amber-400 hover:bg-amber-50/30 dark:hover:bg-amber-500/5'
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
                id='video-input-file'
              />
              <div className='flex flex-col items-center justify-center py-12 px-4 pointer-events-none'>
                <div className='bg-muted rounded-full p-3.5 mb-3'>
                  <Upload className='h-8 w-8 text-muted-foreground' />
                </div>
                <p className='font-medium text-foreground'>Kéo thả video của bạn vào đây</p>
                <p className='text-sm text-muted-foreground mt-1'>
                  hoặc nhấn để chọn file • Hỗ trợ MP4, MKV, AVI, MOV, ...
                </p>
              </div>
            </div>
          ) : (
            <div className='border rounded-xl overflow-hidden bg-muted/30'>
              {/* Video preview */}
              {videoPreview && (
                <div className='relative bg-black flex justify-center'>
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
                  <div className='bg-amber-100 dark:bg-amber-500/20 rounded-lg p-2 shrink-0'>
                    <FileVideo className='h-5 w-5 text-amber-600 dark:text-amber-400' />
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
                  disabled={isProcessing}
                  className='shrink-0 text-muted-foreground hover:text-destructive'
                >
                  <X className='h-4 w-4' />
                </Button>
              </div>
            </div>
          )}

          {/* Progress bar */}
          {isProcessing && (
            <div className='space-y-2 animate-in fade-in slide-in-from-top-2'>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-muted-foreground flex items-center gap-2'>
                  <Loader2 className='h-3.5 w-3.5 animate-spin' />
                  {statusMessage || 'Đang xử lý lồng tiếng video...'}
                </span>
                <span className='font-mono text-xs text-muted-foreground'>
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress value={progress} className='h-2' />
              <p className='text-xs text-muted-foreground text-center'>
                Thời gian xử lý có thể kéo dài vài phút tùy theo độ dài video và cấu hình hệ thống.
              </p>
            </div>
          )}

          {/* Dub button */}
          <Button
            onClick={handleDubVideo}
            disabled={!file || isProcessing || !apiKey}
            className='w-full h-12 text-base font-semibold bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-700 hover:to-red-700 shadow-lg shadow-amber-500/25 transition-all duration-300 hover:shadow-amber-500/40 hover:scale-[1.01] active:scale-[0.99]'
            id='dub-video-btn'
          >
            {isProcessing ? (
              <span className='flex items-center gap-2'>
                <Loader2 className='h-5 w-5 animate-spin' />
                Đang xử lý lồng tiếng...
              </span>
            ) : (
              <span className='flex items-center gap-2'>
                <Download className='h-5 w-5' />
                Bắt đầu lồng tiếng nâng cao
              </span>
            )}
          </Button>

          {/* API Key hint */}
          {!apiKey && (
            <p className='text-center text-sm text-amber-600 dark:text-amber-400 animate-pulse'>
              ⚠️ Vui lòng cài đặt API Key để bắt đầu sử dụng dịch vụ lồng tiếng
            </p>
          )}
        </div>
      </Card>

      {/* API Key Dialog */}
      <Dialog open={showApiDialog} onOpenChange={setShowApiDialog}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Settings2 className='h-5 w-5 text-amber-500' />
              Cài đặt API Key
            </DialogTitle>
            <DialogDescription>
              Nhập API Key của Google AI Studio để sử dụng dịch thuật và lồng tiếng. Key này dùng chung cho toàn bộ hệ thống.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-3'>
            <Label htmlFor='dub-api-key-input'>API Key</Label>
            <Input
              id='dub-api-key-input'
              type='password'
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              placeholder='AIzaSy...'
              onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
            />
            <p className='text-xs text-muted-foreground'>
              API Key sẽ được lưu trong trình duyệt (localStorage) của bạn.
            </p>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowApiDialog(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleSaveApiKey}
              className='bg-gradient-to-r from-amber-600 to-red-600'
            >
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TranslateVideoPage
