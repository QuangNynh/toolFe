import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { youtubeService } from '@/services/youtube.service'

interface TranscriptItem {
  text: string
  offset: number
  duration: number
  lang?: string
}
export const decodeHtmlEntities = (text: string) => {
  return text
    .replace(/&amp;#39;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

const YouTubeTranscript = () => {
  const [videoUrl, setVideoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptItem[]>([])
  const [error, setError] = useState('')

  const extractVideoId = (url: string) => {
    const patterns = [/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/, /^([a-zA-Z0-9_-]{11})$/]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setTranscript([])

    const videoId = extractVideoId(videoUrl)
    if (!videoId) {
      setError('Invalid YouTube URL or Video ID')
      return
    }

    setLoading(true)
    try {
      const result = await youtubeService.getTranscript(videoId)
      if (result.success && result.transcript) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const decodedTranscript = result.transcript.map((item: any) => ({
          ...item,
          text: decodeHtmlEntities(item.text)
        }))
        setTranscript(decodedTranscript as TranscriptItem[])
      } else {
        setError(result.error || 'Failed to fetch transcript')
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className='flex flex-col gap-6 py-6'>
      <div className='space-y-2'>
        <h1 className='text-2xl font-semibold'>YouTube Transcript</h1>
        <p className='text-muted-foreground text-sm'>
          Enter a YouTube video URL or video ID to get the transcript
        </p>
      </div>

      <form onSubmit={handleSubmit} className='flex gap-2'>
        <Input
          placeholder='Enter YouTube URL or Video ID'
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          className='flex-1'
        />
        <Button type='submit' disabled={loading || !videoUrl}>
          {loading ? 'Loading...' : 'Get Transcript'}
        </Button>
      </form>

      {error && (
        <div className='bg-destructive/10 text-destructive rounded-md p-3 text-sm'>{error}</div>
      )}

      {transcript.length > 0 && (
        <div className='border rounded-lg'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-24'>Time</TableHead>
                <TableHead>Text</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transcript.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className='font-mono text-xs'>{formatTime(item.offset)}</TableCell>
                  <TableCell>{item.text}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

export default YouTubeTranscript
