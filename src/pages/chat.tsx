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
import { toast } from 'sonner'
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Trash2,
  Loader2
} from 'lucide-react'
import { chatService } from '@/services/chat.service'
import { translateService, type ModelInfo } from '@/services/translate.service'

const DEFAULT_MODEL = 'gemini-2.5-flash'

const STATIC_MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', desc: 'Nhanh, hiệu quả cao (Khuyên dùng)' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', desc: 'Ổn định, nhanh' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', desc: 'Thông minh nhất nhưng chậm' }
]

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const formatMessage = (text: string) => {
  if (!text) return ''
  
  // Format code blocks
  const parts = text.split(/(```[\s\S]*?```)/g)
  return parts.map((part, index) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const lines = part.slice(3, -3).trim().split('\n')
      const language = lines[0] && lines[0].length < 15 ? lines[0] : ''
      const code = language ? lines.slice(1).join('\n') : lines.join('\n')
      
      return (
        <div key={index} className='my-3 border rounded-lg overflow-hidden bg-slate-950 text-slate-100 font-mono text-sm shadow-md'>
          <div className='flex items-center justify-between px-4 py-1.5 bg-slate-900 border-b text-xs text-slate-400'>
            <span>{language || 'code'}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(code)
                toast.success('Đã sao chép mã nguồn!')
              }}
              className='hover:text-white transition-colors duration-200 cursor-pointer'
            >
              Sao chép
            </button>
          </div>
          <pre className='p-4 overflow-x-auto'><code>{code}</code></pre>
        </div>
      )
    }
    
    // Format inline code `code`
    const inlineParts = part.split(/(`[^`]+`)/g)
    const formattedInline = inlineParts.map((subPart, subIndex) => {
      if (subPart.startsWith('`') && subPart.endsWith('`')) {
        return (
          <code key={subIndex} className='px-1.5 py-0.5 rounded bg-muted text-red-500 font-mono text-xs border'>
            {subPart.slice(1, -1)}
          </code>
        )
      }
      
      // Format bold text **bold**
      const boldParts = subPart.split(/(\*\*[^*]+\*\*)/g)
      return boldParts.map((boldPart, boldIndex) => {
        if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
          return <strong key={boldIndex} className='font-bold text-foreground'>{boldPart.slice(2, -2)}</strong>
        }
        return boldPart
      })
    })
    
    return <span key={index} className='whitespace-pre-wrap'>{formattedInline}</span>
  })
}

const ChatPage = () => {
  const [model, setModel] = useState(DEFAULT_MODEL)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Xin chào! Tôi là trợ lý AI được tích hợp với mô hình Gemini. Hãy gửi tin nhắn để bắt đầu trò chuyện.',
      timestamp: new Date()
    }
  ])
  const [isGenerating, setIsGenerating] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load models from API
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



  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Tôi đã làm sạch lịch sử chat. Chúng ta có thể bắt đầu cuộc trò chuyện mới!',
        timestamp: new Date()
      }
    ])
    toast.success('Đã xóa lịch sử trò chuyện.')
  }

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isGenerating) return


    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsGenerating(true)

    const assistantMessageId = (Date.now() + 1).toString()
    let hasReceivedChunk = false

    try {
      await chatService.chat(userMessage.content, model, (chunk) => {
        if (!hasReceivedChunk) {
          hasReceivedChunk = true
          setMessages((prev) => [
            ...prev,
            {
              id: assistantMessageId,
              role: 'assistant',
              content: chunk,
              timestamp: new Date()
            }
          ])
        } else {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content + chunk }
                : msg
            )
          )
        }
      })
    } catch (error: any) {
      toast.error(error?.message || 'Có lỗi xảy ra khi gửi tin nhắn')
      const errorMessage = '⚠️ Đã xảy ra lỗi khi tạo phản hồi. Vui lòng thử lại sau.'
      if (!hasReceivedChunk) {
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: 'assistant',
            content: errorMessage,
            timestamp: new Date()
          }
        ])
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: `${msg.content}\n\n[Lỗi: ${errorMessage}]` }
              : msg
          )
        )
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className='container mx-auto p-2 sm:p-4 max-w-4xl h-[calc(100vh-var(--header-height)-2rem)] flex flex-col'>
      <Card className='p-0 overflow-hidden border-0 shadow-xl flex-1 flex flex-col bg-card/60 backdrop-blur-md'>
        {/* Header gradient */}
        <div className='bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-6 py-4 shrink-0 shadow-md'>
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
            <div className='flex items-center gap-3'>
              <div className='bg-white/20 backdrop-blur-sm rounded-xl p-2.5 shrink-0'>
                <MessageSquare className='h-6 w-6 text-white animate-pulse' />
              </div>
              <div>
                <h2 className='text-xl font-bold text-white'>Trò chuyện AI</h2>
                <p className='text-white/70 text-sm'>Trò chuyện trực tiếp với mô hình ngôn ngữ lớn Gemini</p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={handleClearHistory}
                className='bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm'
              >
                <Trash2 className='h-4 w-4 mr-1.5' />
                Xóa lịch sử
              </Button>

            </div>
          </div>
        </div>

        {/* Toolbar: Model selection */}
        <div className='px-6 py-3 border-b bg-muted/30 flex flex-wrap items-center justify-between gap-4 shrink-0'>
          <div className='flex items-center gap-2 w-full sm:w-auto'>
            <Label htmlFor='model-select' className='text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0'>
              Mô hình:
            </Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id='model-select' className='w-[220px] h-9 text-sm'>
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
            {modelsLoading && <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />}
          </div>


        </div>

        {/* Message Area */}
        <div 
          ref={chatContainerRef}
          className='flex-1 overflow-y-auto p-6 space-y-4 min-h-0 bg-gradient-to-b from-transparent to-muted/10'
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 max-w-[95%] sm:max-w-[85%] ${
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
              }`}
            >
              {/* Avatar */}
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 shadow-md ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'
                    : 'bg-muted border border-border text-foreground'
                }`}
              >
                {msg.role === 'user' ? <User className='h-4 w-4' /> : <Bot className='h-4 w-4' />}
              </div>

              {/* Message Content Bubble */}
              <div className='flex flex-col space-y-1'>
                <div
                  className={`rounded-2xl px-4 py-2.5 shadow-sm text-sm break-words leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-tr-none'
                      : 'bg-card border rounded-tl-none text-foreground'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <span className='whitespace-pre-wrap'>{msg.content}</span>
                  ) : (
                    formatMessage(msg.content)
                  )}
                </div>
                <span
                  className={`text-[10px] text-muted-foreground px-1 ${
                    msg.role === 'user' ? 'text-right' : 'text-left'
                  }`}
                >
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isGenerating && (
            <div className='flex items-start gap-3 max-w-[80%]'>
              <div className='h-9 w-9 rounded-full flex items-center justify-center shrink-0 bg-muted border border-border text-foreground shadow-md'>
                <Bot className='h-4 w-4 animate-bounce' />
              </div>
              <div className='bg-card border rounded-2xl rounded-tl-none px-4 py-3 shadow-sm text-sm text-muted-foreground flex items-center gap-2'>
                <Loader2 className='h-4 w-4 animate-spin text-indigo-500' />
                <span>Gemini đang suy nghĩ...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className='p-4 border-t bg-card shrink-0'>
          <form onSubmit={handleSend} className='flex items-end gap-2'>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Nhập câu hỏi của bạn tại đây... (Enter để gửi, Shift+Enter để xuống dòng)'
              disabled={isGenerating}
              className='flex-1 min-h-[44px] max-h-32 bg-muted/40 border-border/80 focus-visible:ring-indigo-500 py-2.5 resize-none'
              rows={1}
              autoFocus
            />
            <Button
              type='submit'
              disabled={!input.trim() || isGenerating}
              className='h-11 px-5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-md transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]'
            >
              <Send className='h-4 w-4' />
            </Button>
          </form>
        </div>
      </Card>


    </div>
  )
}

export default ChatPage
