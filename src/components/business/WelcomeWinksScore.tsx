import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScoreIndicator, getWelcomingLevel } from './ScoreIndicator';
import { Users, TrendingUp, Award, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WelcomeWinksScoreProps {
  score: number | null;
  totalRatings: number;
  maxPossibleScore?: number;
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
  className?: string;
}

export const WelcomeWinksScore: React.FC<WelcomeWinksScoreProps> = ({
  score,
  totalRatings,
  maxPossibleScore = 5.0,
  size = 'medium',
  showDetails = true,
  className
}) => {
  // Normalize score to handle legacy 5.1 scores
  const normalizedScore = score !== null && score !== undefined ? Math.min(score, 5.0) : null;
  const hasScore = normalizedScore !== null && normalizedScore !== undefined;
  const scorePercentage = hasScore ? (normalizedScore / maxPossibleScore) * 100 : 0;
  const welcomingLevel = hasScore ? getWelcomingLevel(normalizedScore) : null;

  const getScoreColor = () => {
    if (!hasScore) return 'text-muted-foreground';
    if (scorePercentage >= 70) return 'text-success';
    if (scorePercentage >= 30) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreLabel = () => {
    if (!hasScore) return 'Not Yet Rated';
    if (scorePercentage >= 70) return 'Very Welcoming';
    if (scorePercentage >= 30) return 'Moderately Welcoming';
    return 'Not Very Welcoming';
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return {
          scoreSize: 'text-2xl',
          labelSize: 'text-sm',
          iconSize: 'h-6 w-6',
          padding: 'p-4'
        };
      case 'medium':
        return {
          scoreSize: 'text-3xl',
          labelSize: 'text-base',
          iconSize: 'h-8 w-8',
          padding: 'p-6'
        };
      case 'large':
        return {
          scoreSize: 'text-4xl',
          labelSize: 'text-lg',
          iconSize: 'h-12 w-12',
          padding: 'p-8'
        };
    }
  };

  const sizeConfig = getSizeConfig();

  if (!hasScore) {
    return (
      <Card className={cn('bg-gradient-to-br from-muted/50 to-muted/30', className)}>
        <CardContent className={cn('text-center', sizeConfig.padding)}>
          <div className="flex justify-center mb-4">
            <div className={cn('rounded-full bg-muted/50 p-3', sizeConfig.iconSize)}>
              <AlertCircle className={cn('text-muted-foreground', sizeConfig.iconSize)} />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className={cn('font-bold text-muted-foreground', sizeConfig.labelSize)}>
              Welcome Winks Score
            </h3>
            <p className="text-sm text-muted-foreground">
              No community ratings yet
            </p>
            {showDetails && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>Be the first to rate</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20', className)}>
      <CardHeader className="text-center pb-2">
        <CardTitle className="flex items-center justify-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          <span className="text-gradient">Welcome Winks Score</span>
        </CardTitle>
      </CardHeader>
      <CardContent className={cn('text-center space-y-4', sizeConfig.padding)}>
        {/* Main Score Display */}
        <div className="space-y-3">
          <div className="flex justify-center">
            <ScoreIndicator
              score={normalizedScore}
              size={size === 'large' ? 'large' : size === 'medium' ? 'medium' : 'small'}
              variant="full"
              showLabel={false}
            />
          </div>

          <div className="space-y-2">
            <div className={cn('font-bold', getScoreColor(), sizeConfig.scoreSize)}>
              {normalizedScore.toFixed(1)}
            </div>
            <div className={cn('font-medium', getScoreColor(), sizeConfig.labelSize)}>
              {getScoreLabel()}
            </div>
            <Badge
              variant={scorePercentage >= 70 ? 'default' : scorePercentage >= 30 ? 'secondary' : 'destructive'}
              className="text-xs"
            >
              {scorePercentage.toFixed(1)}% of maximum
            </Badge>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>Score Progress</span>
            <span>{maxPossibleScore.toFixed(1)}</span>
          </div>
          <Progress
            value={scorePercentage}
            className="h-2"
            style={{
              background: `linear-gradient(to right, 
                hsl(var(--destructive)) 0% 30%, 
                hsl(var(--warning)) 30% 70%, 
                hsl(var(--success)) 70% 100%)`
            }}
          />
        </div>

        {/* Details */}
        {showDetails && (
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{totalRatings} community response{totalRatings !== 1 ? 's' : ''}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 bg-muted/30 rounded">
                <div className="font-medium text-muted-foreground">Score Range</div>
                <div className="text-primary font-bold">0 - {maxPossibleScore.toFixed(1)}</div>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <div className="font-medium text-muted-foreground">Threshold</div>
                <div className="text-primary font-bold">
                  {(maxPossibleScore * 0.7).toFixed(1)}+ Very Welcoming
                </div>
              </div>
            </div>

            {/* Score Interpretation */}
            <div className="p-3 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Score Analysis</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {scorePercentage >= 70
                  ? "Community consistently reports this establishment as very inclusive and welcoming to diverse customers."
                  : scorePercentage >= 30
                    ? "Community feedback shows mixed responses about the establishment's inclusiveness and welcoming atmosphere."
                    : "Community reports concerns about the establishment's inclusiveness and welcoming atmosphere."
                }
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

