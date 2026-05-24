interface HalftoneBarProps {
  value: number;
  max: number;
  label: string;
  color?: 'ink' | 'green' | 'blue' | 'red';
  className?: string;
}

const colorMap: Record<string, string> = {
  ink: '#1a1a1a',
  green: '#27ae60',
  blue: '#2980b9',
  red: '#c0392b',
};

export default function HalftoneBar({
  value,
  max,
  label,
  color = 'ink',
  className = '',
}: HalftoneBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const fillColor = colorMap[color] || colorMap.ink;

  return (
    <div className={className}>
      <div className="flex justify-between text-xs font-bold mb-1" style={{ color: '#1a1a1a' }}>
        <span>{label}</span>
        <span>{value}/{max}</span>
      </div>
      <div
        className="h-3 border-2 overflow-hidden"
        style={{
          borderColor: '#1a1a1a',
          background: '#e0e0e0',
        }}
      >
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${pct}%`, background: fillColor }}
        />
      </div>
    </div>
  );
}
