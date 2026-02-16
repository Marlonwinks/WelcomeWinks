import { db } from './firebase';
import { collection, doc, addDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { createFirestoreConverter, createFirestoreError } from '../utils/firestore';

export interface Achievement {
  id: string;
  userId: string;
  type: 'high_scorer' | 'frequent_rater' | 'explorer' | 'community_contributor' | 'early_adopter' | 'perfect_score';
  title: string;
  description: string;
  icon: string;
  unlockedAt: Date;
  points: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  category: 'rating' | 'exploration' | 'community' | 'special';
}

export interface AchievementProgress {
  achievementType: string;
  current: number;
  required: number;
  completed: boolean;
  unlockedAt?: Date;
}

export class AchievementsService {
  private static instance: AchievementsService;

  public static getInstance(): AchievementsService {
    if (!AchievementsService.instance) {
      AchievementsService.instance = new AchievementsService();
    }
    return AchievementsService.instance;
  }

  /**
   * Get all achievements for a user
   */
  async getUserAchievements(userId: string): Promise<Achievement[]> {
    try {
      const achievementsRef = collection(db, 'achievements');
      const q = query(
        achievementsRef,
        where('userId', '==', userId)
        // Removed orderBy to avoid index requirement - will sort in memory
      );
      
      const querySnapshot = await getDocs(q.withConverter(createFirestoreConverter<Achievement>()));
      const achievements = querySnapshot.docs.map(doc => doc.data());
      
      // Sort in memory by unlockedAt descending
      return achievements.sort((a, b) => b.unlockedAt.getTime() - a.unlockedAt.getTime());
    } catch (error) {
      // Handle permission errors gracefully
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        console.warn('Achievements: Firestore permissions not configured, returning empty array');
        return [];
      }
      throw createFirestoreError('getUserAchievements', error, { userId });
    }
  }

  /**
   * Check and unlock achievements for a user
   */
  async checkAndUnlockAchievements(userId: string, userStats: any): Promise<Achievement[]> {
    try {
      const unlockedAchievements: Achievement[] = [];
      
      // Get existing achievements to avoid duplicates
      const existingAchievements = await this.getUserAchievements(userId);
      const existingTypes = new Set(existingAchievements.map(a => a.type));

      // Check each achievement type
      const achievementsToCheck = [
        this.checkHighScorerAchievement(userId, userStats, existingTypes),
        this.checkFrequentRaterAchievement(userId, userStats, existingTypes),
        this.checkExplorerAchievement(userId, userStats, existingTypes),
        this.checkCommunityContributorAchievement(userId, userStats, existingTypes),
        this.checkPerfectScoreAchievement(userId, userStats, existingTypes),
      ];

      const results = await Promise.all(achievementsToCheck);
      
      for (const achievement of results) {
        if (achievement) {
          unlockedAchievements.push(achievement);
        }
      }

      return unlockedAchievements;
    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  }

  /**
   * Check high scorer achievement (4.0+ average score)
   */
  private async checkHighScorerAchievement(userId: string, userStats: any, existingTypes: Set<string>): Promise<Achievement | null> {
    if (existingTypes.has('high_scorer')) return null;
    
    if (userStats.averageScore >= 4.0) {
      return await this.createAchievement(userId, {
        type: 'high_scorer',
        title: 'High Scorer',
        description: `Achieved an average score of ${userStats.averageScore.toFixed(1)}/5.0`,
        icon: '🏆',
        points: 100,
        rarity: 'uncommon',
        category: 'rating'
      });
    }
    return null;
  }

  /**
   * Check frequent rater achievement (10+ ratings)
   */
  private async checkFrequentRaterAchievement(userId: string, userStats: any, existingTypes: Set<string>): Promise<Achievement | null> {
    if (existingTypes.has('frequent_rater')) return null;
    
    if (userStats.totalRatings >= 10) {
      return await this.createAchievement(userId, {
        type: 'frequent_rater',
        title: 'Frequent Rater',
        description: `Submitted ${userStats.totalRatings} ratings`,
        icon: '⭐',
        points: 50,
        rarity: 'common',
        category: 'rating'
      });
    }
    return null;
  }

  /**
   * Check explorer achievement (rated 5+ different businesses)
   */
  private async checkExplorerAchievement(userId: string, userStats: any, existingTypes: Set<string>): Promise<Achievement | null> {
    if (existingTypes.has('explorer')) return null;
    
    if (userStats.uniqueBusinesses >= 5) {
      return await this.createAchievement(userId, {
        type: 'explorer',
        title: 'Explorer',
        description: `Rated ${userStats.uniqueBusinesses} different businesses`,
        icon: '🗺️',
        points: 75,
        rarity: 'common',
        category: 'exploration'
      });
    }
    return null;
  }

  /**
   * Check community contributor achievement (helped 3+ businesses)
   */
  private async checkCommunityContributorAchievement(userId: string, userStats: any, existingTypes: Set<string>): Promise<Achievement | null> {
    if (existingTypes.has('community_contributor')) return null;
    
    if (userStats.businessesHelped >= 3) {
      return await this.createAchievement(userId, {
        type: 'community_contributor',
        title: 'Community Contributor',
        description: `Helped ${userStats.businessesHelped} businesses improve their scores`,
        icon: '🤝',
        points: 150,
        rarity: 'rare',
        category: 'community'
      });
    }
    return null;
  }

  /**
   * Check perfect score achievement (5.0/5.0 score)
   */
  private async checkPerfectScoreAchievement(userId: string, userStats: any, existingTypes: Set<string>): Promise<Achievement | null> {
    if (existingTypes.has('perfect_score')) return null;
    
    if (userStats.highestScore >= 5.0) {
      return await this.createAchievement(userId, {
        type: 'perfect_score',
        title: 'Perfect Score',
        description: 'Achieved a perfect 5.0/5.0 score',
        icon: '💎',
        points: 500,
        rarity: 'legendary',
        category: 'special'
      });
    }
    return null;
  }

  /**
   * Create a new achievement
   */
  private async createAchievement(userId: string, achievementData: Omit<Achievement, 'id' | 'userId' | 'unlockedAt'>): Promise<Achievement> {
    try {
      const achievement: Omit<Achievement, 'id'> = {
        ...achievementData,
        userId,
        unlockedAt: new Date()
      };

      const converter = createFirestoreConverter<Achievement>();
      const docRef = await addDoc(
        collection(db, 'achievements').withConverter(converter),
        achievement
      );

      return {
        ...achievement,
        id: docRef.id
      };
    } catch (error) {
      // Handle permission errors gracefully
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        console.warn('Achievements: Cannot create achievement due to Firestore permissions, returning null');
        return null;
      }
      throw error;
    }
  }

  /**
   * Get achievement progress for a user
   */
  async getAchievementProgress(userId: string, userStats: any): Promise<AchievementProgress[]> {
    const progress: AchievementProgress[] = [
      {
        achievementType: 'high_scorer',
        current: userStats.averageScore || 0,
        required: 4.0,
        completed: (userStats.averageScore || 0) >= 4.0
      },
      {
        achievementType: 'frequent_rater',
        current: userStats.totalRatings || 0,
        required: 10,
        completed: (userStats.totalRatings || 0) >= 10
      },
      {
        achievementType: 'explorer',
        current: userStats.uniqueBusinesses || 0,
        required: 5,
        completed: (userStats.uniqueBusinesses || 0) >= 5
      },
      {
        achievementType: 'community_contributor',
        current: userStats.businessesHelped || 0,
        required: 3,
        completed: (userStats.businessesHelped || 0) >= 3
      },
      {
        achievementType: 'perfect_score',
        current: userStats.highestScore || 0,
        required: 5.0,
        completed: (userStats.highestScore || 0) >= 5.0
      }
    ];

    return progress;
  }

  /**
   * Get rarity color
   */
  getRarityColor(rarity: Achievement['rarity']): string {
    const colors = {
      common: 'text-gray-500',
      uncommon: 'text-green-500',
      rare: 'text-blue-500',
      epic: 'text-purple-500',
      legendary: 'text-yellow-500'
    };
    return colors[rarity];
  }

  /**
   * Get category icon
   */
  getCategoryIcon(category: Achievement['category']): string {
    const icons = {
      rating: '⭐',
      exploration: '🗺️',
      community: '🤝',
      special: '💎'
    };
    return icons[category];
  }
}

export const achievementsService = AchievementsService.getInstance();
