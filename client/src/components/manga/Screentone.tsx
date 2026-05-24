interface ScreentoneProps {
  density: '10' | '30' | 'cross';
  className?: string;
}

export default function Screentone({ density, className = '' }: ScreentoneProps) {
  return (
    <div
      className={`screentone-${density} ${className}`}
      style={{ minHeight: 4 }}
      aria-hidden="true"
    />
  );
}
