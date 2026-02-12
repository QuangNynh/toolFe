import { SectionCards } from '@/components/section-cards';
import { youtubeService } from '@/services/youtube.service';
import { useEffect } from 'react';

const Home = () => {
  const get = async () => {
    const data = await youtubeService.getTranscripts(['SNFlZaddcCc']);
    console.log(data);

  }
  useEffect(() => {
   console.log(import.meta.env.SERVER_LOCAL);
  }, []);

  return (
    <div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6'>
      <SectionCards />
    </div>
  )
}
export default Home
