import React, { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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
  DialogFooter
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  FileText,
  Upload,
  Play,
  Square,
  Download,
  Copy,
  ExternalLink,
  Check,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye
} from 'lucide-react'
import { chatService } from '@/services/chat.service'
import { translateService, type ModelInfo } from '@/services/translate.service'

const DEFAULT_MODEL = 'gemini-2.5-flash'

const STATIC_MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', desc: 'Nhanh, hiệu quả cao (Khuyên dùng)' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', desc: 'Ổn định, nhanh' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', desc: 'Thông minh nhất nhưng chậm' }
]

interface ParsedScript {
  id: number
  indexText: string
  link: string
  title: string
  content: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result?: string
  error?: string
}

const parseScriptsText = (text: string): ParsedScript[] => {
  const lines = text.split('\n')
  const scripts: ParsedScript[] = []
  
  let currentScript: Partial<ParsedScript> | null = null
  let state: 'index' | 'link' | 'title' | 'content' | 'idle' = 'idle'
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Match index pattern like "1.", "2."
    const indexMatch = line.match(/^(\d+)\.$/)
    if (indexMatch) {
      if (currentScript && currentScript.indexText) {
        scripts.push({
          id: Number(currentScript.id),
          indexText: currentScript.indexText,
          link: currentScript.link || '',
          title: currentScript.title || '',
          content: (currentScript.content || '').trim(),
          status: 'pending'
        })
      }
      currentScript = {
        id: Number(indexMatch[1]),
        indexText: line,
        content: ''
      }
      state = 'link'
      continue
    }
    
    if (currentScript) {
      if (state === 'link') {
        if (!line) continue
        currentScript.link = line
        state = 'title'
      } else if (state === 'title') {
        if (!line) continue
        currentScript.title = line
        state = 'content'
      } else if (state === 'content') {
        currentScript.content = (currentScript.content || '') + '\n' + lines[i]
      }
    }
  }
  
  if (currentScript && currentScript.indexText) {
    scripts.push({
      id: Number(currentScript.id),
      indexText: currentScript.indexText,
      link: currentScript.link || '',
      title: currentScript.title || '',
      content: (currentScript.content || '').trim(),
      status: 'pending'
    })
  }
  
  return scripts
}

const exportScriptsText = (scripts: ParsedScript[]): string => {
  return scripts.map(s => {
    const mainContent = s.result || s.content
    return `${s.indexText}\n${s.link}\n\n${s.title}\n\n${mainContent}`
  }).join('\n\n\n')
}

const ScriptConverterPage = () => {

  const [model, setModel] = useState(DEFAULT_MODEL)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)

  useEffect(() => {
    const loadModels = async () => {
      setModelsLoading(true)
      try {
        const data = await translateService.getModels()
        if (data && data.models && data.models.length > 0) {
          setModels(data.models)
        }
      } catch {
        // Fallback to static models list
      } finally {
        setModelsLoading(false)
      }
    }
    loadModels()
  }, [])

  const [rawText, setRawText] = useState('')
  const [promptTemplate, setPromptTemplate] = useState(
    'Dịch kịch bản sau sang tiếng Việt tự nhiên, mượt mà:\n\n[SCRIPT]'
  )
  const [scripts, setScripts] = useState<ParsedScript[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [currentRunningIndex, setCurrentRunningIndex] = useState<number | null>(null)
  const [currentRound, setCurrentRound] = useState(1)
  
  const cancelRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // View modal helper for script text
  const [viewScript, setViewScript] = useState<{ title: string; content: string } | null>(null)



  // File loading handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    readFile(file)
  }

  const readFile = (file: File) => {
    if (!file.name.endsWith('.txt')) {
      toast.error('Vui lòng chọn tệp tin văn bản định dạng .txt')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setRawText(text)
      toast.success(`Đã tải tệp ${file.name} thành công!`)
    }
    reader.onerror = () => {
      toast.error('Không thể đọc tệp tin')
    }
    reader.readAsText(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      readFile(file)
    }
  }

  const handleParse = () => {
    if (!rawText.trim()) {
      toast.error('Vui lòng nhập hoặc tải file kịch bản trước')
      return
    }

    const parsed = parseScriptsText(rawText)
    if (parsed.length === 0) {
      toast.error('Không tìm thấy kịch bản nào khớp với định dạng yêu cầu')
      return
    }

    setScripts(parsed)
    toast.success(`Đã phân tích thành công ${parsed.length} kịch bản!`)
  }

  const handleStartConversion = async () => {
    if (scripts.length === 0) {
      toast.error('Vui lòng bấm phân tích kịch bản trước')
      return
    }


    if (!promptTemplate.includes('[SCRIPT]')) {
      toast.error('Prompt cấu hình bắt buộc phải chứa từ khóa [SCRIPT]')
      return
    }

    setIsRunning(true)
    cancelRef.current = false

    // Maintain local copy of scripts state to ensure immediate synchronous updates within the retry loop
    let currentScripts: ParsedScript[] = scripts.map(s => ({
      ...s,
      status: s.status === 'completed' ? 'completed' : 'pending',
      error: s.status === 'completed' ? s.error : undefined
    }))
    
    setScripts(currentScripts)

    let round = 1
    setCurrentRound(1)
    let hasPendingOrFailed = true

    while (hasPendingOrFailed && !cancelRef.current) {
      // Find all scripts that are not completed (i.e. status is pending or failed)
      const targetIndices = currentScripts
        .map((s, idx) => s.status !== 'completed' ? idx : -1)
        .filter(idx => idx !== -1)

      if (targetIndices.length === 0) {
        hasPendingOrFailed = false
        break
      }

      if (round > 1) {
        toast.info(`Bắt đầu Vòng ${round}: Tự động chạy lại ${targetIndices.length} kịch bản bị lỗi...`)
      }

      for (let step = 0; step < targetIndices.length; step++) {
        if (cancelRef.current) break

        const i = targetIndices[step]
        setCurrentRunningIndex(i)

        // Set status to processing
        currentScripts[i].status = 'processing'
        setScripts([...currentScripts])

        const currentScript = currentScripts[i]
        const promptText = promptTemplate.replace('[SCRIPT]', currentScript.content)

        try {
          const response = await chatService.chat(promptText, model)
          currentScripts[i].status = 'completed'
          currentScripts[i].result = response.response
          currentScripts[i].error = undefined
        } catch (error: any) {
          const errMessage = error?.response?.data?.message || error?.message || 'Lỗi gọi API AI Chat'
          currentScripts[i].status = 'failed'
          currentScripts[i].error = errMessage
        }

        setScripts([...currentScripts])
      }

      if (cancelRef.current) {
        break
      }

      // Check if we still have failed scripts to process
      const failedCount = currentScripts.filter(s => s.status === 'failed' || s.status === 'pending').length
      
      if (failedCount > 0) {
        if (round >= 2) {
          hasPendingOrFailed = false
          break
        }
        round++
        setCurrentRound(round)
        toast.warning(`Vòng ${round - 1} hoàn tất. Còn ${failedCount} kịch bản lỗi. Tự động chạy lại vòng ${round} sau 3 giây...`)
        
        // Wait 3 seconds, checking cancelRef
        for (let delay = 0; delay < 30; delay++) {
          if (cancelRef.current) break
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } else {
        hasPendingOrFailed = false
      }
    }

    setIsRunning(false)
    setCurrentRunningIndex(null)

    if (cancelRef.current) {
      toast.info('Đã dừng tiến trình xử lý kịch bản')
    } else {
      const failedCount = currentScripts.filter(s => s.status === 'failed').length
      if (failedCount === 0) {
        toast.success('Hoàn thành! Toàn bộ kịch bản đã được chuyển đổi thành công!')
      } else {
        toast.error(`Đã dừng chạy. Vẫn còn ${failedCount} kịch bản bị lỗi chưa hoàn tất.`)
      }
    }
  }

  const handleCancel = () => {
    cancelRef.current = true
    setIsRunning(false)
  }

  const handleCopyResults = () => {
    if (scripts.length === 0) return
    const text = exportScriptsText(scripts)
    navigator.clipboard.writeText(text)
    toast.success('Đã sao chép toàn bộ kịch bản mới vào Clipboard!')
  }

  const handleDownloadResults = () => {
    if (scripts.length === 0) return
    const text = exportScriptsText(scripts)
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'converted_scripts.txt'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Đã tải xuống file converted_scripts.txt thành công!')
  }

  const handleExportDoc = () => {
    if (scripts.length === 0) return
    
    // Format as a simple HTML string that Word understands
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>Kịch bản chuyển đổi</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; }
          .script-block { margin-bottom: 24pt; }
          .link { color: #0563c1; text-decoration: underline; }
        </style>
      </head>
      <body>
        ${scripts.map((s) => {
          const mainContent = s.result || s.content
          
          // Convert Markdown style links: [text](url) -> <a href="url" class="link">text</a>
          let formattedContent = mainContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="link">$1</a>')
          
          // Convert Markdown style bold: **text** -> <strong>text</strong>
          formattedContent = formattedContent.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
          
          // Replace newlines with <br/>
          formattedContent = formattedContent.replace(/\n/g, '<br/>')
          
          return `
            <div class="script-block">
              ${s.indexText}<br/>
              <a href="${s.link}" class="link">${s.link}</a><br/>
              <br/>
              ${s.title}<br/>
              <br/>
              ${formattedContent}
            </div>
          `
        }).join('')}
      </body>
      </html>
    `
    
    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'converted_scripts.doc'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Đã xuất file Word (converted_scripts.doc) thành công!')
  }

  const completedCount = scripts.filter(s => s.status === 'completed').length
  const totalCount = scripts.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className='container mx-auto p-4 max-w-6xl space-y-6'>
      <Card className='p-0 overflow-hidden border-0 shadow-xl bg-card/60 backdrop-blur-md'>
        {/* Header gradient */}
        <div className='bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 px-6 py-5 shadow-md'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='bg-white/20 backdrop-blur-sm rounded-xl p-2.5'>
                <FileText className='h-6 w-6 text-white animate-pulse' />
              </div>
              <div>
                <h2 className='text-xl font-bold text-white'>Chuyển đổi kịch bản bằng AI</h2>
                <p className='text-white/70 text-sm'>Xử lý tự động, tuần tự và thay đổi nội dung kịch bản qua mô hình Gemini</p>
              </div>
            </div>
          </div>
        </div>

        {/* Input parameters panel */}
        <div className='p-6 space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            
            {/* Column 1: File Loading & Raw Input */}
            <div className='md:col-span-2 space-y-4'>
              <div className='flex items-center justify-between'>
                <Label className='text-sm font-semibold flex items-center gap-1.5'>
                  1. Dán văn bản hoặc tải file kịch bản (.txt)
                </Label>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => fileInputRef.current?.click()}
                  className='h-8 text-xs text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
                >
                  <Upload className='h-3.5 w-3.5 mr-1' />
                  Chọn tệp TXT
                </Button>
                <input
                  type='file'
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept='.txt'
                  className='hidden'
                />
              </div>

              {/* Drag and Drop Zone combined with Textarea */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl transition-all duration-300 ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[1.005]'
                    : 'border-muted-foreground/20 hover:border-emerald-400'
                }`}
              >
                <Textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Dán nội dung tệp TXT chứa kịch bản vào đây hoặc kéo thả tệp tin kịch bản vào đây...&#10;&#10;Định dạng mẫu:&#10;1.&#10;https://youtube.com/watch?v=...&#10;&#10;🛑 Tiêu đề kịch bản&#10;&#10;Nội dung kịch bản..."
                  className='min-h-[220px] max-h-[400px] border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 py-3 px-4 resize-y text-sm font-mono'
                />
                
                {rawText.trim() === '' && (
                  <div className='absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-muted-foreground gap-1.5 opacity-60'>
                    <Upload className='h-8 w-8 text-muted-foreground' />
                    <span className='text-xs'>Kéo thả tệp tin .txt hoặc dán văn bản tại đây</span>
                  </div>
                )}
              </div>

              <div className='flex justify-end'>
                <Button
                  onClick={handleParse}
                  className='bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold shadow-md'
                >
                  <RefreshCw className='h-4 w-4 mr-1.5' />
                  Phân tích kịch bản
                </Button>
              </div>
            </div>

            {/* Column 2: Prompt configuration and Model selecting */}
            <div className='space-y-4 border-l md:pl-6 border-border/80'>
              <Label className='text-sm font-semibold flex items-center gap-1.5'>
                2. Cấu hình AI & Prompt
              </Label>

              <div className='space-y-2'>
                <Label htmlFor='model-select' className='text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5'>
                  <span>Mô hình Gemini</span>
                  {modelsLoading && <Loader2 className='h-3 w-3 animate-spin text-muted-foreground' />}
                </Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger id='model-select' className='w-full'>
                    <SelectValue placeholder='Chọn model' />
                  </SelectTrigger>
                  <SelectContent>
                    {models.length > 0 ? (
                      models.map((m) => (
                        <SelectItem key={m.name} value={m.name.replace('models/', '')}>
                          {m.displayName}
                        </SelectItem>
                      ))
                    ) : (
                      STATIC_MODELS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label className='text-xs text-muted-foreground uppercase tracking-wider flex items-center justify-between'>
                  <span>Prompt cấu hình</span>
                  <span className='text-[10px] text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded'>Bắt buộc có [SCRIPT]</span>
                </Label>
                <Textarea
                  value={promptTemplate}
                  onChange={(e) => setPromptTemplate(e.target.value)}
                  placeholder='Hãy viết prompt tại đây...'
                  className='min-h-[140px] text-sm resize-none font-sans bg-muted/20'
                />
              </div>

            </div>

          </div>
        </div>
      </Card>

      {/* Control Buttons & Progress bar (only visible when scripts are parsed) */}
      {scripts.length > 0 && (
        <Card className='p-6 border-0 shadow-lg bg-card/60 backdrop-blur-md space-y-4'>
          <div className='flex flex-wrap items-center justify-between gap-4'>
            <div className='flex items-center gap-3'>
              <div className='bg-primary/10 rounded-lg px-3 py-1.5 text-sm font-semibold text-primary'>
                Số kịch bản: {scripts.length}
              </div>
              {isRunning && (
                <div className='text-xs text-muted-foreground flex items-center gap-2'>
                  <Loader2 className='h-3.5 w-3.5 animate-spin text-primary' />
                  Đang chạy kịch bản {currentRunningIndex !== null ? currentRunningIndex + 1 : ''}/{scripts.length}...
                </div>
              )}
            </div>
            
            <div className='flex items-center gap-2'>
              {isRunning ? (
                <Button
                  onClick={handleCancel}
                  variant='destructive'
                  className='shadow-md'
                >
                  <Square className='h-4 w-4 mr-1.5' />
                  Dừng chạy
                </Button>
              ) : (
                <Button
                  onClick={handleStartConversion}
                  className='bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold shadow-md hover:scale-[1.01] transition-transform'
                >
                  <Play className='h-4 w-4 mr-1.5' />
                  Bắt đầu chạy AI
                </Button>
              )}

              <Button
                onClick={handleCopyResults}
                variant='outline'
                disabled={isRunning}
                className='border-border/80'
              >
                <Copy className='h-4 w-4 mr-1.5' />
                Sao chép kết quả
              </Button>

              <Button
                onClick={handleDownloadResults}
                variant='outline'
                disabled={isRunning}
                className='border-border/80'
              >
                <Download className='h-4 w-4 mr-1.5' />
                Tải file TXT
              </Button>

              <Button
                onClick={handleExportDoc}
                variant='outline'
                disabled={isRunning}
                className='border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:border-blue-900/30 dark:hover:bg-blue-950/20'
              >
                <FileText className='h-4 w-4 mr-1.5 text-blue-500' />
                Xuất Word (.doc)
              </Button>
            </div>
          </div>

          {/* Progress bar container */}
          {(isRunning || completedCount > 0) && (
            <div className='space-y-1.5'>
              <div className='flex justify-between text-xs font-semibold'>
                <span>Tiến trình xử lý {isRunning && `(Vòng ${currentRound})`}</span>
                <span>{progressPercent}% ({completedCount}/{totalCount})</span>
              </div>
              <div className='h-2 w-full bg-muted rounded-full overflow-hidden'>
                <div
                  className='h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500'
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Scripts table panel */}
      {scripts.length > 0 && (
        <Card className='border-0 shadow-xl overflow-hidden bg-card/60 backdrop-blur-md'>
          <div className='bg-muted/40 px-6 py-4 border-b border-border/80 flex items-center justify-between'>
            <h3 className='font-semibold text-sm text-foreground uppercase tracking-wider'>Danh sách kịch bản</h3>
          </div>
          
          <div className='overflow-x-auto'>
            <table className='w-full border-collapse text-left text-sm'>
              <thead>
                <tr className='border-b bg-muted/10 text-muted-foreground text-xs font-semibold uppercase tracking-wider'>
                  <th className='p-4 w-16 text-center'>STT</th>
                  <th className='p-4 w-48'>Đường dẫn (Link)</th>
                  <th className='p-4 w-60'>Tiêu đề</th>
                  <th className='p-4'>Nội dung gốc (Original)</th>
                  <th className='p-4'>Nội dung mới (AI Output)</th>
                  <th className='p-4 w-36 text-center'>Trạng thái</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border/60'>
                {scripts.map((item, idx) => {
                  let statusBadge = null
                  switch (item.status) {
                    case 'pending':
                      statusBadge = (
                        <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground'>
                          Đang chờ
                        </span>
                      )
                      break
                    case 'processing':
                      statusBadge = (
                        <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 gap-1 animate-pulse'>
                          <Loader2 className='h-3 w-3 animate-spin' />
                          Đang xử lý
                        </span>
                      )
                      break
                    case 'completed':
                      statusBadge = (
                        <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 gap-1'>
                          <Check className='h-3 w-3' />
                          Hoàn thành
                        </span>
                      )
                      break
                    case 'failed':
                      statusBadge = (
                        <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 gap-1' title={item.error}>
                          <AlertCircle className='h-3 w-3' />
                          Lỗi
                        </span>
                      )
                      break
                  }

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-muted/10 transition-colors ${
                        currentRunningIndex === idx ? 'bg-indigo-50/30 dark:bg-indigo-950/10' : ''
                      }`}
                    >
                      <td className='p-4 text-center font-bold text-muted-foreground'>{item.id}</td>
                      <td className='p-4 font-mono text-xs break-all'>
                        {item.link ? (
                          <a
                            href={item.link}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='text-indigo-500 hover:text-indigo-600 hover:underline flex items-center gap-1'
                          >
                            <span>Link Video</span>
                            <ExternalLink className='h-3 w-3' />
                          </a>
                        ) : (
                          <span className='text-muted-foreground'>Không có link</span>
                        )}
                      </td>
                      <td className='p-4 font-medium max-w-[200px] truncate' title={item.title}>
                        {item.title || <span className='text-muted-foreground font-normal italic'>Trống</span>}
                      </td>
                      <td className='p-4'>
                        <div className='flex items-center justify-between gap-2 max-w-[300px]'>
                          <span className='truncate text-xs font-mono text-muted-foreground/80'>{item.content}</span>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => setViewScript({ title: `Kịch bản gốc #${item.id}`, content: item.content })}
                            className='h-7 w-7 p-0 hover:bg-muted shrink-0'
                          >
                            <Eye className='h-3.5 w-3.5' />
                          </Button>
                        </div>
                      </td>
                      <td className='p-4'>
                        {item.result ? (
                          <div className='flex items-center justify-between gap-2 max-w-[300px]'>
                            <span className='truncate text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400'>{item.result}</span>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => setViewScript({ title: `Kết quả AI #${item.id}`, content: item.result || '' })}
                              className='h-7 w-7 p-0 hover:bg-muted shrink-0 text-emerald-500'
                            >
                              <Eye className='h-3.5 w-3.5' />
                            </Button>
                          </div>
                        ) : (
                          <span className='text-xs text-muted-foreground italic'>Chưa xử lý</span>
                        )}
                      </td>
                      <td className='p-4 text-center'>{statusBadge}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Script Viewer Dialog */}
      <Dialog open={!!viewScript} onOpenChange={(open) => !open && setViewScript(null)}>
        <DialogContent className='sm:max-w-2xl max-h-[80vh] flex flex-col'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-base font-bold'>
              <FileText className='h-5 w-5 text-indigo-500' />
              {viewScript?.title}
            </DialogTitle>
          </DialogHeader>
          <div className='flex-1 min-h-0 overflow-y-auto p-4 rounded-lg bg-muted/40 border text-sm font-mono whitespace-pre-wrap leading-relaxed select-text'>
            {viewScript?.content}
          </div>
          <DialogFooter className='shrink-0 pt-2 border-t mt-4'>
            <Button
              onClick={() => {
                if (viewScript?.content) {
                  navigator.clipboard.writeText(viewScript.content)
                  toast.success('Đã sao chép nội dung kịch bản này!')
                }
              }}
              className='bg-gradient-to-r from-indigo-600 to-violet-600 text-white'
            >
              <Copy className='h-4 w-4 mr-1.5' />
              Sao chép
            </Button>
            <Button variant='outline' onClick={() => setViewScript(null)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

export default ScriptConverterPage
