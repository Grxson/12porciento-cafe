import {
  Coffee,
  Snowflake,
  Wrench,
  Wind,
  Filter,
  Flame,
  FlaskConical,
  Droplets,
} from 'lucide-react';

interface MethodIconProps {
  method: string;
  className?: string;
}

export default function MethodIcon({ method, className = 'w-4 h-4' }: MethodIconProps) {
  const m = method.toLowerCase();
  if (m.includes('espresso') || m.includes('americano')) return <Coffee className={className} />;
  if (m.includes('moka') || m.includes('presión')) return <Wrench className={className} />;
  if (m.includes('cold') || m.includes('frío')) return <Snowflake className={className} />;
  if (m.includes('aero')) return <Wind className={className} />;
  if (m.includes('french')) return <Filter className={className} />;
  if (m.includes('turco') || m.includes('olla') || m.includes('dalgona'))
    return <Flame className={className} />;
  if (m.includes('sifón') || m.includes('sifon')) return <FlaskConical className={className} />;
  return <Droplets className={className} />;
}
