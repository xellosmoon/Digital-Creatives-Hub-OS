import { Sparkles } from 'lucide-react';

interface BrandedLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function BrandedLoader({ size = 'md', className = '' }: BrandedLoaderProps): JSX.Element {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const iconSize = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`relative ${sizeClasses[size]}`}>
        {/* Outer ring */}
        <div className={`absolute inset-0 rounded-full border-4 border-violet-200 dark:border-violet-800`}>
          <div className={`absolute inset-0 rounded-full border-4 border-transparent border-t-violet-500 dark:border-t-violet-400 animate-spin`} />
        </div>
        
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className={`${iconSize[size]} text-violet-500 dark:text-violet-400 animate-pulse`} />
        </div>
      </div>
    </div>
  );
}
