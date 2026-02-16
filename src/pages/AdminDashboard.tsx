import React, { useState, useEffect } from 'react';
import { BarChart, TrendingUp, Users, MapPin, Download, FileText, AlertTriangle, LogOut, Shield, Loader2 } from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthProvider';
import { adminDataService, AdminDashboardData } from '@/services/adminData.service';
import { adminExportService, ExportOptions } from '@/services/adminExport.service';
import ReviewManager from '@/components/admin/ReviewManager';
import ReportsManager from '@/components/admin/ReportsManager';
import ReviewCookiesManager from '@/components/admin/ReviewCookiesManager';
import DatabaseSeeder from '@/components/admin/DatabaseSeeder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AdminDashboard: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState('7d');
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { logout } = useAdminAuth();

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, [timeFilter]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🔄 Fetching admin dashboard data for timeFilter:', timeFilter);

      const data = await adminDataService.getDashboardData(timeFilter);
      setDashboardData(data);
      console.log('✅ Dashboard data loaded successfully:', {
        businesses: data.kpis.totalBusinesses,
        reviews: data.kpis.totalReviews,
        activeUsers: data.kpis.dailyActiveUsers,
        trending: data.kpis.trendingCategory
      });
    } catch (error) {
      console.error('❌ Failed to load dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !dashboardData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="text-center space-y-4 pt-6">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Error Loading Dashboard</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={fetchDashboardData} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { kpis, topBusinesses, pendingReports, recentBusinesses, scoreDistribution, topCities, peakActivityHours, userEngagement, topCategories } = dashboardData;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getExportOptions = (): ExportOptions => {
    const businessesChecked = (document.getElementById('exportBusinesses') as HTMLInputElement)?.checked || false;
    const reviewsChecked = (document.getElementById('exportReviews') as HTMLInputElement)?.checked || false;
    const reportsChecked = (document.getElementById('exportReports') as HTMLInputElement)?.checked || false;

    const dateFromInput = (document.getElementById('exportDateFrom') as HTMLInputElement)?.value;
    const dateToInput = (document.getElementById('exportDateTo') as HTMLInputElement)?.value;

    return {
      includeBusinesses: businessesChecked,
      includeReviews: reviewsChecked,
      includeReports: reportsChecked,
      dateFrom: dateFromInput ? new Date(dateFromInput) : undefined,
      dateTo: dateToInput ? new Date(dateToInput) : undefined,
      format: 'csv'
    };
  };

  const handleExportCSV = async () => {
    try {
      setIsLoading(true);
      const options = { ...getExportOptions(), format: 'csv' as const };

      if (!options.includeBusinesses && !options.includeReviews && !options.includeReports) {
        alert('Please select at least one data type to export.');
        return;
      }

      console.log('📊 Starting CSV export with options:', options);
      const csvContent = await adminExportService.exportData(options);

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `welcome-winks-data-${timestamp}.csv`;

      adminExportService.downloadFile(csvContent, filename, 'text/csv');
      console.log('✅ CSV export completed:', filename);
    } catch (error) {
      console.error('❌ CSV export failed:', error);
      alert('Failed to export CSV. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportJSON = async () => {
    try {
      setIsLoading(true);
      const options = { ...getExportOptions(), format: 'json' as const };

      if (!options.includeBusinesses && !options.includeReviews && !options.includeReports) {
        alert('Please select at least one data type to export.');
        return;
      }

      console.log('📊 Starting JSON export with options:', options);
      const jsonContent = await adminExportService.exportData(options);

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `welcome-winks-data-${timestamp}.json`;

      adminExportService.downloadFile(jsonContent, filename, 'application/json');
      console.log('✅ JSON export completed:', filename);
    } catch (error) {
      console.error('❌ JSON export failed:', error);
      alert('Failed to export JSON. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePDFReport = async () => {
    try {
      setIsLoading(true);
      console.log('📄 Generating PDF report...');
      const reportContent = await adminExportService.generatePDFReport();

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `welcome-winks-report-${timestamp}.txt`;

      adminExportService.downloadFile(reportContent, filename, 'text/plain');
      console.log('✅ PDF report generated:', filename);
    } catch (error) {
      console.error('❌ PDF report generation failed:', error);
      alert('Failed to generate PDF report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gradient truncate">Admin Dashboard</h1>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground">Welcome Winks analytics and moderation</p>
          </div>

          {/* Mobile-friendly controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDashboardData}
                disabled={isLoading}
                className="flex items-center gap-2 flex-1 sm:flex-none"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <TrendingUp className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Refresh</span>
              </Button>

              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-24 sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24h</SelectItem>
                  <SelectItem value="7d">7d</SelectItem>
                  <SelectItem value="30d">30d</SelectItem>
                  <SelectItem value="90d">90d</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="flex items-center gap-2 text-destructive hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span className="sm:inline">Logout</span>
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Businesses</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-xl sm:text-2xl font-bold">{kpis.totalBusinesses.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Reviews</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2">
                <BarChart className="h-4 w-4 text-accent flex-shrink-0" />
                <span className="text-xl sm:text-2xl font-bold">{kpis.totalReviews.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Active Users ({timeFilter === '24h' ? '24h' : timeFilter === '7d' ? '7d' : timeFilter === '30d' ? '30d' : '90d'})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-success flex-shrink-0" />
                <span className="text-xl sm:text-2xl font-bold">{kpis.dailyActiveUsers.toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                All user types
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Trending Category</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-warning flex-shrink-0" />
                <span className="text-lg sm:text-2xl font-bold truncate">{kpis.trendingCategory}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Top Businesses */}
          <Card>
            <CardHeader>
              <CardTitle>Most Marked Businesses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topBusinesses.length > 0 ? (
                  topBusinesses.map((business, index) => (
                    <div key={business.businessId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{business.name}</p>
                          <p className="text-sm text-muted-foreground">{business.marks} marks</p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {business.score > 0 ? business.score.toFixed(1) : 'N/A'}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No businesses found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Score Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Score Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scoreDistribution.length > 0 ? (
                  scoreDistribution.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{item.range} stars</span>
                        <span>{item.count} places ({item.percentage}%)</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No rating data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Top Cities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Top Cities by Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topCities.length > 0 ? (
                  topCities.slice(0, 8).map((city, index) => (
                    <div key={`${city.city}-${city.state}`} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{city.city}, {city.state}</p>
                          <p className="text-sm text-muted-foreground">
                            {city.ratingsCount} ratings • {city.businessesCount} businesses
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {city.averageScore > 0 ? city.averageScore.toFixed(1) : 'N/A'}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No city data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* User Engagement */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Engagement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userEngagement.length > 0 ? (
                  userEngagement.map((engagement, index) => (
                    <div key={engagement.accountType} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{engagement.accountType}</span>
                        <span className="text-sm text-muted-foreground">
                          {engagement.userCount} users ({engagement.percentage}%)
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Avg. ratings per user: {engagement.averageRatingsPerUser}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${engagement.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No engagement data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* More Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Peak Activity Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Peak Activity Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {peakActivityHours.length > 0 ? (
                  peakActivityHours.slice(0, 8).map((activity, index) => (
                    <div key={activity.hour} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-orange-600">{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{activity.label}</p>
                          <p className="text-sm text-muted-foreground">{activity.ratingsCount} ratings</p>
                        </div>
                      </div>
                      <div className="w-16 bg-muted rounded-full h-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, (activity.ratingsCount / Math.max(...peakActivityHours.map(a => a.ratingsCount))) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No activity data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                Popular Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topCategories.length > 0 ? (
                  topCategories.map((category, index) => (
                    <div key={category.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-purple-600">{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{category.category}</p>
                          <p className="text-sm text-muted-foreground">
                            {category.businessCount} businesses • {category.ratingsCount} ratings
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {category.averageScore > 0 ? category.averageScore.toFixed(1) : 'N/A'}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No category data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tables and Reports */}
        <Tabs defaultValue="reports" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto">
            <TabsTrigger value="reports" className="text-xs sm:text-sm px-2 py-2">
              <span className="hidden sm:inline">Pending </span>Reports
            </TabsTrigger>
            <TabsTrigger value="businesses" className="text-xs sm:text-sm px-2 py-2">
              <span className="hidden sm:inline">Recent </span>Businesses
            </TabsTrigger>
            <TabsTrigger value="reviews" className="text-xs sm:text-sm px-2 py-2">
              <span className="hidden sm:inline">Review </span>Management
            </TabsTrigger>
            <TabsTrigger value="reportsManager" className="text-xs sm:text-sm px-2 py-2">
              <span className="hidden sm:inline">Reports </span>Manager
            </TabsTrigger>
            <TabsTrigger value="cookies" className="text-xs sm:text-sm px-2 py-2">
              <span className="hidden sm:inline">Review </span>Cookies
            </TabsTrigger>
            <TabsTrigger value="database" className="text-xs sm:text-sm px-2 py-2">
              <span className="hidden sm:inline">Database </span>Tools
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Pending Moderation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingReports.length > 0 ? (
                    pendingReports.map((report) => (
                      <div key={report.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">{report.business}</h4>
                            <Badge variant={getSeverityColor(report.severity) as any} className="self-start sm:self-auto">
                              {report.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{report.reason}</p>
                          <p className="text-xs text-muted-foreground mt-1">{report.date}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button size="sm" variant="outline" className="flex-1 sm:flex-none">Review</Button>
                          <Button size="sm" className="flex-1 sm:flex-none">Resolve</Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No pending reports</p>
                      <p className="text-xs mt-1">All reports have been resolved</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="businesses">
            <Card>
              <CardHeader>
                <CardTitle>Recently Added Businesses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentBusinesses.length > 0 ? (
                    recentBusinesses.map((business) => (
                      <div key={business.businessId} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{business.name}</h4>
                          <p className="text-sm text-muted-foreground">Added {business.added}</p>
                          <p className="text-xs text-muted-foreground truncate mt-1">{business.address}</p>
                        </div>
                        <div className="flex items-center justify-between sm:flex-col sm:text-right flex-shrink-0">
                          <p className="text-sm font-medium">{business.marks} marks</p>
                          <Button size="sm" variant="outline" className="sm:mt-1">View</Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No recent businesses</p>
                      <p className="text-xs mt-1">New businesses will appear here</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews">
            <ReviewManager />
          </TabsContent>

          <TabsContent value="reportsManager">
            <ReportsManager />
          </TabsContent>

          <TabsContent value="cookies">
            <ReviewCookiesManager />
          </TabsContent>

          <TabsContent value="database">
            <DatabaseSeeder />
          </TabsContent>

        </Tabs>

        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Export Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium">Export Options</label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="exportBusinesses" defaultChecked className="rounded" />
                      <label htmlFor="exportBusinesses" className="text-sm">Businesses</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="exportReviews" defaultChecked className="rounded" />
                      <label htmlFor="exportReviews" className="text-sm">Reviews</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="exportReports" defaultChecked className="rounded" />
                      <label htmlFor="exportReports" className="text-sm">Reports</label>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-medium">Date Range (Optional)</label>
                  <div className="space-y-3">
                    <input
                      type="date"
                      id="exportDateFrom"
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      placeholder="From date"
                    />
                    <input
                      type="date"
                      id="exportDateTo"
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      placeholder="To date"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button
                  variant="outline"
                  className="flex items-center justify-center gap-2 flex-1 sm:flex-none"
                  onClick={handleExportCSV}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span className="text-sm">Export CSV</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center justify-center gap-2 flex-1 sm:flex-none"
                  onClick={handleExportJSON}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span className="text-sm">Export JSON</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center justify-center gap-2 flex-1 sm:flex-none"
                  onClick={handleGeneratePDFReport}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  <span className="text-sm">PDF Report</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;