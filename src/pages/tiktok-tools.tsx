import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, Music, Video } from 'lucide-react'
import { TikTokChannel } from '@/components/pages/system-management/TikTokChannel'
import { TikTokAudio } from '@/components/pages/system-management/TikTokAudio'
import { TikTokVideo } from '@/components/pages/system-management/TikTokVideo'

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width="1em"
    height="1em"
    className={props.className}
    {...props}
  >
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.63 4.14 1.02 1.11 2.45 1.8 3.97 1.93v3.86c-1.39-.08-2.77-.57-3.92-1.37a8.03 8.03 0 01-2.43-2.6v7.35c.03 1.54-.36 3.09-1.12 4.43-.8 1.42-2 2.58-3.46 3.3-1.52.76-3.25.99-4.9.68-1.63-.3-3.15-1.2-4.22-2.48a8.3 8.3 0 01-1.74-4.52c-.11-1.65.25-3.32 1.05-4.76.81-1.45 2.06-2.61 3.56-3.3 1.25-.57 2.63-.78 3.98-.62V8.2c-1.02-.15-2.07.03-3 .52a4.42 4.42 0 00-2.22 2.5 4.38 4.38 0 00.32 3.65c.67.99 1.76 1.64 2.94 1.77 1.2.14 2.44-.2 3.34-1 .85-.75 1.34-1.85 1.36-2.98V.02z" />
  </svg>
)

const TikTokToolsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'channel'

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val }, { replace: true })
  }

  return (
    <div className='space-y-6 mx-auto w-full max-w-6xl p-3 sm:p-6'>
      <div className='flex items-center gap-3 border-b pb-4'>
        <div className='p-2 bg-gradient-to-tr from-zinc-800 to-black rounded-lg text-white shadow-md shrink-0 animate-pulse'>
          <TikTokIcon className='h-6 w-6' />
        </div>
        <div>
          <h1 className='text-2xl font-bold tracking-tight bg-gradient-to-tr from-zinc-900 via-zinc-800 to-zinc-700 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent'>
            TikTok Downloader & Tools
          </h1>
          <p className='text-muted-foreground text-sm'>
            Tải audio, video và quét thông tin kênh từ TikTok nhanh chóng và dễ dàng.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className='w-full'>
        <TabsList className='grid w-full grid-cols-3 h-auto p-1 max-w-[600px] mb-4'>
          <TabsTrigger value='channel' className='flex items-center gap-1.5 py-2'>
            <User className='h-4 w-4' />
            Lấy thông tin kênh
          </TabsTrigger>
          <TabsTrigger value='audio' className='flex items-center gap-1.5 py-2'>
            <Music className='h-4 w-4' />
            Tải audio TikTok
          </TabsTrigger>
          <TabsTrigger value='video' className='flex items-center gap-1.5 py-2'>
            <Video className='h-4 w-4' />
            Tải video TikTok
          </TabsTrigger>
        </TabsList>

        <TabsContent value='channel' className='space-y-4'>
          <TikTokChannel />
        </TabsContent>
        <TabsContent value='audio' className='space-y-4'>
          <TikTokAudio />
        </TabsContent>
        <TabsContent value='video' className='space-y-4'>
          <TikTokVideo />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default TikTokToolsPage
