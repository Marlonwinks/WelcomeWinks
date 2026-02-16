import React from 'react';
import { cn } from '@/lib/utils';

interface DonutChartProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const DonutChart: React.FC<DonutChartProps> = ({ 
  score, 
  size = 'md', 
  showLabel = true 
}) => {
  const percentage = Math.min(Math.max(score / 5 * 100, 0), 100);
  const circumference = 2 * Math.PI * 42;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
  
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };
  
  const textClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };
  
  // Color based on score
  const getColor = (score: number) => {
    if (score >= 4) return 'stroke-success';
    if (score >= 3) return 'stroke-primary';
    if (score >= 2) return 'stroke-warning';
    return 'stroke-destructive';
  };

  return (
    <div className={cn("relative", sizeClasses[size])}>
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="42"
          stroke="hsl(var(--muted))"
          strokeWidth="8"
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="42"
          className={getColor(score)}
          strokeWidth="8"
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dasharray 0.5s ease-in-out',
          }}
        />
      </svg>
      
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-semibold text-foreground", textClasses[size])}>
            {score.toFixed(1)}
          </span>
        </div>
      )}
    </div>
  );
};