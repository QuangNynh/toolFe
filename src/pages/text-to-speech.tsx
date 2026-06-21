import { useState, useEffect, useCallback, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Mic,
  Upload,
  Download,
  Settings2,
  FileText,
  Loader2,
  X,
  Volume2,
  Sparkles,
  User,
  Users
} from 'lucide-react'
import { ttsService, type GeminiVoice } from '@/services/tts.service'
import { translateService, type ModelInfo } from '@/services/translate.service'

// Dùng chung API key với màn dịch phụ đề
const STORAGE_KEY_API = 'translate_api_key'
const DEFAULT_MODEL = 'gemini-2.5-flash-preview-tts'
const DEFAULT_VOICE = 'Kore'

// Gender color mapping
const genderBadge: Record<string, { color: string; icon: typeof User }> = {
  Female: { color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300', icon: User },
  Male: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: Users }
}

// Character style → color accent
const characterColor: Record<string, string> = {
  Bright: 'text-yellow-500',
  Upbeat: 'text-orange-500',
  Informative: 'text-blue-500',
  Firm: 'text-slate-600',
  Excitable: 'text-red-500',
  Youthful: 'text-lime-500',
  Breezy: 'text-teal-500',
  'Easy-going': 'text-green-500',
  Breathy: 'text-purple-400',
  Clear: 'text-sky-500',
  Smooth: 'text-indigo-500',
  Mature: 'text-amber-600',
  Forward: 'text-rose-500',
  Warm: 'text-orange-400',
  Gentle: 'text-emerald-500',
  Casual: 'text-gray-500',
  Soft: 'text-violet-400',
  Even: 'text-slate-500',
  Lively: 'text-fuchsia-500',
  Knowledgeable: 'text-cyan-600',
  Direct: 'text-red-600'
}

const TextToSpeechPage = () => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEY_API) || '')
  const [tempApiKey, setTempApiKey] = useState('')
  const [showApiDialog, setShowApiDialog] = useState(false)

  const [model, setModel] = useState(DEFAULT_MODEL)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [voices, setVoices] = useState<GeminiVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState(DEFAULT_VOICE)
  const [voicesLoading, setVoicesLoading] = useState(false)

  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load voices on mount
  const loadVoices = useCallback(async () => {
    setVoicesLoading(true)
    try {
      const data = await ttsService.getVoices()
      setVoices(data.voices)
    } catch {
      setVoices([{ id: DEFAULT_VOICE, gender: 'Female', character: 'Firm' }])
      toast.error('Không thể tải danh sách giọng nói')
    } finally {
      setVoicesLoading(false)
    }
  }, [])

  // Load models (same API as translate page)
  const loadModels = useCallback(async (key: string) => {
    if (!key) return
    setModelsLoading(true)
    try {
      const data = await translateService.getModels(key)
      setModels(data.models)
    } catch {
      // keep empty, user can still type manually
    } finally {
      setModelsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadVoices()
  }, [loadVoices])

  useEffect(() => {
    if (apiKey) loadModels(apiKey)
  }, [apiKey, loadModels])

  // Simulate progress during generation
  useEffect(() => {
    if (!isGenerating) {
      setProgress(0)
      return
    }
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev
        return prev + Math.random() * 4
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isGenerating])

  const handleSaveApiKey = () => {
    if (!tempApiKey.trim()) {
      toast.error('Vui lòng nhập API Key')
      return
    }
    localStorage.setItem(STORAGE_KEY_API, tempApiKey.trim())
    setApiKey(tempApiKey.trim())
    setShowApiDialog(false)
    toast.success('Đã lưu API Key (dùng chung với màn Dịch phụ đề SRT)')
  }

  const handleOpenApiDialog = () => {
    setTempApiKey(apiKey)
    setShowApiDialog(true)
  }

  // File handlers
  const handleFileSelect = (f: File) => {
    if (!f.name.endsWith('.srt')) {
      toast.error('Chỉ chấp nhận file .srt')
      return
    }
    setFile(f)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFileSelect(f)
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
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }

  const clearFile = () => {
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleGenerate = async () => {
    if (!apiKey) {
      toast.error('Vui lòng cài đặt API Key trước')
      handleOpenApiDialog()
      return
    }
    if (!file) {
      toast.error('Vui lòng chọn file SRT')
      return
    }
    if (!selectedVoice) {
      toast.error('Vui lòng chọn giọng nói')
      return
    }

    setIsGenerating(true)
    setProgress(0)

    try {
      const result = await ttsService.generate(file, selectedVoice, model, apiKey)

      if (result.success && result.blob) {
        setProgress(100)
        const url = URL.createObjectURL(result.blob)
        const link = document.createElement('a')
        link.href = url
        link.download = result.filename || `tts-${selectedVoice}.mp3`
        link.click()
        URL.revokeObjectURL(url)
        toast.success('Tạo audio thành công! File MP3 đã được tải xuống.')
      } else {
        toast.error(result.error || 'Tạo audio thất bại')
      }
    } catch {
      toast.error('Đã xảy ra lỗi khi tạo audio')
    } finally {
      setIsGenerating(false)
    }
  }

  const selectedVoiceInfo = voices.find((v) => v.id === selectedVoice)

  return (
    <div className='container mx-auto p-6 max-w-4xl'>
      <Card className='p-0 overflow-hidden border-0 shadow-lg'>
        {/* Header gradient */}
        <div className='bg-gradient-to-r from-rose-600 via-pink-600 to-fuchsia-600 px-6 py-5'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='bg-white/20 backdrop-blur-sm rounded-xl p-2.5'>
                <Mic className='h-6 w-6 text-white' />
              </div>
              <div>
                <h2 className='text-xl font-bold text-white'>Text to Speech</h2>
                <p className='text-white/70 text-sm'>Chuyển file SRT thành giọng nói AI Gemini</p>
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
          {/* Model – dùng chung với màn dịch phụ đề */}
          <div className='space-y-2'>
            <Label className='text-sm font-medium flex items-center gap-1.5'>
              <Sparkles className='h-3.5 w-3.5 text-fuchsia-500' />
              Model TTS
              {modelsLoading && <Loader2 className='h-3 w-3 animate-spin text-muted-foreground' />}
            </Label>
            {models.length > 0 ? (
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger id='tts-model-select' className='w-full'>
                  <SelectValue>
                    {models.find((m) => m.name.replace('models/', '') === model)?.displayName || model}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.name} value={m.name.replace('models/', '')}>
                      <div className='flex flex-col'>
                        <span className='font-medium'>{m.displayName}</span>
                        <span className='text-xs text-muted-foreground truncate max-w-[280px]'>
                          {m.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id='tts-model-input'
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder='gemini-2.5-flash-preview-tts'
                className='font-mono text-sm'
              />
            )}
          </div>

          {/* Voice selection */}
          <div className='space-y-2'>
            <Label className='text-sm font-medium flex items-center gap-1.5'>
              <Volume2 className='h-3.5 w-3.5 text-rose-500' />
              Giọng nói
              {voicesLoading && <Loader2 className='h-3 w-3 animate-spin text-muted-foreground' />}
            </Label>
            <Select value={selectedVoice} onValueChange={setSelectedVoice}>
              <SelectTrigger id='voice-select' className='w-full'>
                <SelectValue placeholder='Chọn giọng nói'>
                  {selectedVoice && selectedVoiceInfo && (
                    <span className='flex items-center gap-2'>
                      <span>{selectedVoice}</span>
                      <span className='text-xs text-muted-foreground'>
                        {selectedVoiceInfo.gender} · {selectedVoiceInfo.character}
                      </span>
                    </span>
                  )}
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
                  .filter((v) => v.gender === 'Female')
                  .map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <div className='flex items-center justify-between w-full gap-3'>
                        <span className='font-medium'>{voice.id}</span>
                        <span
                          className={`text-xs ${characterColor[voice.character] || 'text-muted-foreground'}`}
                        >
                          {voice.character}
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
                  .filter((v) => v.gender === 'Male')
                  .map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <div className='flex items-center justify-between w-full gap-3'>
                        <span className='font-medium'>{voice.id}</span>
                        <span
                          className={`text-xs ${characterColor[voice.character] || 'text-muted-foreground'}`}
                        >
                          {voice.character}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {/* Selected voice info card */}
            {selectedVoiceInfo && (
              <div className='flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-2.5 animate-in fade-in'>
                <div className='bg-gradient-to-br from-rose-500 to-fuchsia-500 rounded-full h-9 w-9 flex items-center justify-center shrink-0'>
                  <span className='text-white text-sm font-bold'>{selectedVoiceInfo.id[0]}</span>
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='font-semibold text-sm'>{selectedVoiceInfo.id}</p>
                  <p className='text-xs text-muted-foreground'>{selectedVoiceInfo.character}</p>
                </div>
                <Badge
                  className={`text-xs ${genderBadge[selectedVoiceInfo.gender]?.color || ''} border-0`}
                >
                  {selectedVoiceInfo.gender === 'Female' ? 'Nữ' : 'Nam'}
                </Badge>
              </div>
            )}
          </div>

          {/* File upload */}
          {!file ? (
            <div
              className={`relative border-2 border-dashed rounded-xl transition-all duration-300 ${
                isDragging
                  ? 'border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-500/10 scale-[1.01]'
                  : 'border-muted-foreground/25 hover:border-rose-400 hover:bg-rose-50/30 dark:hover:bg-rose-500/5'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type='file'
                accept='.srt'
                onChange={handleInputChange}
                className='absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10'
                id='srt-tts-file-input'
              />
              <div className='flex flex-col items-center justify-center py-10 px-4 pointer-events-none'>
                <div className='bg-muted rounded-full p-3.5 mb-3'>
                  <Upload className='h-8 w-8 text-muted-foreground' />
                </div>
                <p className='font-medium text-foreground'>Kéo thả file SRT vào đây</p>
                <p className='text-sm text-muted-foreground mt-1'>hoặc nhấn để chọn file .srt</p>
              </div>
            </div>
          ) : (
            <div className='flex items-center gap-3 rounded-xl border bg-green-50/50 dark:bg-green-500/5 border-green-200 dark:border-green-800 px-4 py-3'>
              <div className='bg-green-100 dark:bg-green-500/20 rounded-lg p-2 shrink-0'>
                <FileText className='h-5 w-5 text-green-600 dark:text-green-400' />
              </div>
              <div className='flex-1 min-w-0'>
                <p className='font-medium text-sm truncate'>{file.name}</p>
                <p className='text-xs text-muted-foreground'>
                  {(file.size / 1024).toFixed(1)} KB
                </p>
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
          )}

          {/* Progress */}
          {isGenerating && (
            <div className='space-y-2 animate-in fade-in slide-in-from-top-2'>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-muted-foreground flex items-center gap-2'>
                  <Loader2 className='h-3.5 w-3.5 animate-spin' />
                  Đang tạo audio với giọng {selectedVoice}...
                </span>
                <span className='font-mono text-xs text-muted-foreground'>
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress value={progress} className='h-2' />
              <p className='text-xs text-muted-foreground text-center'>
                Quá trình có thể mất vài phút tùy độ dài file SRT
              </p>
            </div>
          )}

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={!file || isGenerating || !apiKey}
            id='tts-generate-btn'
            className='w-full h-12 text-base font-semibold bg-gradient-to-r from-rose-600 to-fuchsia-600 hover:from-rose-700 hover:to-fuchsia-700 shadow-lg shadow-rose-500/25 transition-all duration-300 hover:shadow-rose-500/40 hover:scale-[1.01] active:scale-[0.99]'
          >
            {isGenerating ? (
              <span className='flex items-center gap-2'>
                <Loader2 className='h-5 w-5 animate-spin' />
                Đang tạo...
              </span>
            ) : (
              <span className='flex items-center gap-2'>
                <Download className='h-5 w-5' />
                Tạo Audio & Tải xuống
              </span>
            )}
          </Button>

          {!apiKey && (
            <p className='text-center text-sm text-amber-600 dark:text-amber-400 animate-pulse'>
              ⚠️ Vui lòng cài đặt API Key để bắt đầu sử dụng
            </p>
          )}
        </div>
      </Card>

      {/* API Key Dialog */}
      <Dialog open={showApiDialog} onOpenChange={setShowApiDialog}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Settings2 className='h-5 w-5 text-rose-500' />
              Cài đặt API Key
            </DialogTitle>
            <DialogDescription>
              Nhập Google AI Studio API Key. Key này dùng chung với màn <strong>Dịch phụ đề SRT</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-3'>
            <Label htmlFor='tts-api-key-input'>API Key</Label>
            <Input
              id='tts-api-key-input'
              type='password'
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              placeholder='AIzaSy...'
              onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
            />
            <p className='text-xs text-muted-foreground'>
              API Key được lưu trong trình duyệt (localStorage).
            </p>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowApiDialog(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleSaveApiKey}
              className='bg-gradient-to-r from-rose-600 to-fuchsia-600'
            >
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TextToSpeechPage
