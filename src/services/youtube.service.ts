import api from '@/config/axios'

interface TranscriptItem {
  text: string
  duration: number
  offset: number
  lang: string
}

interface Thumbnail {
  url: string
  width: number
  height: number
}

interface Metadata {
  videoId: string
  title: string
  description: string
  author: string
  channelId: string
  thumbnails: Thumbnail[]
  durationSeconds: number
  viewCount: number
  likeCount: number
  isLive: boolean
  category: string
}

interface TranscriptResponse {
  success: boolean
  videoId: string
  transcript: TranscriptItem[]
  transcriptLanguage: string
  metadata: Metadata
  error?: string
}

interface AudioResponse {
  success: boolean
  videoId: string
  audioUrl?: string
  title?: string
  duration?: number
  error?: string
  blob?: Blob
}

interface AudioToSrtResponse {
  success: boolean
  srtContent?: string
  error?: string
}

interface AudioToScriptResponse {
  success: boolean
  scriptContent?: string
  error?: string
}

interface VideoResponse {
  success: boolean
  videoId: string
  videoUrl?: string
  title?: string
  duration?: number
  quality?: string
  error?: string
  blob?: Blob
}

interface DataUrls {
  id: string
  url: string
  title: string
  view_count: number
  created_at?: string
}
class YouTubeService {
  async getTranscript(videoId: string): Promise<TranscriptResponse> {
    const response = await api.post(`${import.meta.env.VITE_SERVER_LOCAL}youtube/transcript`, {
      videoId
    })
    return response.data
  }

  async getTranscripts(videoIds: string[]): Promise<TranscriptResponse[]> {
    const response = await api.post(`${import.meta.env.VITE_SERVER_LOCAL}youtube/transcripts`, {
      videoIds
    })
    return response.data
  }

  async getUrlsAll(url: string): Promise<DataUrls[]> {
    const response = await api.post(`${import.meta.env.VITE_SERVER_LOCAL}youtube/urls`, {
      url
    })
    return response.data.videos
  }

  async getAudio(url: string): Promise<AudioResponse> {
    try {
      const response = await api.post(
        `${import.meta.env.VITE_SERVER_LOCAL}youtube/audio`,
        { url },
        {
          responseType: 'blob'
        }
      )

      // Lấy filename từ Content-Disposition header
      const contentDisposition = response.headers['content-disposition']
      let filename = 'audio.mp3'
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      // Trả về blob để download
      return {
        success: true,
        videoId: url,
        blob: response.data,
        title: filename.replace('.mp3', ''),
        audioUrl: URL.createObjectURL(response.data)
      }
    } catch (error) {
      return {
        success: false,
        videoId: url,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async downloadImage(imageUrl: string): Promise<Blob> {
    const response = await api.post(
      `${import.meta.env.VITE_SERVER_LOCAL}youtube/download-image`,
      { imageUrl },
      {
        responseType: 'blob'
      }
    )
    return response.data
  }

  async audioToSrt(file: File): Promise<AudioToSrtResponse> {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post(`${import.meta.env.VITE_SERVER_LOCAL}youtube/srt`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      return {
        success: true,
        srtContent: response.data
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async audioToScript(file: File): Promise<AudioToScriptResponse> {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post(`${import.meta.env.VITE_SERVER_LOCAL}youtube/script`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      let scriptContent = ''
      if (typeof response.data === 'string') {
        scriptContent = response.data
      } else if (response.data && typeof response.data === 'object') {
        scriptContent = response.data.script || response.data.text || response.data.scriptContent || JSON.stringify(response.data)
      }

      return {
        success: true,
        scriptContent: scriptContent
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getVideo(url: string, quality: string): Promise<VideoResponse> {
    try {
      const response = await api.post(
        `${import.meta.env.VITE_SERVER_LOCAL}youtube/video`,
        { url, quality },
        {
          responseType: 'blob'
        }
      )

      // Lấy filename từ Content-Disposition header
      const contentDisposition = response.headers['content-disposition']
      let filename = 'video.mp4'
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      // Trả về blob để download
      return {
        success: true,
        videoId: url,
        blob: response.data,
        title: filename.replace('.mp4', ''),
        videoUrl: URL.createObjectURL(response.data),
        quality
      }
    } catch (error) {
      return {
        success: false,
        videoId: url,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  getLoginUrl(): string {
    return `${import.meta.env.VITE_SERVER_LOCAL}youtube/login`
  }

  async submitAuthCallback(code: string): Promise<YouTubeAuthCallbackResponse> {
    const response = await api.get(`${import.meta.env.VITE_SERVER_LOCAL}youtube/callback`, {
      params: { code }
    })
    return response.data
  }

  async getConnectedChannels(): Promise<GetYouTubeChannelsResponse> {
    const response = await api.get(`${import.meta.env.VITE_SERVER_LOCAL}youtube/channels`)
    return response.data
  }

  async disconnectChannel(channelId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`${import.meta.env.VITE_SERVER_LOCAL}youtube/channels/${channelId}`)
    return response.data
  }

  async checkChannelToken(channelId: string): Promise<YouTubeCheckTokenResponse> {
    const response = await api.get(`${import.meta.env.VITE_SERVER_LOCAL}youtube/channels/${channelId}/check-token`)
    return response.data
  }

  async scheduleVideo(payload: ScheduleYouTubePayload): Promise<ScheduleYouTubeResponse> {
    const response = await api.post(`${import.meta.env.VITE_SERVER_LOCAL}youtube/schedule`, payload)
    return response.data
  }

  async getChannelVideos(channelId: string, maxResults: number = 20, pageToken?: string): Promise<GetChannelVideosResponse> {
    const response = await api.get(`${import.meta.env.VITE_SERVER_LOCAL}youtube/videos`, {
      params: { channelId, maxResults, pageToken, privacyStatus: 'private' }
    })
    return response.data
  }

  async updateThumbnail(channelId: string, videoId: string, file: File): Promise<UpdateThumbnailResponse> {
    const formData = new FormData()
    formData.append('channelId', channelId)
    formData.append('videoId', videoId)
    formData.append('file', file)

    const response = await api.post(`${import.meta.env.VITE_SERVER_LOCAL}youtube/thumbnail`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  }
}

export interface UpdateThumbnailResponse {
  success: boolean
  videoId: string
  channelId: string
  thumbnailUrl: string
  message?: string
  error?: string
}

export interface YouTubeChannelVideoItem {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  publishedAt: string
  privacyStatus: string
}

export interface GetChannelVideosResponse {
  success: boolean
  channelId: string
  totalResults: number
  resultsPerPage: number
  nextPageToken?: string | null
  prevPageToken?: string | null
  videos: YouTubeChannelVideoItem[]
  message?: string
}

export interface YouTubeChannelItem {
  channelId: string
  channelTitle: string
  thumbnailUrl: string
  connectedAt: number
  expiresAt?: number
  isExpired?: boolean
}

export interface GetYouTubeChannelsResponse {
  success: boolean
  count: number
  channels: YouTubeChannelItem[]
  message?: string
}

export interface YouTubeAuthUrlResponse {
  success: boolean
  url: string
}

export interface YouTubeAuthCallbackResponse {
  success: boolean
  message: string
  channel?: {
    channelId: string
    channelTitle: string
    thumbnailUrl: string
    connectedAt: number
  }
  error?: string
}

export interface YouTubeCheckTokenResponse {
  success: boolean
  channelId: string
  channelTitle: string
  isExpired: boolean
  timeLeftSeconds: number
  isWorking: boolean
  errorMessage: string | null
}

export interface ScheduleYouTubePayload {
  channelId: string
  videoId: string
  title: string
  description: string
  tags?: string[]
  publishTime: string
}

export interface ScheduleYouTubeResponse {
  success: boolean
  videoId: string
  title: string
  channelId: string
  channelTitle: string
  publishAt: string
  privacyStatus: string
  message?: string
  error?: string
}

export const youtubeService = new YouTubeService()

export type {
  TranscriptResponse,
  TranscriptItem,
  Metadata,
  Thumbnail,
  AudioResponse,
  AudioToSrtResponse,
  AudioToScriptResponse,
  VideoResponse
}

