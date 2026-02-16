import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from './firebase';
import { errorHandlingService } from './errorHandling.service';
import {
  createFirestoreConverter,
  createFirestoreError,
  generateDocumentId,
  sanitizeForFirestore,
  validateRequiredFields
} from '../utils/firestore';

/**
 * Scoring Configuration Interface
 */
export interface ScoringConfiguration {
  id: string;
  version: string;
  isActive: boolean;
  responseValues: {
    yes: number;        // 0.833
    probably: number;   // 0.56
    probablyNot: number; // 0.28
    no: number;         // 0
  };
  maxPossibleScore: number; // Configurable based on number of questions
  questionCount: number;    // Number of questions in survey
  welcomingLevelThresholds: {
    veryWelcoming: number;    // 70% of max score
    moderatelyWelcoming: number; // 30% of max score
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  description?: string;
}

/**
 * Survey Question Configuration Interface
 */
export interface SurveyQuestionConfig {
  id: string;
  questionId: string;
  text: string;
  reverseScored: boolean;
  firebaseKey: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Scoring Configuration Service
 * Handles dynamic scoring configuration management
 */
export class ScoringConfigService {
  private static instance: ScoringConfigService;
  
  public static getInstance(): ScoringConfigService {
    if (!ScoringConfigService.instance) {
      ScoringConfigService.instance = new ScoringConfigService();
    }
    return ScoringConfigService.instance;
  }

  /**
   * Get the current active scoring configuration
   */
  async getActiveScoringConfig(): Promise<ScoringConfiguration | null> {
    try {
      const configsRef = collection(db, 'scoringConfigurations');
      const q = query(
        configsRef,
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q.withConverter(createFirestoreConverter<ScoringConfiguration>()));
      
      if (querySnapshot.empty) {
        return null;
      }
      
      // Find the first active configuration
      for (const doc of querySnapshot.docs) {
        const config = doc.data();
        if (config.isActive) {
          return config;
        }
      }
      
      return null;
    } catch (error) {
      throw createFirestoreError('getActiveScoringConfig', error);
    }
  }

  /**
   * Create a new scoring configuration
   */
  async createScoringConfig(
    configData: Partial<ScoringConfiguration>,
    createdBy: string
  ): Promise<ScoringConfiguration> {
    try {
      const configId = generateDocumentId();
      
      // Calculate max possible score based on question count
      const questionCount = configData.questionCount || 6;
      const maxPossibleScore = questionCount * (configData.responseValues?.yes || 0.833);
      
      const config: ScoringConfiguration = {
        id: configId,
        version: `v${Date.now()}`,
        isActive: true,
        responseValues: {
          yes: configData.responseValues?.yes || 0.833,
          probably: configData.responseValues?.probably || 0.56,
          probablyNot: configData.responseValues?.probablyNot || 0.28,
          no: configData.responseValues?.no || 0
        },
        maxPossibleScore,
        questionCount,
        welcomingLevelThresholds: {
          veryWelcoming: maxPossibleScore * 0.7,
          moderatelyWelcoming: maxPossibleScore * 0.3
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        description: configData.description || 'Default scoring configuration'
      };
      
      // Validate required fields
      validateRequiredFields(config, ['id', 'version', 'responseValues', 'maxPossibleScore', 'questionCount']);
      
      // Deactivate all existing configurations
      await this.deactivateAllConfigurations();
      
      // Save new configuration
      const converter = createFirestoreConverter<ScoringConfiguration>();
      await setDoc(
        doc(db, 'scoringConfigurations', configId).withConverter(converter),
        sanitizeForFirestore(config)
      );
      
      return config;
    } catch (error) {
      throw createFirestoreError('createScoringConfig', error, { configData, createdBy });
    }
  }

  /**
   * Update an existing scoring configuration
   */
  async updateScoringConfig(
    configId: string,
    updates: Partial<ScoringConfiguration>
  ): Promise<ScoringConfiguration> {
    try {
      const configRef = doc(db, 'scoringConfigurations', configId);
      
      // If updating response values or question count, recalculate max score
      let maxPossibleScore = updates.maxPossibleScore;
      if (updates.responseValues || updates.questionCount) {
        const currentConfig = await this.getScoringConfig(configId);
        if (currentConfig) {
          const questionCount = updates.questionCount || currentConfig.questionCount;
          const yesValue = updates.responseValues?.yes || currentConfig.responseValues.yes;
          maxPossibleScore = questionCount * yesValue;
        }
      }
      
      const updateData = {
        ...sanitizeForFirestore(updates),
        ...(maxPossibleScore && { maxPossibleScore }),
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(configRef, updateData);
      
      // Return updated configuration
      const updatedConfig = await this.getScoringConfig(configId);
      if (!updatedConfig) {
        throw new Error('Configuration not found after update');
      }
      
      return updatedConfig;
    } catch (error) {
      throw createFirestoreError('updateScoringConfig', error, { configId, updates });
    }
  }

  /**
   * Get a specific scoring configuration by ID
   */
  async getScoringConfig(configId: string): Promise<ScoringConfiguration | null> {
    try {
      const configRef = doc(db, 'scoringConfigurations', configId);
      const configDoc = await getDoc(configRef.withConverter(createFirestoreConverter<ScoringConfiguration>()));
      
      return configDoc.exists() ? configDoc.data() : null;
    } catch (error) {
      throw createFirestoreError('getScoringConfig', error, { configId });
    }
  }

  /**
   * Get all scoring configurations
   */
  async getAllScoringConfigs(): Promise<ScoringConfiguration[]> {
    try {
      const configsRef = collection(db, 'scoringConfigurations');
      const q = query(configsRef, orderBy('createdAt', 'desc'));
      
      const querySnapshot = await getDocs(q.withConverter(createFirestoreConverter<ScoringConfiguration>()));
      return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      throw createFirestoreError('getAllScoringConfigs', error);
    }
  }

  /**
   * Deactivate all scoring configurations
   */
  async deactivateAllConfigurations(): Promise<void> {
    try {
      const configs = await this.getAllScoringConfigs();
      
      const updatePromises = configs.map(config => 
        updateDoc(doc(db, 'scoringConfigurations', config.id), {
          isActive: false,
          updatedAt: serverTimestamp()
        })
      );
      
      await Promise.all(updatePromises);
    } catch (error) {
      throw createFirestoreError('deactivateAllConfigurations', error);
    }
  }

  /**
   * Activate a specific scoring configuration
   */
  async activateScoringConfig(configId: string): Promise<void> {
    try {
      // Deactivate all configurations first
      await this.deactivateAllConfigurations();
      
      // Activate the specified configuration
      await updateDoc(doc(db, 'scoringConfigurations', configId), {
        isActive: true,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      throw createFirestoreError('activateScoringConfig', error, { configId });
    }
  }

  /**
   * Get survey question configurations
   */
  async getSurveyQuestionConfigs(): Promise<SurveyQuestionConfig[]> {
    try {
      const questionsRef = collection(db, 'surveyQuestions');
      const q = query(questionsRef, orderBy('order', 'asc'));
      
      const querySnapshot = await getDocs(q.withConverter(createFirestoreConverter<SurveyQuestionConfig>()));
      return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      throw createFirestoreError('getSurveyQuestionConfigs', error);
    }
  }

  /**
   * Create or update survey question configuration
   */
  async upsertSurveyQuestion(questionConfig: SurveyQuestionConfig): Promise<SurveyQuestionConfig> {
    try {
      const questionRef = doc(db, 'surveyQuestions', questionConfig.questionId);
      
      const updateData = {
        ...sanitizeForFirestore(questionConfig),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(
        questionRef.withConverter(createFirestoreConverter<SurveyQuestionConfig>()),
        updateData
      );
      
      return questionConfig;
    } catch (error) {
      throw createFirestoreError('upsertSurveyQuestion', error, { questionConfig });
    }
  }

  /**
   * Initialize default scoring configuration
   */
  async initializeDefaultConfiguration(createdBy: string = 'system'): Promise<ScoringConfiguration> {
    try {
      const existingConfig = await this.getActiveScoringConfig();
      if (existingConfig) {
        return existingConfig;
      }
      
      const defaultConfig = await this.createScoringConfig({
        responseValues: {
          yes: 0.833, // Adjusted to make max score 5.0 (6 questions × 0.833 = 5.0)
          probably: 0.56,
          probablyNot: 0.28,
          no: 0
        },
        questionCount: 6,
        description: 'Default Welcome Winks scoring configuration'
      }, createdBy);
      
      // Initialize default survey questions
      await this.initializeDefaultSurveyQuestions();
      
      return defaultConfig;
    } catch (error) {
      throw createFirestoreError('initializeDefaultConfiguration', error, { createdBy });
    }
  }

  /**
   * Initialize default survey questions
   */
  private async initializeDefaultSurveyQuestions(): Promise<void> {
    const defaultQuestions: SurveyQuestionConfig[] = [
      {
        id: generateDocumentId(),
        questionId: 'trumpWelcome',
        text: "Would President Trump be welcome in this establishment?",
        reverseScored: true,
        firebaseKey: 'trumpWelcome',
        isActive: true,
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: generateDocumentId(),
        questionId: 'obamaWelcome',
        text: "Would President Obama be welcome in this establishment?",
        reverseScored: false,
        firebaseKey: 'obamaWelcome',
        isActive: true,
        order: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: generateDocumentId(),
        questionId: 'personOfColorComfort',
        text: "Would a person of color feel comfortable in this establishment?",
        reverseScored: false,
        firebaseKey: 'personOfColorComfort',
        isActive: true,
        order: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: generateDocumentId(),
        questionId: 'lgbtqSafety',
        text: "Would a member of the LGBTQ community feel safe in this establishment?",
        reverseScored: false,
        firebaseKey: 'lgbtqSafety',
        isActive: true,
        order: 4,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: generateDocumentId(),
        questionId: 'undocumentedSafety',
        text: "Would an undocumented individual feel safe in this establishment?",
        reverseScored: false,
        firebaseKey: 'undocumentedSafety',
        isActive: true,
        order: 5,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: generateDocumentId(),
        questionId: 'firearmNormal',
        text: "Would a person carrying a firearm be normal in this establishment?",
        reverseScored: true,
        firebaseKey: 'firearmNormal',
        isActive: true,
        order: 6,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    const upsertPromises = defaultQuestions.map(question => this.upsertSurveyQuestion(question));
    await Promise.all(upsertPromises);
  }
}

// Export singleton instance
export const scoringConfigService = ScoringConfigService.getInstance();
