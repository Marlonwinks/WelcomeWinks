import React, { useState, useEffect } from 'react';
import { Flag, AlertTriangle, CheckCircle, XCircle, Clock, Eye, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { reportsService, BusinessReport } from '@/services/reports.service';
import { adminReviewsService } from '@/services/adminReviews.service';

const ReportsManager: React.FC = () => {
  const [reports, setReports] = useState<BusinessReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<BusinessReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  // Report review state
  const [selectedReport, setSelectedReport] = useState<BusinessReport | null>(null);
  const [reviewStatus, setReviewStatus] = useState<BusinessReport['status']>('pending');
  const [adminNotes, setAdminNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionTaken, setActionTaken] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, statusFilter, severityFilter]);

  const loadReports = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const allReports = await reportsService.getAllReports(200);
      setReports(allReports);
      
      console.log(`📊 Loaded ${allReports.length} reports`);
    } catch (error) {
      console.error('❌ Failed to load reports:', error);
      setError('Failed to load reports. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = reports;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter(report => report.severity === severityFilter);
    }

    setFilteredReports(filtered);
  };

  const handleReviewReport = (report: BusinessReport) => {
    setSelectedReport(report);
    setReviewStatus(report.status);
    setAdminNotes(report.adminNotes || '');
    setError(null); // Clear any previous errors
    setIsDialogOpen(true);
  };

  const handleQuickResolve = async (report: BusinessReport) => {
    const confirmed = window.confirm(
      `This will automatically remove suspicious reviews from "${report.businessName}" and mark the report as resolved. Continue?`
    );

    if (!confirmed) return;

    try {
      setIsLoading(true);
      
      // Take action and update report
      const actionResult = await takeReportAction(report);
      const notes = actionResult || 'Quick action completed.';
      
      await reportsService.updateReportStatus(
        report.reportId,
        'resolved',
        'admin',
        notes
      );

      // Update local state
      setReports(reports.map(r => 
        r.reportId === report.reportId
          ? { ...r, status: 'resolved', adminNotes: notes }
          : r
      ));

      console.log(`✅ Quick resolved report ${report.reportId}`);
    } catch (error) {
      console.error('❌ Failed to quick resolve report:', error);
      setError('Failed to resolve report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateReport = async () => {
    if (!selectedReport) return;

    try {
      setIsUpdating(true);
      
      // Take action based on report type and status
      let actionNotes = adminNotes.trim();
      
      if (reviewStatus === 'resolved') {
        const actionResult = await takeReportAction(selectedReport);
        if (actionResult) {
          actionNotes = actionResult + (actionNotes ? `\n\nAdmin Notes: ${actionNotes}` : '');
        }
      }
      
      await reportsService.updateReportStatus(
        selectedReport.reportId,
        reviewStatus,
        'admin', // In a real app, this would be the actual admin user ID
        actionNotes || undefined
      );

      // Update local state
      setReports(reports.map(report => 
        report.reportId === selectedReport.reportId
          ? { ...report, status: reviewStatus, adminNotes: actionNotes || undefined }
          : report
      ));

      // Close dialog and reset state
      setIsDialogOpen(false);
      setSelectedReport(null);
      setAdminNotes('');
      setActionTaken('');
      
      console.log(`✅ Updated report ${selectedReport.reportId} status to ${reviewStatus}`);
    } catch (error) {
      console.error('❌ Failed to update report:', error);
      setError('Failed to update report. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const takeReportAction = async (report: BusinessReport): Promise<string | null> => {
    try {
      console.log(`🔧 Taking action for report: ${report.reason} on business: ${report.businessName}`);
      
      // Find and remove suspicious reviews for this business
      const suspicious = await adminReviewsService.getSuspiciousReviews();
      console.log(`🔍 Found suspicious patterns:`, {
        duplicateIPs: suspicious.duplicateIPs.length,
        rapidReviews: suspicious.rapidReviews.length,
        extremeScores: suspicious.extremeScores.length
      });
      
      const businessReviews = [
        ...suspicious.duplicateIPs,
        ...suspicious.rapidReviews,
        ...suspicious.extremeScores
      ].filter(review => review.rating.businessId === report.businessId);
      
      console.log(`🎯 Found ${businessReviews.length} suspicious reviews for business ${report.businessId}`);
      
      if (businessReviews.length > 0) {
        const reviewIds = businessReviews.map(r => r.rating.ratingId);
        console.log(`🗑️ Removing ${reviewIds.length} suspicious reviews:`, reviewIds);
        
        const result = await adminReviewsService.bulkDeleteReviews(reviewIds);
        console.log(`✅ Bulk delete result:`, result);
        
        return `Action Taken: Removed ${result.deletedCount} suspicious reviews from this business. ${result.failedCount > 0 ? `${result.failedCount} deletions failed.` : ''}`;
      } else {
        return `Action Taken: No suspicious reviews found for this business. Manually reviewed and found legitimate.`;
      }
    } catch (error) {
      console.error('❌ Failed to take report action:', error);
      return `Action Attempted: Failed to complete automated action (${error.message}). Manual review required.`;
    }
  };

  const getStatusIcon = (status: BusinessReport['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'under_review':
        return <Eye className="h-4 w-4 text-blue-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'dismissed':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityBadgeVariant = (severity: BusinessReport['severity']) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
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

  const getStatusCounts = () => {
    return {
      pending: reports.filter(r => r.status === 'pending').length,
      under_review: reports.filter(r => r.status === 'under_review').length,
      resolved: reports.filter(r => r.status === 'resolved').length,
      dismissed: reports.filter(r => r.status === 'dismissed').length
    };
  };

  const statusCounts = getStatusCounts();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading reports...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reports Management</h2>
          <p className="text-muted-foreground">Review and manage business reports from users</p>
        </div>
        <Button onClick={loadReports} disabled={isLoading}>
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">{statusCounts.pending}</div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{statusCounts.under_review}</div>
                <div className="text-sm text-muted-foreground">Under Review</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{statusCounts.resolved}</div>
                <div className="text-sm text-muted-foreground">Resolved</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-gray-500" />
              <div>
                <div className="text-2xl font-bold">{statusCounts.dismissed}</div>
                <div className="text-sm text-muted-foreground">Dismissed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>Reports ({filteredReports.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Flag className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No reports found</p>
              <p className="text-sm">Reports will appear here when users submit them</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReports.map((report) => (
                <div key={report.reportId} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(report.status)}
                        <span className="font-medium">{report.businessName}</span>
                        <Badge variant={getSeverityBadgeVariant(report.severity) as any}>
                          {report.severity}
                        </Badge>
                        <Badge variant="outline">
                          {reportsService.getReasonDisplayText(report.reason)}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {report.description}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Reported by: {report.reporterEmail || `User (${report.reporterAccountType})`}</span>
                        <span>Date: {formatDate(report.createdAt)}</span>
                        <span>IP: {report.reporterIpAddress}</span>
                      </div>
                      
                      {report.adminNotes && (
                        <div className="mt-2 p-2 bg-muted rounded text-sm">
                          <strong>Admin Notes:</strong> {report.adminNotes}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {report.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleQuickResolve(report)}
                          className="text-xs"
                        >
                          Remove Reviews
                        </Button>
                      )}
                      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReviewReport(report)}
                          >
                            Review
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Review Report</DialogTitle>
                          </DialogHeader>
                          
                          {selectedReport && (
                            <div className="space-y-4">
                              <div>
                                <Label>Business</Label>
                                <p className="font-medium">{selectedReport.businessName}</p>
                              </div>
                              
                              <div>
                                <Label>Reason</Label>
                                <p>{reportsService.getReasonDisplayText(selectedReport.reason)}</p>
                              </div>
                              
                              <div>
                                <Label>Description</Label>
                                <p className="text-sm">{selectedReport.description}</p>
                              </div>
                              
                              {/* Suggested Actions */}
                              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <h4 className="font-medium text-yellow-800 mb-2">Automated Action Available</h4>
                                <p className="text-sm text-yellow-700 mb-2">
                                  This report can be automatically resolved by scanning and removing suspicious reviews from the business.
                                </p>
                                <p className="text-xs text-yellow-600">
                                  Setting status to "Resolved" will automatically find and remove fake/spam reviews.
                                </p>
                              </div>

                              <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={reviewStatus} onValueChange={(value) => setReviewStatus(value as BusinessReport['status'])}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="under_review">Under Review</SelectItem>
                                    <SelectItem value="resolved">Resolved</SelectItem>
                                    <SelectItem value="dismissed">Dismissed</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Admin Notes</Label>
                                <Textarea
                                  value={adminNotes}
                                  onChange={(e) => setAdminNotes(e.target.value)}
                                  placeholder="Add notes about your decision..."
                                  rows={3}
                                />
                              </div>
                              
                              <div className="flex gap-2">
                                <Button
                                  onClick={handleUpdateReport}
                                  disabled={isUpdating}
                                  className="flex-1"
                                >
                                  {isUpdating ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                      Updating...
                                    </>
                                  ) : (
                                    'Update Report'
                                  )}
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsManager;