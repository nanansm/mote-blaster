interface StatCardProps {
  title:    string
  value:    string | number
  subtitle?: string
  icon?:    React.ReactNode
  color?:   'blue' | 'green' | 'red' | 'slate'
}

export function StatCard({ title, value, subtitle, icon, color = 'slate' }: StatCardProps) {
  const colorMap = {
    blue:  'text-blue-600',
    green: 'text-green-600',
    red:   'text-red-500',
    slate: 'text-slate-800',
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className={`text-3xl font-bold mt-1 ${colorMap[color]}`}>{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
    </div>
  )
}
