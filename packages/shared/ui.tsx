import { useId } from 'react';

export function ApexMark({ size = 36 }: { size?: number }) {
  const gid = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`apex-${gid}`} x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3B78FF" />
          <stop offset="0.55" stopColor="#1D52CE" />
          <stop offset="1" stopColor="#0034A8" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill={`url(#apex-${gid})`} />
      <path
        d="M11.5 28.5 20 10.5l8.5 18"
        stroke="white"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15.4 22.6h9.2" stroke="white" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({
  tone = 'dark',
  size = 34,
  compact = false,
}: {
  tone?: 'dark' | 'light';
  size?: number;
  compact?: boolean;
}) {
  return (
    <span className="apex-logo" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <ApexMark size={size} />
      {!compact && (
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: size * 0.52,
              letterSpacing: '-0.045em',
              color: tone === 'light' ? '#fff' : 'var(--ink-900)',
            }}
          >
            Apex
          </span>
          <span
            style={{
              fontSize: Math.max(8, size * 0.22),
              fontWeight: 700,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: tone === 'light' ? 'rgba(255,255,255,.62)' : 'var(--ink-400)',
              marginTop: 3,
            }}
          >
            Finance
          </span>
        </span>
      )}
    </span>
  );
}

export function Avatar({
  initials,
  tint = '#FFDCCE',
  size = 40,
  ring = false,
}: {
  initials: string;
  tint?: string;
  size?: number;
  ring?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: tint,
        color: '#4A2A18',
        fontSize: size * 0.34,
        fontWeight: 800,
        fontFamily: 'var(--font-ui)',
        letterSpacing: '-0.02em',
        boxShadow: ring ? '0 0 0 3px #fff, 0 0 0 5px rgba(29,82,206,.16)' : undefined,
        flexShrink: 0,
      }}
    >
      {initials}
    </span>
  );
}

export function Sparkline({
  data,
  width = 120,
  height = 40,
  stroke = '#12B76A',
  fill = true,
  strokeWidth = 2,
  showDot = false,
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: boolean;
  strokeWidth?: number;
  showDot?: boolean;
  className?: string;
}) {
  const gid = useId().replace(/:/g, '');
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pad = 3;
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1 || 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${points[points.length - 1][0].toFixed(1)} ${height} L${points[0][0].toFixed(1)} ${height} Z`;
  const last = points[points.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true">
      {fill && (
        <>
          <defs>
            <linearGradient id={`spark-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={stroke} stopOpacity="0.24" />
              <stop offset="1" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#spark-${gid})`} />
        </>
      )}
      <path d={line} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      {showDot && <circle cx={last[0]} cy={last[1]} r={3} fill={stroke} stroke="#fff" strokeWidth="1.5" />}
    </svg>
  );
}

export function Donut({
  segments,
  size = 72,
  thickness = 10,
  gap = 5,
  children,
}: {
  segments: { value: number; color: string }[];
  size?: number;
  thickness?: number;
  gap?: number;
  children?: React.ReactNode;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <span style={{ position: 'relative', width: size, height: size, display: 'inline-block', flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#EDF0F5" strokeWidth={thickness} />
        {segments.map((seg, i) => {
          const len = (seg.value / total) * circumference;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeLinecap="round"
              strokeDasharray={`${Math.max(0, len - gap)} ${circumference}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      {children && (
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            lineHeight: 1.15,
          }}
        >
          {children}
        </span>
      )}
    </span>
  );
}

export function Trend({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const up = value >= 0;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        color: up ? 'var(--green-600)' : 'var(--red-600)',
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path
          d={up ? 'M2 9 10 3M10 3H5M10 3v5' : 'M2 3l8 6M10 9H5M10 9V4'}
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {Math.abs(value).toFixed(1)}
      {suffix}
    </span>
  );
}
