import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Mic,
  Upload,
  Download,
  FileText,
  Loader2,
  X,
  Volume2,
  Search
} from 'lucide-react'
import { ttsService, type GeminiVoice, type NineRouterVoice } from '@/services/tts.service'

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

const LOCALE_NAMES: Record<string, string> = {
  'vi-vn': 'Tiếng Việt (vi-VN)',
  'vi': 'Tiếng Việt (vi)',
  'en-us': 'Tiếng Anh (en-US)',
  'en-gb': 'Tiếng Anh (en-GB)',
  'zh-cn': 'Tiếng Trung (zh-CN)',
  'ja-jp': 'Tiếng Nhật (ja-JP)',
  'ko-kr': 'Tiếng Hàn (ko-KR)',
  'fr-fr': 'Tiếng Pháp (fr-FR)',
  'de-de': 'Tiếng Đức (de-DE)',
  'es-es': 'Tiếng Tây Ban Nha (es-ES)',
}

const getLocaleLabel = (loc: string) => {
  if (!loc) return ''
  const key = loc.toLowerCase()
  return LOCALE_NAMES[key] || loc
}

const TextToSpeechPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'gemini'

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val }, { replace: true })
  }

  // Gemini state
  const [voices, setVoices] = useState<GeminiVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState(DEFAULT_VOICE)
  const [voicesLoading, setVoicesLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // 9Router state
  const [nineRouterVoices, setNineRouterVoices] = useState<NineRouterVoice[]>([])
  const [nineRouterVoicesLoading, setNineRouterVoicesLoading] = useState(false)
  const [selectedNineRouterVoice, setSelectedNineRouterVoice] = useState('')
  const [selectedGeminiModel, setSelectedGeminiModel] = useState('gemini-3.1-flash-tts-preview')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('all')
  const [selectedLocale, setSelectedLocale] = useState('vi') // Default to Vietnamese for convenience
  const [nineRouterInput, setNineRouterInput] = useState('')

  // Shared state
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null)
  const [generatedAudioName, setGeneratedAudioName] = useState<string>('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load Gemini voices on mount
  const loadVoices = useCallback(async () => {
    setVoicesLoading(true)
    try {
      const data = await ttsService.getVoices()
      setVoices(data.voices)
    } catch {
      setVoices([{ id: DEFAULT_VOICE, gender: 'Male', character: 'Điềm đạm' }])
      toast.error('Không thể tải danh sách giọng nói Gemini')
    } finally {
      setVoicesLoading(false)
    }
  }, [])

  // Load 9Router voices on mount
  const loadNineRouterVoices = useCallback(async () => {
    setNineRouterVoicesLoading(true)
    try {
      const data = await ttsService.getNineRouterVoices()
      setNineRouterVoices(data)
      
      // Auto select first edge-tts/vi-VN voice if available
      let defaultVoice = data.find(v => v.provider === 'edge-tts' && v.locale.toLowerCase().startsWith('vi'))
      if (!defaultVoice) {
        defaultVoice = data.find(v => v.locale.toLowerCase().startsWith('vi'))
      }
      if (!defaultVoice && data.length > 0) {
        defaultVoice = data[0]
      }
      
      if (defaultVoice) {
        const val = defaultVoice.provider ? `${defaultVoice.provider}/${defaultVoice.id}` : defaultVoice.id
        setSelectedNineRouterVoice(val)
      }
    } catch {
      // Fallback
      const fallbacks = [
        { id: 'vi-VN-HoaiMyNeural', name: 'Hoài My', gender: 'Female', locale: 'vi-VN', provider: 'edge-tts' },
        { id: 'vi-VN-NamMinhNeural', name: 'Nam Minh', gender: 'Male', locale: 'vi-VN', provider: 'edge-tts' },
        { id: 'en-US-JennyNeural', name: 'Jenny', gender: 'Female', locale: 'en-US', provider: 'edge-tts' },
        { id: 'en-US-GuyNeural', name: 'Guy', gender: 'Male', locale: 'en-US', provider: 'edge-tts' },
      ]
      setNineRouterVoices(fallbacks)
      setSelectedNineRouterVoice('edge-tts/vi-VN-HoaiMyNeural')
      toast.error('Không thể tải danh sách giọng nói 9Router, sử dụng danh sách mặc định')
    } finally {
      setNineRouterVoicesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadVoices()
    loadNineRouterVoices()
  }, [loadVoices, loadNineRouterVoices])

  // Cleanup object URL on unmount or when it changes
  useEffect(() => {
    const url = generatedAudioUrl
    return () => {
      if (url) {
        URL.revokeObjectURL(url)
      }
    }
  }, [generatedAudioUrl])

  // Get unique providers & locales for 9Router filter
  const providers = useMemo(() => {
    const set = new Set<string>()
    nineRouterVoices.forEach(v => {
      if (v.provider) set.add(v.provider)
    })
    return Array.from(set).sort()
  }, [nineRouterVoices])

  const locales = useMemo(() => {
    const set = new Set<string>()
    nineRouterVoices.forEach(v => {
      if (v.locale) set.add(v.locale)
    })
    return Array.from(set).sort()
  }, [nineRouterVoices])

  // Filtered 9Router voices
  const filteredNineRouterVoices = useMemo(() => {
    return nineRouterVoices.filter(v => {
      const matchesSearch = searchQuery === '' || 
        v.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (v.name && v.name.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesProvider = selectedProvider === 'all' || v.provider === selectedProvider

      const matchesLocale = selectedLocale === 'all' || 
        v.locale.toLowerCase() === selectedLocale.toLowerCase() || 
        v.locale.toLowerCase().startsWith(selectedLocale.toLowerCase())

      return matchesSearch && matchesProvider && matchesLocale
    })
  }, [nineRouterVoices, searchQuery, selectedProvider, selectedLocale])

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

  const selectedVoiceInfo = voices.find((v) => v.id === selectedVoice)

  const selectedNineRouterVoiceInfo = useMemo(() => {
    return nineRouterVoices.find((v) => {
      const val = v.provider ? `${v.provider}/${v.id}` : v.id
      return val === selectedNineRouterVoice
    })
  }, [nineRouterVoices, selectedNineRouterVoice])

  const handleGenerate = async () => {
    if (activeTab === 'gemini') {
      if (!file) {
        toast.error('Vui lòng chọn file SRT')
        return
      }
      if (!selectedVoice) {
        toast.error('Vui lòng chọn giọng nói Gemini')
        return
      }
    } else {
      if (!nineRouterInput.trim()) {
        toast.error('Vui lòng nhập văn bản cần đọc')
        return
      }
      if (!selectedNineRouterVoice) {
        toast.error('Vui lòng chọn giọng nói 9Router')
        return
      }
    }

    // Reset previous audio player URL
    if (generatedAudioUrl) {
      URL.revokeObjectURL(generatedAudioUrl)
      setGeneratedAudioUrl(null)
      setGeneratedAudioName('')
    }

    setIsGenerating(true)
    setProgress(0)

    try {
      let result
      if (activeTab === 'gemini') {
        result = await ttsService.generate(file!, selectedVoice)
      } else {
        // Special logic for Gemini provider on 9Router
        let modelParam = selectedNineRouterVoice
        if (selectedNineRouterVoiceInfo?.provider === 'gemini') {
          modelParam = `gemini/${selectedGeminiModel}/${selectedNineRouterVoiceInfo.id}`
        }
        result = await ttsService.generateNineRouter(modelParam, nineRouterInput)
      }

      if (result.success && result.blob) {
        setProgress(100)
        const url = URL.createObjectURL(result.blob)
        setGeneratedAudioUrl(url)
        
        const name = result.filename || `tts-${activeTab === 'gemini' ? selectedVoice : selectedNineRouterVoice.replace(/\//g, '-')}.mp3`
        setGeneratedAudioName(name)

        // Trigger automatic download
        const link = document.createElement('a')
        link.href = url
        link.download = name
        link.click()
        
        toast.success('Tạo audio thành công! Bạn có thể nghe thử dưới đây.')
      } else {
        toast.error(result.error || 'Tạo audio thất bại')
      }
    } catch {
      toast.error('Đã xảy ra lỗi khi tạo audio')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className='container mx-auto p-3 sm:p-6 max-w-4xl'>
      <Card className='p-0 overflow-hidden border-0 shadow-lg'>
        {/* Header gradient */}
        <div className='bg-gradient-to-r from-rose-600 via-pink-600 to-fuchsia-600 px-6 py-5'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='bg-white/20 backdrop-blur-sm rounded-xl p-2.5 shrink-0'>
                <Mic className='h-6 w-6 text-white' />
              </div>
              <div>
                <h2 className='text-xl font-bold text-white'>Text to Speech</h2>
                <p className='text-white/70 text-sm'>
                  {activeTab === 'gemini'
                    ? 'Chuyển file SRT thành giọng nói AI Gemini'
                    : 'Chuyển văn bản thành giọng nói qua mô hình 9Router'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className='p-6 space-y-6'>
          {/* Tabs Container */}
          <Tabs value={activeTab} className='w-full' onValueChange={handleTabChange}>
            <TabsList className='grid w-full grid-cols-2 h-auto p-1 mb-6'>
              <TabsTrigger value='gemini' className='flex items-center justify-center gap-2 py-2'>
                <Mic className='h-4 w-4' />
                Giọng Gemini (Local)
              </TabsTrigger>
              <TabsTrigger value='9router' className='flex items-center justify-center gap-2 py-2'>
                <Volume2 className='h-4 w-4' />
                Giọng 9Router (Cloud)
              </TabsTrigger>
            </TabsList>

            {/* TAB: Gemini */}
            <TabsContent value='gemini' className='space-y-6 outline-none'>
              <div className='space-y-2'>
                <Label className='text-sm font-medium flex items-center gap-1.5'>
                  <Volume2 className='h-3.5 w-3.5 text-rose-500' />
                  Giọng nói Gemini
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

              {/* Gemini File upload */}
              <div className='space-y-2'>
                <Label className='text-sm font-medium flex items-center gap-1.5'>
                  File phụ đề SRT
                </Label>
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
              </div>
            </TabsContent>

            {/* TAB: 9Router */}
            <TabsContent value='9router' className='space-y-6 outline-none'>
              <div className='space-y-3'>
                <Label className='text-sm font-medium flex items-center gap-1.5'>
                  <Volume2 className='h-3.5 w-3.5 text-rose-500' />
                  Giọng nói 9Router
                  {nineRouterVoicesLoading && <Loader2 className='h-3 w-3 animate-spin text-muted-foreground' />}
                </Label>

                {/* Filters */}
                <div className='grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-muted/20 p-2.5 rounded-lg border'>
                  <div className='relative'>
                    <Search className='absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground' />
                    <Input
                      placeholder='Tìm kiếm giọng...'
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className='pl-8.5 h-8.5 text-xs'
                    />
                  </div>

                  <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                    <SelectTrigger className='h-8.5 text-xs'>
                      <SelectValue placeholder='Nhà cung cấp' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>Tất cả Provider</SelectItem>
                      {providers.map((prov) => (
                        <SelectItem key={prov} value={prov}>
                          {prov}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedLocale} onValueChange={setSelectedLocale}>
                    <SelectTrigger className='h-8.5 text-xs'>
                      <SelectValue placeholder='Ngôn ngữ' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>Tất cả Ngôn ngữ</SelectItem>
                      <SelectItem value='vi'>Tiếng Việt (vi)</SelectItem>
                      <SelectItem value='en'>Tiếng Anh (en)</SelectItem>
                      <SelectItem value='zh'>Tiếng Trung (zh)</SelectItem>
                      <SelectItem value='ja'>Tiếng Nhật (ja)</SelectItem>
                      <SelectItem value='ko'>Tiếng Hàn (ko)</SelectItem>
                      {locales
                        .filter((loc) => !['vi', 'en', 'zh', 'ja', 'ko'].includes(loc.slice(0, 2).toLowerCase()))
                        .map((loc) => (
                          <SelectItem key={loc} value={loc}>
                            {getLocaleLabel(loc)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Main Voice Selector */}
                <Select value={selectedNineRouterVoice} onValueChange={setSelectedNineRouterVoice}>
                  <SelectTrigger id='nine-router-voice-select' className='w-full'>
                    <SelectValue placeholder='Chọn giọng nói 9Router'>
                      {selectedNineRouterVoiceInfo && (() => {
                        const isFemale = selectedNineRouterVoiceInfo.gender.toLowerCase() === 'female'
                        const isMale = selectedNineRouterVoiceInfo.gender.toLowerCase() === 'male'
                        const genderLabel = isFemale ? 'Nữ' : isMale ? 'Nam' : 'Khác'
                        return `${selectedNineRouterVoiceInfo.name || selectedNineRouterVoiceInfo.id} (${genderLabel} · ${selectedNineRouterVoiceInfo.provider} · ${selectedNineRouterVoiceInfo.locale})`
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className='max-h-80'>
                    {filteredNineRouterVoices.length === 0 ? (
                      <div className='py-6 text-center text-sm text-muted-foreground'>
                        Không tìm thấy giọng nói phù hợp
                      </div>
                    ) : (
                      filteredNineRouterVoices.map((voice) => {
                        const val = voice.provider ? `${voice.provider}/${voice.id}` : voice.id
                        const isFemale = voice.gender.toLowerCase() === 'female'
                        const isMale = voice.gender.toLowerCase() === 'male'
                        const genderLabel = isFemale ? 'Nữ' : isMale ? 'Nam' : 'Khác'
                        return (
                          <SelectItem key={val} value={val}>
                            <div className='flex items-center justify-between w-full gap-3'>
                              <span className='font-medium'>{voice.name || voice.id}</span>
                              <span className='text-xs text-muted-foreground'>
                                {genderLabel} · {voice.provider} · {voice.locale}
                              </span>
                            </div>
                          </SelectItem>
                        )
                      })
                    )}
                  </SelectContent>
                </Select>

                {/* Gemini Model Selection Dropdown (Only when provider is 'gemini') */}
                {selectedNineRouterVoiceInfo?.provider === 'gemini' && (
                  <div className='space-y-1.5 bg-violet-50/50 dark:bg-violet-950/20 p-3 rounded-lg border border-violet-100 dark:border-violet-900/50 animate-in fade-in slide-in-from-top-2 duration-300'>
                    <Label className='text-xs font-semibold text-violet-700 dark:text-violet-300 flex items-center gap-1.5'>
                      <Mic className='h-3.5 w-3.5' />
                      Model Gemini TTS
                    </Label>
                    <Select value={selectedGeminiModel} onValueChange={setSelectedGeminiModel}>
                      <SelectTrigger className='h-9 w-full bg-background border-violet-200 dark:border-violet-800 focus:ring-violet-500'>
                        <SelectValue placeholder='Chọn model Gemini' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='gemini-3.1-flash-tts-preview'>
                          gemini-3.1-flash-tts-preview
                        </SelectItem>
                        <SelectItem value='gemini-2.5-flash-preview-tts'>
                          gemini-2.5-flash-preview-tts
                        </SelectItem>
                        <SelectItem value='gemini-2.5-pro-preview-tts'>
                          gemini-2.5-pro-preview-tts
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Selected Voice Info Card */}
                {selectedNineRouterVoiceInfo && (() => {
                  const isFemale = selectedNineRouterVoiceInfo.gender.toLowerCase() === 'female'
                  const isMale = selectedNineRouterVoiceInfo.gender.toLowerCase() === 'male'
                  const genderLabel = isFemale ? 'Nữ' : isMale ? 'Nam' : 'Khác'
                  const badgeColor = isFemale
                    ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
                    : isMale
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300'
                  return (
                    <div className='flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-2.5 animate-in fade-in'>
                      <div className='bg-gradient-to-br from-violet-500 to-indigo-500 rounded-full h-9 w-9 flex items-center justify-center shrink-0'>
                        <span className='text-white text-sm font-bold'>
                          {selectedNineRouterVoiceInfo.name ? selectedNineRouterVoiceInfo.name[0] : '9'}
                        </span>
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className='font-semibold text-sm'>{selectedNineRouterVoiceInfo.name || selectedNineRouterVoiceInfo.id}</p>
                        <p className='text-xs text-muted-foreground truncate'>
                          Model:{' '}
                          {selectedNineRouterVoiceInfo.provider === 'gemini'
                            ? `gemini/${selectedGeminiModel}/${selectedNineRouterVoiceInfo.id}`
                            : `${selectedNineRouterVoiceInfo.provider}/${selectedNineRouterVoiceInfo.id}`}{' '}
                          · Locale: {selectedNineRouterVoiceInfo.locale}
                        </p>
                      </div>
                      <Badge className={`text-xs ${badgeColor} border-0`}>
                        {genderLabel}
                      </Badge>
                    </div>
                  )
                })()}
              </div>

              {/* Textarea Input for 9Router */}
              <div className='space-y-2'>
                <Label className='text-sm font-medium flex items-center gap-1.5'>
                  Nội dung văn bản cần đọc
                </Label>
                <Textarea
                  placeholder='Nhập văn bản cần đọc tại đây...'
                  value={nineRouterInput}
                  onChange={(e) => setNineRouterInput(e.target.value)}
                  className='min-h-[140px] resize-y bg-background'
                />
                <div className='flex items-center justify-between text-xs text-muted-foreground'>
                  <span>Giới hạn tối đa 5000 ký tự</span>
                  <span className='font-mono'>{nineRouterInput.length} ký tự</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Shared: Progress */}
          {isGenerating && (
            <div className='space-y-2 animate-in fade-in slide-in-from-top-2'>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-muted-foreground flex items-center gap-2'>
                  <Loader2 className='h-3.5 w-3.5 animate-spin' />
                  Đang tạo audio với {activeTab === 'gemini' ? `giọng ${selectedVoice}` : 'giọng 9Router'}...
                </span>
                <span className='font-mono text-xs text-muted-foreground'>
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress value={progress} className='h-2' />
              <p className='text-xs text-muted-foreground text-center'>
                {activeTab === 'gemini'
                  ? 'Quá trình có thể mất vài phút tùy độ dài file SRT'
                  : 'Quá trình có thể mất vài giây'}
              </p>
            </div>
          )}

          {/* Shared: Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || (activeTab === 'gemini' ? !file : !nineRouterInput.trim())}
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

          {/* Audio Player Component */}
          {generatedAudioUrl && (
            <div className='bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-transparent border border-violet-200/50 dark:border-violet-800/50 p-4 rounded-xl space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Volume2 className='h-4 w-4 text-violet-600 dark:text-violet-400' />
                  <span className='text-sm font-semibold text-foreground truncate max-w-[250px] sm:max-w-[400px]'>
                    {generatedAudioName}
                  </span>
                </div>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => {
                    if (generatedAudioUrl) {
                      URL.revokeObjectURL(generatedAudioUrl)
                      setGeneratedAudioUrl(null)
                      setGeneratedAudioName('')
                    }
                  }}
                  className='h-8 w-8 p-0 text-muted-foreground hover:text-destructive'
                >
                  <X className='h-4 w-4' />
                </Button>
              </div>
              
              <audio 
                src={generatedAudioUrl} 
                controls 
                className='w-full focus:outline-none rounded-lg'
                autoPlay
              />

              <div className='flex items-center justify-end gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = generatedAudioUrl
                    link.download = generatedAudioName
                    link.click()
                  }}
                  className='h-8 text-xs flex items-center gap-1 border-violet-200 dark:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-950/30'
                >
                  <Download className='h-3.5 w-3.5' />
                  Tải lại file
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export default TextToSpeechPage
