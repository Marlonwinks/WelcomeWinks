import React from 'react';
import { AlertTriangle, Cookie, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { reviewCookiesService } from '@/services/reviewCookies.service';

interface ReviewRestrictionNoticeProps {
  businessId: string;
  businessName: string;
  onClearRestriction?: () => void;
  showDebugInfo?: boolean;
}

const ReviewRestrictionNotice: React.FC<ReviewRestrictionNoticeProps> = ({
  businessId,
  businessName,
  onClearRestriction,
  showDebugInfo = false
}) => {
  const hasReviewed = reviewCookiesService.hasReviewedBusiness(businessId);
  const debugInfo = showDebugInfo ? reviewCookiesService.getDebugInfo() : null;

  const handleClearRestriction = () => {
    const success = reviewCookiesService.removeBusinessFromReviewed(businessId);
    if (success && onClearRestriction) {
      onClearRestriction();
    }
  };

  if (!hasReviewed) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Cookie className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p>
              <strong>You've already reviewed this business</strong> from this device/browser.
            </p>
            <p className="text-sm text-muted-foreground">
              To prevent spam, each device can only review a business once. This helps maintain review quality and prevents fake reviews.
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {showDebugInfo && debugInfo && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1 text-xs">
              <p><strong>Debug Info:</strong></p>
              <p>Total reviews from this device: {debugInfo.totalReviews}</p>
              <p>Reviews in last 24h: {debugInfo.recentReviews24h}</p>
              <p>Cookie size: {debugInfo.cookieSize} bytes</p>
              {debugInfo.oldestReview && (
                <p>Oldest review: {debugInfo.oldestReview.toLocaleDateString()}</p>
              )}
              {debugInfo.newestReview && (
                <p>Newest review: {debugInfo.newestReview.toLocaleDateString()}</p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {onClearRestriction && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearRestriction}
            className="text-xs"
          >
            Clear Restriction (Testing)
          </Button>
        </div>
      )}
    </div>
  );
};

export default ReviewRestrictionNotice;