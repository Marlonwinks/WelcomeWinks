import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DonutChart } from '@/components/charts/DonutChart';
import { Star, Award, AlertCircle } from 'lucide-react';
import { getWelcomingLevel } from './ScoreIndicator';
import { MatchQualityIndicator } from './MatchQualityIndicator';
import { cn } from '@/lib/utils';
import { RelevanceScore } from '@/types/businessAttributes';

interface BusinessCardProps {
  name: string;
  category: string;
  address: string;
  googleRating?: number;
  winksScore?: number | null; // Firebase rating score
  totalMarks?: number; // Firebase rating count
  googleTotalMarks?: number; // Google reviews count
  relevanceScore?: RelevanceScore; // Preference match score
  onMatchClick?: () => void; // Handler to show detailed match breakdown
}



export const BusinessCard: React.FC<BusinessCardProps> = ({
  name,
  category,
  address,
  googleRating,
  winksScore = null,
  totalMarks = 0,
  googleTotalMarks,
  relevanceScore,
  onMatchClick,
}) => {
  // Normalize score to handle legacy 5.1 scores
  const normalizedScore = winksScore !== null && winksScore !== undefined ? Math.min(winksScore, 5.0) : null;
  const hasScore = normalizedScore !== null && normalizedScore !== undefined;
  const welcomingLevel = hasScore ? getWelcomingLevel(normalizedScore) : 'unrated';
  const hasRelevanceScore = relevanceScore !== undefined && relevanceScore !== null;



  return (
    <Card className={cn(
      "group cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/30 overflow-hidden",
      "bg-card border border-border",
      "shadow-sm"
    )}>
      <CardContent className="p-0">
        <div className="flex min-h-[120px]">
          {/* Score Section - Left Side */}
          <div className="w-32 md:w-36 flex-shrink-0 p-4 flex flex-col items-center justify-center bg-muted/30 border-r border-border">
            {hasScore ? (
              <div className="text-center space-y-2">
                <div className="text-xs font-semibold text-muted-foreground tracking-wide">
                  Welcome Winks Score
                </div>
                <div className={cn(
                  "text-3xl md:text-4xl font-black leading-none",
                  welcomingLevel === 'very-welcoming' ? 'text-green-600' :
                    welcomingLevel === 'moderately-welcoming' ? 'text-yellow-600' :
                      'text-red-600'
                )}>
                  {normalizedScore.toFixed(1)}
                </div>

                <Badge
                  variant={
                    welcomingLevel === 'very-welcoming' ? 'default' :
                      welcomingLevel === 'moderately-welcoming' ? 'secondary' :
                        'destructive'
                  }
                  className="text-[10px] px-2 py-0.5 font-medium shadow-none"
                >
                  {welcomingLevel === 'very-welcoming' ? 'Very Welcoming' :
                    welcomingLevel === 'moderately-welcoming' ? 'Moderately Welcoming' :
                      'Not Very Welcoming'}
                </Badge>

                {totalMarks > 0 && (
                  <div className="text-xs text-muted-foreground font-medium">
                    {totalMarks} {totalMarks !== 1 ? 'ratings' : 'rating'}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center space-y-2">
                <AlertCircle className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                <div className="text-xs font-medium text-muted-foreground">Not Yet Rated</div>
              </div>
            )}
          </div>

          {/* Business Info - Right Side */}
          <div className="flex-1 p-4 bg-transparent">
            <div className="h-full flex flex-col justify-between">
              {/* Header with Match Indicator */}
              <div className="space-y-1 mb-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-lg md:text-xl text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors flex-1">
                    {name}
                  </h3>
                  {/* Match Quality Indicator */}
                  {hasRelevanceScore && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onMatchClick?.();
                      }}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <MatchQualityIndicator score={relevanceScore} compact />
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground capitalize font-medium">
                  {category.replace(/_/g, ' ')}
                </p>
              </div>

              {/* Ratings and Address */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  {googleRating && (
                    <div className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900/50">
                      <Star className="h-3 w-3 fill-current" />
                      <span>{googleRating}</span>
                      {googleTotalMarks && <span className="text-amber-600/70">({googleTotalMarks})</span>}
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground/80 line-clamp-1">
                  {address}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

