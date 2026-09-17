import React from 'react'

interface ProgressBarProps {
  value: number
  max?: number
  color?: 'green' | 'blue' | 'purple'
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, max = 100, color = 'green' }) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  const colorClasses = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
  }

  return (
    <div className="w-full">
      <div className="mb-1 flex justify-between text-xs text-gray-600">
        <span>{percentage.toFixed(1)}%</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-200">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${colorClasses[color]}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  )
}
