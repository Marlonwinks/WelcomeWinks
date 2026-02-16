import React, { useState, useEffect } from 'react';
import { Search, Filter, Trash2, AlertTriangle, MapPin, Mail, Globe, Calendar, Star, User, Loader2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { adminReviewsService, ReviewWithUserInfo, ReviewFilter } from '@/services/adminReviews.service';

const ReviewManager: React.FC = () => {
  const [reviews, setReviews] = useState<ReviewWithUserInfo[]>([]);
  const [selectedReviews, setSelectedReviews] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter states
  const [filter, setFilter] = useState<ReviewFilter>({});
  const [filterIP, setFilterIP] = useState('');
  const [filterEmail, setFilterEmail] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterBusinessName, setFilterBusinessName] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Suspicious reviews
  const [suspiciousReviews, setSuspiciousReviews] = useState<{
    duplicateIPs: ReviewWithUserInfo[];
    rapidReviews: ReviewWithUserInfo[];
    extremeScores: ReviewWithUserInfo[];
  } | null>(null);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async (customFilter?: ReviewFilter) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const filterToUse = customFilter || filter;
      console.log('🔍 Loading reviews with filter:', filterToUse);
      
      const reviewsData = await adminReviewsService.getReviewsWithUserInfo(filterToUse, 200);
      setReviews(reviewsData);
      setSelectedReviews(new Set());
      
      console.log(`✅ Loaded ${reviewsData.length} reviews`);
    } catch (error) {
      console.error('❌ Failed to load reviews:', error);
      setError('Failed to load reviews. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSuspiciousReviews = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const suspicious = await adminReviewsService.getSuspiciousReviews();
      setSuspiciousReviews(suspicious);
      
      console.log('🚨 Loaded suspicious reviews:', {
        duplicateIPs: suspicious.duplicateIPs.length,
        rapidReviews: suspicious.rapidReviews.length,
        extremeScores: suspicious.extremeScores.length
      });
      
      if (suspicious.duplicateIPs.length === 0 && suspicious.rapidReviews.length === 0 && suspicious.extremeScores.length === 0) {
        setSuccessMessage('No suspicious activity patterns found. Your reviews look clean!');
      } else {
        setSuccessMessage(`Found suspicious patterns: ${suspicious.duplicateIPs.length} duplicate IP reviews, ${suspicious.rapidReviews.length} rapid reviews, ${suspicious.extremeScores.length} extreme scores.`);
      }
    } catch (error) {
      console.error('❌ Failed to load suspicious reviews:', error);
      setError('Failed to load suspicious reviews. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    const newFilter: ReviewFilter = {};
    
    if (filterIP.trim()) newFilter.ipAddress = filterIP.trim();
    if (filterEmail.trim()) newFilter.email = filterEmail.trim();
    if (filterLocation.trim()) newFilter.location = filterLocation.trim();
    if (filterBusinessName.trim()) newFilter.businessName = filterBusinessName.trim();
    if (filterDateFrom) newFilter.dateFrom = new Date(filterDateFrom);
    if (filterDateTo) newFilter.dateTo = new Date(filterDateTo);
    
    setFilter(newFilter);
    loadReviews(newFilter);
  };

  const clearFilters = () => {
    setFilter({});
    setFilterIP('');
    setFilterEmail('');
    setFilterLocation('');
    setFilterBusinessName('');
    setFilterDateFrom('');
    setFilterDateTo('');
    loadReviews({});
  };

  const toggleReviewSelection = (ratingId: string) => {
    const newSelected = new Set(selectedReviews);
    if (newSelected.has(ratingId)) {
      newSelected.delete(ratingId);
    } else {
      newSelected.add(ratingId);
    }
    setSelectedReviews(newSelected);
  };

  const selectAllReviews = () => {
    if (selectedReviews.size === reviews.length) {
      setSelectedReviews(new Set());
    } else {
      setSelectedReviews(new Set(reviews.map(r => r.rating.ratingId)));
    }
  };

  const deleteSelectedReviews = async () => {
    if (selectedReviews.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedReviews.size} selected reviews? This action cannot be undone.\n\nWARNING: Businesses with no remaining reviews will be completely removed from the database.`
    );

    if (!confirmed) return;

    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);

      const ratingIds = Array.from(selectedReviews);
      const result = await adminReviewsService.bulkDeleteReviews(ratingIds);

      if (result.success) {
        setSuccessMessage(`Successfully deleted ${result.deletedCount} reviews. Business scores have been updated. Businesses with no remaining reviews have been completely removed from the database.`);
      } else {
        setSuccessMessage(`Deleted ${result.deletedCount} reviews. ${result.failedCount} failed. Business scores have been updated. Businesses with no remaining reviews have been completely removed from the database.`);
        if (result.errors.length > 0) {
          console.error('Delete errors:', result.errors);
        }
      }

      // Reload reviews
      await loadReviews();
    } catch (error) {
      console.error('❌ Failed to delete reviews:', error);
      setError('Failed to delete reviews. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAggregations = async () => {
    const confirmed = window.confirm(
      'This will recalculate all business scores and ratings. This may take a few minutes. Continue?'
    );

    if (!confirmed) return;

    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);

      console.log('🔄 Starting aggregation refresh...');
      const result = await adminReviewsService.refreshAllBusinessAggregations();

      if (result.failed === 0) {
        setSuccessMessage(`Successfully refreshed scores for ${result.updated} businesses.`);
      } else {
        setSuccessMessage(`Refreshed ${result.updated} businesses. ${result.failed} failed.`);
        if (result.errors.length > 0) {
          console.error('Refresh errors:', result.errors);
        }
      }
    } catch (error) {
      console.error('❌ Failed to refresh aggregations:', error);
      setError('Failed to refresh business scores. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-yellow-600';
    if (score >= 2) return 'text-orange-600';
    return 'text-red-600';
  };

  const getAccountTypeIcon = (review: ReviewWithUserInfo) => {
    if (review.userProfile?.accountType === 'full') {
      return (
        <div title="Full Account">
          <User className="h-4 w-4 text-blue-500" />
        </div>
      );
    } else if (review.cookieAccount) {
      return (
        <div title="Cookie Account">
          <Globe className="h-4 w-4 text-orange-500" />
        </div>
      );
    } else {
      return (
        <div title="Anonymous">
          <AlertTriangle className="h-4 w-4 text-gray-500" />
        </div>
      );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold">Review Management</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Filter and manage user reviews</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={loadSuspiciousReviews}
              disabled={isLoading}
              className="flex items-center gap-2 flex-1 sm:flex-none"
              size="sm"
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Find </span>Suspicious
            </Button>
            <Button
              variant="outline"
              onClick={refreshAggregations}
              disabled={isLoading}
              className="flex items-center gap-2 flex-1 sm:flex-none"
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <TrendingUp className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Refresh </span>Scores
            </Button>
          </div>
          <Button
            variant="destructive"
            onClick={deleteSelectedReviews}
            disabled={selectedReviews.size === 0 || isLoading}
            className="flex items-center gap-2"
            size="sm"
          >
            <Trash2 className="h-4 w-4" />
            Delete ({selectedReviews.size})
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="reviews" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="reviews" className="text-sm">All Reviews</TabsTrigger>
          <TabsTrigger value="suspicious" className="text-sm">Suspicious Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="filterIP">IP Address</Label>
                  <Input
                    id="filterIP"
                    placeholder="e.g., 192.168.1.1"
                    value={filterIP}
                    onChange={(e) => setFilterIP(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filterEmail">Email</Label>
                  <Input
                    id="filterEmail"
                    placeholder="user@example.com"
                    value={filterEmail}
                    onChange={(e) => setFilterEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filterLocation">Location</Label>
                  <Input
                    id="filterLocation"
                    placeholder="City, State"
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filterBusinessName">Business Name</Label>
                  <Input
                    id="filterBusinessName"
                    placeholder="e.g., Starbucks"
                    value={filterBusinessName}
                    onChange={(e) => setFilterBusinessName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filterDateFrom">Date From</Label>
                  <Input
                    id="filterDateFrom"
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filterDateTo">Date To</Label>
                  <Input
                    id="filterDateTo"
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <Button onClick={applyFilters} disabled={isLoading} className="flex-1 sm:flex-none">
                  <Search className="h-4 w-4 mr-2" />
                  Apply Filters
                </Button>
                <Button variant="outline" onClick={clearFilters} className="flex-1 sm:flex-none">
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Reviews List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Reviews ({reviews.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedReviews.size === reviews.length && reviews.length > 0}
                    onCheckedChange={selectAllReviews}
                  />
                  <Label>Select All</Label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading reviews...</span>
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No reviews found</p>
                  <p className="text-sm">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div
                      key={review.rating.ratingId}
                      className={`p-4 border rounded-lg ${
                        selectedReviews.has(review.rating.ratingId) ? 'bg-primary/5 border-primary' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedReviews.has(review.rating.ratingId)}
                          onCheckedChange={() => toggleReviewSelection(review.rating.ratingId)}
                        />
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getAccountTypeIcon(review)}
                              <span className="font-medium">
                                {review.businessName || 'Unknown Business'}
                              </span>
                              <Badge variant="outline" className={getScoreColor(review.rating.totalScore)}>
                                <Star className="h-3 w-3 mr-1" />
                                {review.rating.totalScore.toFixed(1)}
                              </Badge>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(review.rating.createdAt)}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              IP: {review.rating.userIpAddress || 'Unknown'}
                            </div>
                            {review.userEmail && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {review.userEmail}
                              </div>
                            )}
                            {(review.userLocation || review.ipGeolocation) && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {review.userLocation || 
                                 `${review.ipGeolocation?.city || ''}, ${review.ipGeolocation?.region || ''}`}
                              </div>
                            )}
                          </div>

                          <div className="text-xs text-muted-foreground">
                            User ID: {review.rating.userId} | 
                            Account: {review.userProfile?.accountType || review.cookieAccount?.accountType || 'anonymous'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suspicious" className="space-y-4">
          {suspiciousReviews ? (
            <div className="space-y-4">
              {/* Summary Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Suspicious Activity Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{suspiciousReviews.duplicateIPs.length}</div>
                      <div className="text-sm text-muted-foreground">Duplicate IP Reviews</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{suspiciousReviews.rapidReviews.length}</div>
                      <div className="text-sm text-muted-foreground">Rapid Reviews</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{suspiciousReviews.extremeScores.length}</div>
                      <div className="text-sm text-muted-foreground">Extreme Scores</div>
                    </div>
                  </div>
                  {(suspiciousReviews.duplicateIPs.length > 0 || suspiciousReviews.rapidReviews.length > 0 || suspiciousReviews.extremeScores.length > 0) && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const allSuspicious = [
                            ...suspiciousReviews.duplicateIPs,
                            ...suspiciousReviews.rapidReviews,
                            ...suspiciousReviews.extremeScores
                          ];
                          const uniqueIds = [...new Set(allSuspicious.map(r => r.rating.ratingId))];
                          setSelectedReviews(new Set(uniqueIds));
                          setReviews(allSuspicious);
                        }}
                        className="flex items-center gap-2"
                      >
                        <Checkbox className="h-4 w-4" />
                        Select All Suspicious
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Duplicate IP Addresses ({suspiciousReviews.duplicateIPs.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Reviews from IP addresses with more than 3 reviews
                  </p>
                  {suspiciousReviews.duplicateIPs.length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground">No suspicious IP activity found</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {suspiciousReviews.duplicateIPs.slice(0, 20).map((review) => (
                        <div key={review.rating.ratingId} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedReviews.has(review.rating.ratingId)}
                              onCheckedChange={() => toggleReviewSelection(review.rating.ratingId)}
                            />
                            <div>
                              <div className="font-medium">{review.businessName || 'Unknown Business'}</div>
                              <div className="text-sm text-muted-foreground">
                                IP: {review.rating.userIpAddress} | Score: {review.rating.totalScore.toFixed(1)} | {formatDate(review.rating.createdAt)}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className={getScoreColor(review.rating.totalScore)}>
                            {review.rating.totalScore.toFixed(1)}
                          </Badge>
                        </div>
                      ))}
                      {suspiciousReviews.duplicateIPs.length > 20 && (
                        <p className="text-center text-sm text-muted-foreground">
                          Showing 20 of {suspiciousReviews.duplicateIPs.length} reviews
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Rapid Reviews ({suspiciousReviews.rapidReviews.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Users with 5+ reviews in 24 hours or 15+ reviews in 7 days
                  </p>
                  {suspiciousReviews.rapidReviews.length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground">No rapid review activity found</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {suspiciousReviews.rapidReviews.slice(0, 20).map((review) => (
                        <div key={review.rating.ratingId} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedReviews.has(review.rating.ratingId)}
                              onCheckedChange={() => toggleReviewSelection(review.rating.ratingId)}
                            />
                            <div>
                              <div className="font-medium">{review.businessName || 'Unknown Business'}</div>
                              <div className="text-sm text-muted-foreground">
                                User: {review.rating.userId.substring(0, 8)}... | Score: {review.rating.totalScore.toFixed(1)} | {formatDate(review.rating.createdAt)}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className={getScoreColor(review.rating.totalScore)}>
                            {review.rating.totalScore.toFixed(1)}
                          </Badge>
                        </div>
                      ))}
                      {suspiciousReviews.rapidReviews.length > 20 && (
                        <p className="text-center text-sm text-muted-foreground">
                          Showing 20 of {suspiciousReviews.rapidReviews.length} reviews
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    Extreme Scores ({suspiciousReviews.extremeScores.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Reviews with very low (≤1.0) or very high (≥4.0) scores
                  </p>
                  {suspiciousReviews.extremeScores.length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground">No extreme score patterns found</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {suspiciousReviews.extremeScores.slice(0, 20).map((review) => (
                        <div key={review.rating.ratingId} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedReviews.has(review.rating.ratingId)}
                              onCheckedChange={() => toggleReviewSelection(review.rating.ratingId)}
                            />
                            <div>
                              <div className="font-medium">{review.businessName || 'Unknown Business'}</div>
                              <div className="text-sm text-muted-foreground">
                                IP: {review.rating.userIpAddress} | {formatDate(review.rating.createdAt)}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className={getScoreColor(review.rating.totalScore)}>
                            {review.rating.totalScore.toFixed(1)}
                          </Badge>
                        </div>
                      ))}
                      {suspiciousReviews.extremeScores.length > 20 && (
                        <p className="text-center text-sm text-muted-foreground">
                          Showing 20 of {suspiciousReviews.extremeScores.length} reviews
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-muted-foreground">Click "Find Suspicious" to analyze review patterns</p>
                <p className="text-xs text-muted-foreground mt-2">
                  This will analyze all reviews for suspicious patterns like duplicate IPs, rapid reviewing, and extreme scores
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReviewManager;