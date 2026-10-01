import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

export function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="grid min-h-[60dvh] place-items-center p-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/12 text-brand-600 dark:text-brand-300">
          <Icon name="compass" size={24} />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-ink">Nothing here</h1>
        <p className="mt-1.5 text-sm leading-6 text-muted">
          That page does not exist. It may have been renamed, or the link is out of date.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="secondary" icon="arrow-left" onClick={() => navigate(-1)}>Go back</Button>
          <Button variant="primary" icon="home" onClick={() => navigate('/app')}>Home</Button>
        </div>
      </div>
    </div>
  )
}
