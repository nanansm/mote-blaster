interface StatCardProps {
  title:    string
  value:    string | number
  subtitle?: string
  icon?:    React.ReactNode
  color?:   'blue' | 'green' | 'red' | 'slate' | 'amber'
}

export function StatCard({ title, value, subtitle, icon, color = 'slate' }: StatCardProps) {
  const colorMap: Record<string, { value: string; iconBg: string; iconText: string }> = {
    blue:  { value: 'text-blue-600',  iconBg: 'bg-blue-100',  iconText: 'text-blue-600' },
    green: { value: 'text-green-600', iconBg: 'bg-green-100', iconText: 'text-green-600' },
    red:   { value: 'text-red-500',   iconBg: 'bg-red-100',   iconText: 'text-red-500' },
    slate: { value: 'text-slate-800', iconBg: 'bg-slate-100', iconText: 'text-slate-500' },
    amber: { value: 'text-amber-600', iconBg: 'bg-amber-100', iconText: 'text-amber-600' },
  }
  const c = colorMap[color]
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 leading-snug">{title}</p>
          <p className={`text-3xl font-bold mt-1.5 ${c.value}`}>{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.iconBg} ${c.iconText}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
