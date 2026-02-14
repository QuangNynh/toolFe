import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { DataTable } from '@/components/common/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { ExternalLink, Copy, FileSpreadsheet } from 'lucide-react'
import { youtubeService } from '@/services/youtube.service'
import * as XLSX from 'xlsx'

interface VideoData {
  id: string
  url: string
  title: string
  view_count: number
}

const VideoViewPages = () => {
  const [channelUrl, setChannelUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [videoData, setVideoData] = useState<VideoData[]>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

  const handleFetchVideos = async () => {
    if (!channelUrl.trim()) {
      toast.error('Vui lòng nhập URL kênh YouTube')
      return
    }

    setIsLoading(true)
    try {
      const response = await youtubeService.getUrlsAll(channelUrl)
      setVideoData(response.reverse())
      toast.success(`Đã tải ${response.length} video`)
    } catch (error) {
      toast.error('Không thể tải danh sách video')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} đã được sao chép!`)
    } catch (error) {
      console.log(error)
      toast.error('Không thể sao chép')
    }
  }

  const formatViewCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }

  const handleExportExcel = () => {
    if (videoData.length === 0) {
      toast.error('Không có dữ liệu để xuất')
      return
    }

    try {
      // Tạo dữ liệu cho Excel với 3 cột: STT, URL, View
      const excelData = videoData.map((video, index) => ({
        STT: index + 1,
        URL: video.url,
        View: video.view_count
      }))

      // Tạo worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData)

      // Tùy chỉnh độ rộng cột
      worksheet['!cols'] = [
        { wch: 5 },  // STT
        { wch: 60 }, // URL
        { wch: 15 }  // View
      ]

      // Tạo workbook
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Videos')

      // Xuất file
      const fileName = `youtube-videos-${Date.now()}.xlsx`
      XLSX.writeFile(workbook, fileName)

      toast.success(`Đã xuất ${videoData.length} video ra file Excel`)
    } catch (error) {
      console.error(error)
      toast.error('Không thể xuất file Excel')
    }
  }

  const columns: ColumnDef<VideoData>[] = [
    {
      accessorKey: 'id',
      header: 'Video ID',
      cell: ({ row }) => (
        <div className='font-mono text-sm'>{row.original.id}</div>
      )
    },
    {
      accessorKey: 'title',
      header: 'Tiêu đề',
      cell: ({ row }) => {
        const title = row.original.title
        return (
          <div
            className='max-w-md cursor-pointer hover:text-blue-600 transition-colors'
            title={`${title}\n\nClick để sao chép`}
            onClick={() => copyToClipboard(title, 'Tiêu đề')}
          >
            {title}
          </div>
        )
      }
    },
    {
      accessorKey: 'view_count',
      header: 'Lượt xem',
      cell: ({ row }) => (
        <div className='text-right font-medium'>
          {formatViewCount(row.original.view_count)}
          <span className='text-xs text-gray-500 ml-1'>
            ({row.original.view_count.toLocaleString()})
          </span>
        </div>
      )
    },
    {
      accessorKey: 'url',
      header: 'Link',
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <a
            href={row.original.url}
            target='_blank'
            rel='noopener noreferrer'
            className='text-blue-600 hover:underline flex items-center gap-1'
          >
            <ExternalLink className='h-4 w-4' />
            Xem
          </a>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => copyToClipboard(row.original.url, 'URL')}
            className='h-7 w-7 p-0'
          >
            <Copy className='h-3 w-3' />
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className='space-y-4'>
      <Card className='p-6'>
        <div className='space-y-4'>
          <div>
            <label className='text-sm font-medium mb-2 block'>
              URL Kênh YouTube
            </label>
            <Input
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              placeholder='https://www.youtube.com/@GodWords7777'
            />
          </div>

          <div className='flex gap-2'>
            <Button onClick={handleFetchVideos} disabled={isLoading}>
              {isLoading ? 'Đang tải...' : 'Lấy danh sách video'}
            </Button>
            {videoData.length > 0 && (
              <>
                <Button
                  variant='outline'
                  onClick={handleExportExcel}
                >
                  <FileSpreadsheet className='h-4 w-4 mr-2' />
                  Export Excel
                </Button>
                <Button
                  variant='outline'
                  onClick={() => {
                    setVideoData([])
                    setChannelUrl('')
                  }}
                >
                  Xóa kết quả
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {videoData.length > 0 && (
        <Card className='p-6'>
          <div className='space-y-4'>
            <div className='flex justify-between items-center'>
              <h3 className='text-lg font-semibold'>
                Tìm thấy {videoData.length} video
              </h3>
            </div>
            <DataTable
              columns={columns}
              data={videoData}
              pageSizeOptions={[10, 20, 50, 100]}
              pagination={pagination}
              onPaginationChange={setPagination}
            />
          </div>
        </Card>
      )}
    </div>
  )
}

export default VideoViewPages
