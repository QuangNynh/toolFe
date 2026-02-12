import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useTranslation } from 'react-i18next'
import { LANG_STORAGE_KEY } from '@/i18n'
import VnIcon from '@/assets/icons/VnIcon'
import EnIcon from '@/assets/icons/EnIcon'

export function SiteHeader() {
  const { i18n, t } = useTranslation()

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang)
    localStorage.setItem(LANG_STORAGE_KEY, lang)
  }

  return (
    <header className='flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)'>
      <div className='flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6'>
        <SidebarTrigger className='-ml-1' />
        <Separator orientation='vertical' className='mx-2 data-[orientation=vertical]:h-4' />
        <h1 className='text-base font-medium'>Documents</h1>
        <div className='ml-auto flex items-center gap-2'>
          <Select value={i18n.language} onValueChange={changeLanguage}>
            <SelectTrigger size='sm' className='w-fit'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='vi'>
                <div className='flex items-center gap-2'>
                  <VnIcon />
                  <span>{t('language.vi')}</span>
                </div>
              </SelectItem>
              <SelectItem value='en'>
                <div className='flex items-center gap-2'>
                  <EnIcon />
                  <span>{t('language.en')}</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  )
}
