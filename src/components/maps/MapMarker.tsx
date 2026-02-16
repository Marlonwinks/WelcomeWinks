import React from 'react';
import { cn } from '@/lib/utils';
import { ScoreIndicator } from '@/components/business/ScoreIndicator';

interface MapMarkerProps {
  business: {
    id: string;
    name: string;
    score: number | null;
    totalMarks: number;
  };
  position: { x: number; y: number };
  onClick: () => void;
  isSelected?: boolean;
}

export const MapMarker: React.FC<MapMarkerProps> = ({ 
  business, 
  position, 
  onClick, 
  isSelected 
}) => {
  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      onClick={onClick}
    >
      <div
        className={cn(
          "relative transition-smooth interactive-scale",
          isSelected && "scale-125 animate-pulse-glow",
          !isSelected && "hover:scale-110"
        )}
      >
        <ScoreIndicator 
          score={business.score}
          size="large"
          variant="badge"
          showLabel={false}
          className="shadow-medium"
        />
        
        {/* Marker count badge */}
        {business.totalMarks > 0 && (
          <div className="absolute -top-1 -right-1 bg-foreground text-background text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-soft">
            {business.totalMarks}
          </div>
        )}
      </div>
      
      {/* Selected tooltip */}
      {isSelected && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-card text-card-foreground px-2 py-1 rounded text-xs whitespace-nowrap shadow-brand border border-border animate-fade-in">
          {business.name}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-border"></div>
        </div>
      )}
    </div>
  );
};