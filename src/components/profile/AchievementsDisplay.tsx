import React, { useState, useEffect } from 'react';
import { Trophy, Star, MapPin, Users, Gem, Lock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { achievementsService, Achievement, AchievementProgress } from '@/services/achievements.service';
import { cn } from '@/lib/utils';

interface AchievementsDisplayProps {
  userId: string;
  userStats?: {
    averageScore?: number;
    totalRatings?: number;
    uniqueBusinesses?: number;
    businessesHelped?: number;
    highestScore?: number;
  };
  className?: string;
}

export const AchievementsDisplay: React.FC<AchievementsDisplayProps> = ({
  userId,
  userStats,
  className
}) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [progress, setProgress] = useState<AchievementProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAchievements();
  }, [userId]);

  const loadAchievements = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [userAchievements, achievementProgress] = await Promise.all([
        achievementsService.getUserAchievements(userId),
        userStats ? achievementsService.getAchievementProgress(userId, userStats) : []
      ]);

      setAchievements(userAchievements);
      setProgress(achievementProgress);
    } catch (err) {
      console.error('Failed to load achievements:', err);
      // Handle permission errors gracefully
      if (err instanceof Error && err.message.includes('Missing or insufficient permissions')) {
        setError('Achievement system is not yet configured. Please contact support.');
      } else {
        setError('Failed to load achievements');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getAchievementIcon = (type: string) => {
    const icons = {
      high_scorer: <Trophy className="h-5 w-5" />,
      frequent_rater: <Star className="h-5 w-5" />,
      explorer: <MapPin className="h-5 w-5" />,
      community_contributor: <Users className="h-5 w-5" />,
      perfect_score: <Gem className="h-5 w-5" />,
    };
    return icons[type as keyof typeof icons] || <Trophy className="h-5 w-5" />;
  };

  const getRarityColor = (rarity: Achievement['rarity']) => {
    const colors = {
      common: 'text-gray-500 border-gray-200',
      uncommon: 'text-green-500 border-green-200',
      rare: 'text-blue-500 border-blue-200',
      epic: 'text-purple-500 border-purple-200',
      legendary: 'text-yellow-500 border-yellow-200',
    };
    return colors[rarity];
  };

  const getRarityBadgeColor = (rarity: Achievement['rarity']) => {
    const colors = {
      common: 'bg-gray-100 text-gray-800',
      uncommon: 'bg-green-100 text-green-800',
      rare: 'bg-blue-100 text-blue-800',
      epic: 'bg-purple-100 text-purple-800',
      legendary: 'bg-yellow-100 text-yellow-800',
    };
    return colors[rarity];
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Achievements
          {achievements.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {achievements.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Unlocked Achievements */}
        {achievements.length > 0 ? (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-green-600">Unlocked</h4>
            <div className="grid gap-3">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
                    getRarityColor(achievement.rarity)
                  )}
                >
                  <div className="flex-shrink-0">
                    {getAchievementIcon(achievement.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-medium text-sm">{achievement.title}</h5>
                      <Badge
                        variant="outline"
                        className={cn("text-xs", getRarityBadgeColor(achievement.rarity))}
                      >
                        {achievement.rarity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {achievement.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-medium">+{achievement.points} pts</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(achievement.unlockedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No achievements unlocked yet. Keep rating businesses to earn your first achievement!
            </p>
          </div>
        )}

        {/* Achievement Progress */}
        {progress.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Progress</h4>
            <div className="space-y-3">
              {progress.map((prog) => (
                <div key={prog.achievementType} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {prog.completed ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium capitalize">
                        {prog.achievementType.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {prog.current}/{prog.required}
                    </span>
                  </div>
                  <Progress
                    value={(prog.current / prog.required) * 100}
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Achievement Categories */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Categories</h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              { category: 'rating', icon: '⭐', count: achievements.filter(a => a.category === 'rating').length },
              { category: 'exploration', icon: '🗺️', count: achievements.filter(a => a.category === 'exploration').length },
              { category: 'community', icon: '🤝', count: achievements.filter(a => a.category === 'community').length },
              { category: 'special', icon: '💎', count: achievements.filter(a => a.category === 'special').length },
            ].map((cat) => (
              <div key={cat.category} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <span className="text-lg">{cat.icon}</span>
                <div className="flex-1">
                  <p className="text-xs font-medium capitalize">{cat.category}</p>
                  <p className="text-xs text-muted-foreground">{cat.count} unlocked</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
