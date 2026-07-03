import { useState, useEffect, useCallback, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Mic,
  Upload,
  Download,
  FileText,
  Loader2,
  X,
  Volume2
} from 'lucide-react'
import { ttsService, type GeminiVoice } from '@/services/tts.service'

const DEFAULT_VOICE = 'Bình An'

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


const TextToSpeechPage = () => {
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
      setVoices([{ id: DEFAULT_VOICE, gender: 'Male', character: 'Điềm đạm' }])
      toast.error('Không thể tải danh sách giọng nói')
    } finally {
      setVoicesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadVoices()
  }, [loadVoices])

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
      const result = await ttsService.generate(file, selectedVoice)

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
          </div>
        </div>

        <div className='p-6 space-y-6'>
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
                  {selectedVoice && selectedVoiceInfo && (() => {
                    const isFemale = isFemaleVoice(selectedVoiceInfo)
                    const isMale = isMaleVoice(selectedVoiceInfo)
                    const genderLabel = isFemale ? 'Nữ' : isMale ? 'Nam' : 'Khác'
                    return `${selectedVoice} (${genderLabel} · ${cleanCharacter(selectedVoiceInfo.character, selectedVoiceInfo.id)})`
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
                  .map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <div className='flex items-center justify-between w-full gap-3'>
                        <span className='font-medium'>{voice.id}</span>
                        <span
                          className={`text-xs ${getCharacterColorClass(voice.character)}`}
                        >
                          {cleanCharacter(voice.character, voice.id)}
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
                  .map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <div className='flex items-center justify-between w-full gap-3'>
                        <span className='font-medium'>{voice.id}</span>
                        <span
                          className={`text-xs ${getCharacterColorClass(voice.character)}`}
                        >
                          {cleanCharacter(voice.character, voice.id)}
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
                      .map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          <div className='flex items-center justify-between w-full gap-3'>
                            <span className='font-medium'>{voice.id}</span>
                            <span
                              className={`text-xs ${getCharacterColorClass(voice.character)}`}
                            >
                              {cleanCharacter(voice.character, voice.id)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                  </>
                )}
              </SelectContent>
            </Select>

            {/* Selected voice info card */}
            {selectedVoiceInfo && (() => {
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
                  <div className='bg-gradient-to-br from-rose-500 to-fuchsia-500 rounded-full h-9 w-9 flex items-center justify-center shrink-0'>
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
            disabled={!file || isGenerating}
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
        </div>
      </Card>
    </div>
  )
}

export default TextToSpeechPage
