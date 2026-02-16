import React, { useState, useEffect } from 'react';
import { Cookie, Trash2, RefreshCw, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { reviewCookiesService } from '@/services/reviewCookies.service';

const ReviewCookiesManager: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState(reviewCookiesService.getDebugInfo());
  const [reviewedBusinesses, setReviewedBusinesses] = useState(reviewCookiesService.getReviewedBusinesses());

  const refreshData = () => {
    setDebugInfo(reviewCookiesService.getDebugInfo());
    setReviewedBusinesses(reviewCookiesService.getReviewedBusinesses());
  };

  const clearAllCookies = () => {
    const confirmed = window.confirm(
      'This will clear all review cookies for this device. Users will be able to review businesses again. Continue?'
    );

    if (confirmed) {
      reviewCookiesService.clearReviewedBusinesses();
      refreshData();
    }
  };

  const removeSpecificBusiness = (businessId: string) => {
    const success = reviewCookiesService.removeBusinessFromReviewed(businessId);
    if (success) {
      refreshData();
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Review Cookies Manager</h2>
          <p className="text-muted-foreground">Manage device-based review restrictions</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={refreshData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={clearAllCookies} variant="destructive" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Cookie Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{debugInfo.totalReviews}</div>
              <div className="text-sm text-muted-foreground">Total Reviews</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{debugInfo.recentReviews24h}</div>
              <div className="text-sm text-muted-foreground">Last 24 Hours</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{debugInfo.cookieSize}</div>
              <div className="text-sm text-muted-foreground">Cookie Size (bytes)</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">
                {debugInfo.cookieSize > 3500 ? (
                  <Badge variant="destructive">Large</Badge>
                ) : debugInfo.cookieSize > 2000 ? (
                  <Badge variant="default">Medium</Badge>
                ) : (
                  <Badge variant="secondary">Small</Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">Cookie Status</div>
            </div>
          </div>

          {debugInfo.oldestReview && debugInfo.newestReview && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <strong>Oldest Review:</strong> {debugInfo.oldestReview.toLocaleDateString()}
              </div>
              <div>
                <strong>Newest Review:</strong> {debugInfo.newestReview.toLocaleDateString()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <Cookie className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p>
              <strong>How Review Cookies Work:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Each device/browser can only review a business once</li>
              <li>Cookies are stored locally and persist for 1 year</li>
              <li>Prevents spam reviews from the same device</li>
              <li>Users can still review different businesses</li>
              <li>Cookies are automatically cleaned of old entries</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      {/* Reviewed Businesses List */}
      <Card>
        <CardHeader>
          <CardTitle>Reviewed Businesses ({reviewedBusinesses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {reviewedBusinesses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Cookie className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No businesses have been reviewed from this device</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {reviewedBusinesses
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((review, index) => (
                  <div key={`${review.businessId}-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">Business ID: {review.businessId}</div>
                      <div className="text-sm text-muted-foreground">
                        Reviewed: {formatDate(review.timestamp)}
                      </div>
                      {review.userId && (
                        <div className="text-xs text-muted-foreground">
                          User: {review.userId.substring(0, 8)}...
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeSpecificBusiness(review.businessId)}
                      className="text-xs"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warning for Large Cookies */}
      {debugInfo.cookieSize > 3500 && (
        <Alert variant="destructive">
          <AlertDescription>
            <strong>Warning:</strong> Cookie size is getting large ({debugInfo.cookieSize} bytes). 
            Consider clearing old entries or the system will automatically trim them.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ReviewCookiesManager;