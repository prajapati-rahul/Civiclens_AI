import { scoreRingColor } from '../utils/helpers'

interface Props {
  score: number
  size?: number
  strokeWidth?: number
  label?: string
}

export default function ScoreRing({ score, size = 96, strokeWidth = 8, label }: Props) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const validScore = Math.max(0, Math.min(100, score))
  const offset = circumference - (validScore / 100) * circumference
  const color = scoreRingColor(validScore)
  const cx = size / 2
  const cy = size / 2
  const fontSize = size < 80 ? 16 : 22

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`Score: ${validScore} out of 100`} role="img">
        {/* Background track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        {/* Score text */}
        <text
          x={cx}
          y={cy + fontSize * 0.35}
          textAnchor="middle"
          fontSize={fontSize}
          fontWeight="700"
          fill={color}
          fontFamily="Inter, sans-serif"
        >
          {validScore}
        </text>
      </svg>
      {label && <span className="text-xs text-slate-500 font-medium">{label}</span>}
    </div>
  )
}
