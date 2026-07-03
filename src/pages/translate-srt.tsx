import { useState, useEffect } from 'react'
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
import { Languages, Upload, Download, Sparkles, FileText, Loader2 } from 'lucide-react'
import { translateService, type ModelInfo } from '@/services/translate.service'



const LANGUAGES = [
  { value: 'Vietnamese', label: 'Tiếng Việt' },
  { value: 'English', label: 'English' }
]

const TranslateSrtPage = () => {
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash')
  const [models, setModels] = useState<ModelInfo[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [targetLanguage, setTargetLanguage] = useState('Vietnamese')

  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const loadModels = async () => {
      setModelsLoading(true)
      try {
        const data = await translateService.getModels()
        if (data && data.models && data.models.length > 0) {
          setModels(data.models)
        }
      } catch {
        // Fallback to static items
      } finally {
        setModelsLoading(false)
      }
    }
    loadModels()
  }, [])


  // Simulate progress during translation
  useEffect(() => {
    if (!isTranslating) {
      setProgress(0)
      return
    }
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev
        return prev + Math.random() * 8
      })
    }, 800)
    return () => clearInterval(interval)
  }, [isTranslating])


  // Drag & Drop handlers
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
    if (droppedFile && droppedFile.name.endsWith('.srt')) {
      setFile(droppedFile)
    } else {
      toast.error('Chỉ chấp nhận file .srt')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.name.endsWith('.srt')) {
        setFile(selectedFile)
      } else {
        toast.error('Chỉ chấp nhận file .srt')
      }
    }
  }

  const handleTranslate = async () => {
    if (!file) {
      toast.error('Vui lòng chọn file SRT')
      return
    }

    setIsTranslating(true)
    setProgress(0)

    try {
      const result = await translateService.translateSrt(file, targetLanguage, selectedModel)

      if (result.success && result.blob) {
        setProgress(100)
        // Download the translated file
        const url = URL.createObjectURL(result.blob)
        const link = document.createElement('a')
        link.href = url
        link.download = result.filename || `translated-${file.name}`
        link.click()
        URL.revokeObjectURL(url)
        toast.success('Dịch thành công! File đã được tải xuống.')
      } else {
        toast.error(result.error || 'Dịch thất bại')
      }
    } catch {
      toast.error('Đã xảy ra lỗi khi dịch')
    } finally {
      setIsTranslating(false)
    }
  }



  return (
    <div className='container mx-auto p-6 max-w-4xl'>
      <Card className='p-0 overflow-hidden border-0 shadow-lg'>
        {/* Header gradient */}
        <div className='bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-6 py-5'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='bg-white/20 backdrop-blur-sm rounded-xl p-2.5'>
                <Languages className='h-6 w-6 text-white' />
              </div>
              <div>
                <h2 className='text-xl font-bold text-white'>Dịch file SRT</h2>
                <p className='text-white/70 text-sm'>Dịch phụ đề SRT bằng AI Gemini</p>
              </div>
            </div>

          </div>
        </div>

        <div className='p-6 space-y-6'>
          {/* Settings row */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label className='text-sm font-medium flex items-center gap-1.5'>
                <Sparkles className='h-3.5 w-3.5 text-purple-500' />
                Model AI
                {modelsLoading && <Loader2 className='h-3 w-3 animate-spin text-muted-foreground' />}
              </Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger id='model-select' className='w-full'>
                  <SelectValue placeholder='Chọn model' />
                </SelectTrigger>
                <SelectContent>
                  {models.length > 0 ? (
                    models.map((m) => (
                      <SelectItem key={m.name} value={m.name.replace('models/', '')}>
                        <div className='flex flex-col'>
                          <span className='font-medium'>{m.displayName}</span>
                          <span className='text-xs text-muted-foreground truncate max-w-[280px]'>
                            {m.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value='gemini-2.5-flash'>Gemini 2.5 Flash</SelectItem>
                      <SelectItem value='gemini-2.5-pro'>Gemini 2.5 Pro</SelectItem>
                      <SelectItem value='gemini-2.0-flash'>Gemini 2.0 Flash</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label className='text-sm font-medium flex items-center gap-1.5'>
                <Languages className='h-3.5 w-3.5 text-indigo-500' />
                Ngôn ngữ đích
              </Label>
              <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                <SelectTrigger id='language-select' className='w-full'>
                  <SelectValue />
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
          </div>

          {/* File upload area */}
          <div
            className={`relative border-2 border-dashed rounded-xl transition-all duration-300 ${
              isDragging
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10 scale-[1.01]'
                : file
                  ? 'border-green-400 bg-green-50/50 dark:bg-green-500/5'
                  : 'border-muted-foreground/25 hover:border-purple-400 hover:bg-purple-50/30 dark:hover:bg-purple-500/5'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type='file'
              accept='.srt'
              onChange={handleFileSelect}
              className='absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10'
              id='srt-file-input'
            />
            <div className='flex flex-col items-center justify-center py-10 px-4 pointer-events-none'>
              {file ? (
                <>
                  <div className='bg-green-100 dark:bg-green-500/20 rounded-full p-3 mb-3'>
                    <FileText className='h-8 w-8 text-green-600 dark:text-green-400' />
                  </div>
                  <p className='font-semibold text-green-700 dark:text-green-400'>{file.name}</p>
                  <p className='text-xs text-muted-foreground mt-1'>
                    {(file.size / 1024).toFixed(1)} KB • Nhấn để chọn file khác
                  </p>
                </>
              ) : (
                <>
                  <div className='bg-muted rounded-full p-3 mb-3'>
                    <Upload className='h-8 w-8 text-muted-foreground' />
                  </div>
                  <p className='font-medium text-foreground'>Kéo thả file SRT vào đây</p>
                  <p className='text-sm text-muted-foreground mt-1'>hoặc nhấn để chọn file</p>
                </>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {isTranslating && (
            <div className='space-y-2 animate-in fade-in slide-in-from-top-2'>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-muted-foreground flex items-center gap-2'>
                  <Loader2 className='h-3.5 w-3.5 animate-spin' />
                  Đang dịch...
                </span>
                <span className='font-mono text-xs text-muted-foreground'>
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress value={progress} className='h-2' />
            </div>
          )}

          {/* Translate button */}
          <Button
            onClick={handleTranslate}
            disabled={!file || isTranslating}
            className='w-full h-12 text-base font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-purple-500/25 transition-all duration-300 hover:shadow-purple-500/40 hover:scale-[1.01] active:scale-[0.99]'
            id='translate-btn'
          >
            {isTranslating ? (
              <span className='flex items-center gap-2'>
                <Loader2 className='h-5 w-5 animate-spin' />
                Đang dịch...
              </span>
            ) : (
              <span className='flex items-center gap-2'>
                <Download className='h-5 w-5' />
                Dịch & Tải xuống
              </span>
            )}
          </Button>


        </div>
      </Card>

    </div>
  )
}

export default TranslateSrtPage
