import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const sizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
};

export const Logo = ({ className, size = 'md', showText = false }: LogoProps) => {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        className={cn(sizeClasses[size], 'shrink-0')}
      >
        {/* Background document (back) */}
        <rect x="8" y="4" width="18" height="22" rx="2" fill="#94a3b8" stroke="#64748b" strokeWidth="1"/>

        {/* Middle document */}
        <rect x="5" y="7" width="18" height="22" rx="2" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1"/>

        {/* Front document */}
        <rect x="2" y="10" width="18" height="22" rx="2" fill="#f8fafc" stroke="#64748b" strokeWidth="1.5"/>

        {/* Document lines */}
        <line x1="5" y1="16" x2="17" y2="16" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="5" y1="20" x2="15" y2="20" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="5" y1="24" x2="13" y2="24" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>

        {/* Assembly indicator (gear/cog) */}
        <circle cx="24" cy="24" r="6" fill="#3b82f6"/>
        <circle cx="24" cy="24" r="2.5" fill="#f8fafc"/>
        <g fill="#3b82f6">
          <rect x="23" y="17" width="2" height="3" rx="0.5"/>
          <rect x="23" y="28" width="2" height="3" rx="0.5"/>
          <rect x="17" y="23" width="3" height="2" rx="0.5"/>
          <rect x="28" y="23" width="3" height="2" rx="0.5"/>
        </g>
      </svg>
      {showText && (
        <span className="font-bold text-lg tracking-tight truncate">Doc Assembly</span>
      )}
    </div>
  );
};
