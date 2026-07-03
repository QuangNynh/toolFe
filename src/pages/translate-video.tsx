import React, { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
  Mic,
  User,
  Users,
  Languages as LanguagesIcon
} from 'lucide-react'
import { dubService } from '@/services/dub.service'
import { ttsService } from '@/services/tts.service'

const STORAGE_KEY_API = 'translate_api_key'

const LANGUAGES = [
  { value: 'Vietnamese', label: 'Tiếng Việt (Vietnamese)' },
  { value: 'English', label: 'Tiếng Anh (English)' },
  { value: 'Japanese', label: 'Tiếng Nhật (Japanese)' },
  { value: 'Korean', label: 'Tiếng Hàn (Korean)' },
  { value: 'Chinese', label: 'Tiếng Trung (Chinese)' },
  { value: 'French', label: 'Tiếng Pháp (French)' },
  { value: 'Spanish', label: 'Tiếng Tây Ban Nha (Spanish)' },
  { value: 'German', label: 'Tiếng Đức (German)' }
]

const FALLBACK_VOICES = [
  { id: 'Bình An', label: 'Bình An', gender: 'Male', character: 'Điềm đạm' },
  { id: 'Ngọc Lan', label: 'Ngọc Lan', gender: 'Female', character: 'Dịu dàng' },
  { id: 'Gia Bảo', label: 'Gia Bảo', gender: 'Male', character: 'Mượt mà' },
  { id: 'Thái Sơn', label: 'Thái Sơn', gender: 'Male', character: 'Chắc khỏe' },
  { id: 'Đức Trí', label: 'Đức Trí', gender: 'Male', character: 'Rõ ràng' },
  { id: 'Mỹ Duyên', label: 'Mỹ Duyên', gender: 'Female', character: 'Mượt mà' },
  { id: 'Trúc Ly', label: 'Trúc Ly', gender: 'Female', character: 'Trẻ trung' },
  { id: 'Xuân Vĩnh', label: 'Xuân Vĩnh', gender: 'Male', character: 'Vui tươi' },
  { id: 'Trọng Hữu', label: 'Trọng Hữu', gender: 'Male', character: 'Uyên bác' },
  { id: 'Ngọc Linh', label: 'Ngọc Linh', gender: 'Female', character: 'Tươi sáng' },
]

const isFemaleVoice = (v: { gender: string; character: string; id: string }) => {
  if (v.gender === 'Female') return true
  if (v.gender === 'Male') return false
  const desc = (v.character || '').toLowerCase()
  return desc.includes('nữ') || desc.includes('female')
}

const isMaleVoice = (v: { gender: string; character: string; id: string }) => {
  if (v.gender === 'Male') return true
  if (v.gender === 'Female') return false
  const desc = (v.character || '').toLowerCase()
  return desc.includes('nam') || desc.includes('male')
}

const cleanCharacter = (char: string, id: string) => {
  if (!char) return ''
  const prefix = `${id} — `
  if (char.startsWith(prefix)) {
    return char.substring(prefix.length)
  }
  return char
}

const getCharacterColorClass = (char: string) => {
  const lowercaseChar = char.toLowerCase()
  if (lowercaseChar.includes('dịu dàng')) return 'text-pink-500'
  if (lowercaseChar.includes('mượt mà')) return 'text-indigo-500'
  if (lowercaseChar.includes('chắc khỏe')) return 'text-blue-600'
  if (lowercaseChar.includes('rõ ràng')) return 'text-sky-500'
  if (lowercaseChar.includes('trẻ trung')) return 'text-lime-500'
  if (lowercaseChar.includes('vui tươi')) return 'text-yellow-500'
  if (lowercaseChar.includes('uyên bác')) return 'text-teal-600'
  if (lowercaseChar.includes('điềm đạm')) return 'text-slate-500'
  if (lowercaseChar.includes('tươi sáng')) return 'text-orange-500'
  return 'text-muted-foreground'
}

const TranslateVideoPage = () => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEY_API) || '')
  const [tempApiKey, setTempApiKey] = useState('')
  const [showApiDialog, setShowApiDialog] = useState(false)

  const [targetLanguage, setTargetLanguage] = useState('Vietnamese')
  const [voice, setVoice] = useState('Bình An')
  const [voices, setVoices] = useState<{ id: string; gender: string; character: string }[]>(FALLBACK_VOICES)
  const [voicesLoading, setVoicesLoading] = useState(false)

  const [file, setFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch dynamic voices from API on mount
  useEffect(() => {
    const loadVoices = async () => {
      setVoicesLoading(true)
      try {
        const data = await ttsService.getVoices()
        if (data && data.voices && data.voices.length > 0) {
          setVoices(data.voices)
        }
      } catch {
        // Fallback already set in useState
      } finally {
        setVoicesLoading(false)
      }
    }
    loadVoices()
  }, [])

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
        setStatusMessage(`Đang dịch thuật và biên soạn phụ đề sang tiếng ${targetLanguage === 'Vietnamese' ? 'Việt' : targetLanguage}...`)
      } else if (elapsed < 100) {
        setStatusMessage(`Đang lồng tiếng thuyết minh bằng giọng ${voice}...`)
      } else {
        setStatusMessage('Đang đồng bộ nhạc nền và gộp video thành phẩm...')
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isProcessing, targetLanguage, voice])

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
    if (!voice) {
      toast.error('Vui lòng chọn giọng lồng tiếng')
      return
    }

    setIsProcessing(true)
    setProgress(5)
    setStatusMessage('Đang tải video lên máy chủ...')

    try {
      const result = await dubService.dubVideo(file, voice, apiKey, targetLanguage)

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
          {/* Controls selection row */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            {/* Control 1: Target Language */}
            <div className='space-y-2'>
              <Label className='text-sm font-medium flex items-center gap-1.5'>
                <LanguagesIcon className='h-3.5 w-3.5 text-amber-500' />
                1. Ngôn ngữ mục tiêu (Target Language)
              </Label>
              <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                <SelectTrigger id='target-language-select' className='w-full'>
                  <SelectValue placeholder='Chọn ngôn ngữ dịch' />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Control 2: Voice selection */}
            <div className='space-y-2'>
              <Label className='text-sm font-medium flex items-center gap-1.5'>
                <Mic className='h-3.5 w-3.5 text-red-500' />
                2. Giọng lồng tiếng (Voice)
                {voicesLoading && <Loader2 className='h-3 w-3 animate-spin text-muted-foreground' />}
              </Label>
              <Select value={voice} onValueChange={setVoice}>
                <SelectTrigger id='voice-select' className='w-full'>
                  <SelectValue placeholder='Chọn giọng nói'>
                    {voice && (() => {
                      const v = voices.find((item) => item.id === voice)
                      if (!v) return voice
                      const isFemale = isFemaleVoice(v)
                      const isMale = isMaleVoice(v)
                      const genderLabel = isFemale ? 'Nữ' : isMale ? 'Nam' : 'Khác'
                      return `${voice} (${genderLabel} · ${cleanCharacter(v.character, v.id)})`
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className='max-h-80'>
                  {/* Female voices */}
                  <div className='px-2 py-1'>
                    <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1'>
                      Nữ
                    </p>
                  </div>
                  {voices
                    .filter((v) => isFemaleVoice(v))
                    .map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        <div className='flex items-center justify-between w-full gap-3'>
                          <span className='font-medium'>{v.id}</span>
                          <span
                            className={`text-xs ${getCharacterColorClass(v.character)}`}
                          >
                            {cleanCharacter(v.character, v.id)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  <Separator className='my-1' />
                  {/* Male voices */}
                  <div className='px-2 py-1'>
                    <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1'>
                      Nam
                    </p>
                  </div>
                  {voices
                    .filter((v) => isMaleVoice(v))
                    .map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        <div className='flex items-center justify-between w-full gap-3'>
                          <span className='font-medium'>{v.id}</span>
                          <span
                            className={`text-xs ${getCharacterColorClass(v.character)}`}
                          >
                            {cleanCharacter(v.character, v.id)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  {/* Other / Unknown voices */}
                  {voices.filter((v) => !isFemaleVoice(v) && !isMaleVoice(v)).length > 0 && (
                    <>
                      <Separator className='my-1' />
                      <div className='px-2 py-1'>
                        <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1'>
                          Khác
                        </p>
                      </div>
                      {voices
                        .filter((v) => !isFemaleVoice(v) && !isMaleVoice(v))
                        .map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            <div className='flex items-center justify-between w-full gap-3'>
                              <span className='font-medium'>{v.id}</span>
                              <span
                                className={`text-xs ${getCharacterColorClass(v.character)}`}
                              >
                                {cleanCharacter(v.character, v.id)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Selected voice info card */}
          {voice && voices.find((v) => v.id === voice) && (() => {
            const selectedVoiceInfo = voices.find((v) => v.id === voice)!
            const isFemale = isFemaleVoice(selectedVoiceInfo)
            const isMale = isMaleVoice(selectedVoiceInfo)
            const genderLabel = isFemale ? 'Nữ' : isMale ? 'Nam' : 'Khác'
            const badgeColor = isFemale
              ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
              : isMale
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300'
            return (
              <div className='flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-2.5 animate-in fade-in'>
                <div className='bg-gradient-to-br from-amber-500 to-red-500 rounded-full h-9 w-9 flex items-center justify-center shrink-0'>
                  <span className='text-white text-sm font-bold'>{selectedVoiceInfo.id[0]}</span>
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='font-semibold text-sm'>{selectedVoiceInfo.id}</p>
                  <p className='text-xs text-muted-foreground'>{cleanCharacter(selectedVoiceInfo.character, selectedVoiceInfo.id)}</p>
                </div>
                <Badge className={`text-xs ${badgeColor} border-0`}>
                  {genderLabel}
                </Badge>
              </div>
            )
          })()}

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
