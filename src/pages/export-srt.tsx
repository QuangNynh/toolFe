import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { FileDown } from 'lucide-react'

const ExportSrtPage = () => {
  const [inputText, setInputText] = useState('')

  const parseTimeToSeconds = (timeStr: string): number => {
    const parts = timeStr.split(':').map((p) => parseFloat(p))
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1]
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]
    }
    return 0
  }

  const formatSrtTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const milliseconds = Math.floor((seconds % 1) * 1000)

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`
  }

  const parseTextToSrt = (text: string): string => {
    const lines = text.split('\n').filter((line) => line.trim())
    const entries: Array<{ time: number; text: string }> = []

    for (const line of lines) {
      const match = line.match(/^(\d+:\d+(?::\d+)?)\s*[-\s]\s*(.+)$/)
      if (match) {
        const timeStr = match[1]
        const textContent = match[2].trim()
        const timeInSeconds = parseTimeToSeconds(timeStr)
        entries.push({ time: timeInSeconds, text: textContent })
      }
    }

    if (entries.length === 0) {
      return ''
    }

    let srtContent = ''
    for (let i = 0; i < entries.length; i++) {
      const current = entries[i]
      const next = entries[i + 1]
      const startTime = formatSrtTime(current.time)
      const endTime = next ? formatSrtTime(next.time - 0.001) : formatSrtTime(current.time + 2)

      srtContent += `${i + 1}\n${startTime} --> ${endTime}\n${current.text}\n\n`
    }

    return srtContent
  }

  const handleExport = () => {
    if (!inputText.trim()) {
      toast.error('Please enter text')
      return
    }

    const srtContent = parseTextToSrt(inputText)

    if (!srtContent) {
      toast.error('No valid time entries found. Format: 0:00 - Text or 0:00:00 - Text')
      return
    }

    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `subtitle-${Date.now()}.srt`
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success('SRT file exported successfully')
  }

  return (
    <div className='container mx-auto p-6 max-w-4xl'>
      <Card className='p-6'>
        <div className='space-y-4'>
          <div>
            <h2 className='text-2xl font-semibold mb-2'>Export SRT from Text</h2>
            <p className='text-sm text-gray-600 mb-4'>
              Enter text with timestamps. Format: 0:00 - Text or 0:00:00 - Text
            </p>
          </div>

          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder='Example:
0:00 - My child, stop everything.
0:02 - Yes, everything. This is not
0:06 - coincidence. It is a divine
0:08 - intersection.'
            className='min-h-[50vh] resize-y font-mono'
          />

          <div className='flex justify-end'>
            <Button onClick={handleExport} disabled={!inputText.trim()}>
              <FileDown className='h-4 w-4 mr-2' />
              Export SRT
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default ExportSrtPage
