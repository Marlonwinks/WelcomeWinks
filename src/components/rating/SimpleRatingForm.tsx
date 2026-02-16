import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle } from 'lucide-react';
import { HighlightedText } from '@/components/ui/highlighted-text';
import { ratingsService, SurveyResponses, SURVEY_QUESTIONS, DEFAULT_RESPONSE_VALUES } from '@/services/ratings.service';
import { simpleAuthService } from '@/services/simpleAuth.service';
import { reviewCookiesService } from '@/services/reviewCookies.service';
import ReviewRestrictionNotice from '@/components/business/ReviewRestrictionNotice';

interface SimpleRatingFormProps {
  businessId: string;
  businessName: string;
  onRatingSubmitted?: (rating: any) => void;
  onClose?: () => void;
}

// Use centralized survey questions configuration
const questions = SURVEY_QUESTIONS.map(q => ({
  key: q.firebaseKey,
  text: q.text,
  isReverse: q.reverseScored
}));

const responseOptions = [
  { value: DEFAULT_RESPONSE_VALUES.yes, label: 'Yes', color: 'bg-green-500' },
  { value: DEFAULT_RESPONSE_VALUES.probably, label: 'Probably', color: 'bg-green-300' },
  { value: DEFAULT_RESPONSE_VALUES.probablyNot, label: 'Probably Not', color: 'bg-red-300' },
  { value: DEFAULT_RESPONSE_VALUES.no, label: 'No', color: 'bg-red-500' }
];

export function SimpleRatingForm({ businessId, businessName, onRatingSubmitted, onClose }: SimpleRatingFormProps) {
  const [responses, setResponses] = useState<Partial<SurveyResponses>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasReviewed, setHasReviewed] = useState(reviewCookiesService.hasReviewedBusiness(businessId));

  const handleClearRestriction = () => {
    setHasReviewed(false);
    setError(null);
  };

  const handleResponseChange = (questionKey: keyof SurveyResponses, value: number, isReverse: boolean) => {
    // Apply reverse scoring if needed for new scoring system
    const actualValue = isReverse ? (DEFAULT_RESPONSE_VALUES.yes - value) : value;
    setResponses(prev => ({
      ...prev,
      [questionKey]: actualValue
    }));
  };

  const calculateScore = () => {
    return Object.values(responses).reduce((sum, score) => sum + (score || 0), 0);
  };

  const getWelcomingLevel = (score: number) => {
    // Using fixed thresholds based on current scoring system (6 questions * 0.833 max = 5.0 total)
    const maxScore = 5.0;
    const highThreshold = maxScore * 0.7; // 3.57
    const lowThreshold = maxScore * 0.3;  // 1.53
    
    if (score >= highThreshold) return 'Very Welcoming';
    if (score >= lowThreshold) return 'Moderately Welcoming';
    return 'Not Welcoming';
  };

  const isFormComplete = () => {
    return questions.every(q => responses[q.key] !== undefined);
  };

  const handleSubmit = async () => {
    if (!isFormComplete()) {
      setError('Please answer all questions');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Initialize authentication
      const account = await simpleAuthService.initialize();
      
      // Submit rating
      const rating = await ratingsService.submitRating(
        businessId,
        account.cookieId,
        'cookie',
        responses as SurveyResponses
      );

      setIsSubmitted(true);
      onRatingSubmitted?.(rating);
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose?.();
      }, 2000);
    } catch (error) {
      console.error('Failed to submit rating:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    const score = calculateScore();
    const level = getWelcomingLevel(score);
    
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">Rating Submitted!</h3>
          <p className="text-muted-foreground mb-4">Thank you for rating {businessName}</p>
          
          <div className="space-y-2">
            <div className="text-lg font-semibold">Winks Score: {score}</div>
            <Badge variant={score >= 4 ? 'default' : score >= -2 ? 'secondary' : 'destructive'}>
              {level}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Rate: {businessName}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Please answer the following questions based on your perception of this establishment
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasReviewed && (
          <ReviewRestrictionNotice
            businessId={businessId}
            businessName={businessName}
            onClearRestriction={handleClearRestriction}
            showDebugInfo={process.env.NODE_ENV === 'development'}
          />
        )}
        {!hasReviewed && questions.map((question, index) => (
          <div key={question.key} className="space-y-3">
            <h4 className="font-medium">
              <HighlightedText text={question.text} />
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {responseOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={responses[question.key] === (question.isReverse ? (DEFAULT_RESPONSE_VALUES.yes - option.value) : option.value) ? 'default' : 'outline'}
                  size="sm"
                  className="h-auto py-2 px-1 text-xs"
                  onClick={() => handleResponseChange(question.key, option.value, question.isReverse)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        ))}

        {!hasReviewed && isFormComplete() && (
          <div className="bg-muted p-4 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-semibold">Calculated Score: {calculateScore()}</div>
              <Badge variant={calculateScore() >= 4 ? 'default' : calculateScore() >= -2 ? 'secondary' : 'destructive'}>
                {getWelcomingLevel(calculateScore())}
              </Badge>
            </div>
          </div>
        )}

        {error && (
          <div className="text-red-500 text-sm text-center">{error}</div>
        )}

        {!hasReviewed && (
          <div className="flex gap-2 justify-end">
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button 
              onClick={handleSubmit} 
              disabled={!isFormComplete() || isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Submit Rating
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}