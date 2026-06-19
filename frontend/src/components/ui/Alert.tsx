import { cn } from '@/lib/utils'

interface AlertProps {
  type: 'success' | 'warning' | 'error' | 'info'
  title?: string
  children: React.ReactNode
  className?: string
}

const styles = {
  success: {
    container: 'bg-green-50 border-l-4 border-green-500',
    title:     'text-green-800',
    body:      'text-green-700',
    icon:      '✅',
  },
  warning: {
    container: 'bg-yellow-50 border-l-4 border-yellow-500',
    title:     'text-yellow-800',
    body:      'text-yellow-700',
    icon:      '⚠️',
  },
  error: {
    container: 'bg-red-50 border-l-4 border-red-500',
    title:     'text-red-800',
    body:      'text-red-700',
    icon:      '❌',
  },
  info: {
    container: 'bg-blue-50 border-l-4 border-blue-500',
    title:     'text-blue-800',
    body:      'text-blue-700',
    icon:      'ℹ️',
  },
}

export default function Alert({ type, title, children, className }: AlertProps) {
  const s = styles[type]
  return (
    <div className={cn('rounded-lg p-4', s.container, className)}>
      <div className="flex items-start gap-3">
        <span className="text-lg">{s.icon}</span>
        <div>
          {title && (
            <p className={cn('font-semibold text-sm mb-1', s.title)}>{title}</p>
          )}
          <div className={cn('text-sm', s.body)}>{children}</div>
        </div>
      </div>
    </div>
  )
}