import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useSecurity, useSecurityMonitoring } from '../../hooks/useSecurity';
import { Shield, AlertTriangle, Activity, Users, TrendingUp, Clock } from 'lucide-react';

/**
 * Security dashboard for monitoring system security and abuse prevention
 */
export function SecurityDashboard() {
  const {
    securityStats,
    isLoading,
    error,
    getSecurityStatistics,
    getErrorStatistics,
    isAdmin
  } = useSecurity();

  const {
    alerts,
    dismissAlert,
    clearAllAlerts,
    hasAlerts,
    criticalAlerts,
    warningAlerts
  } = useSecurityMonitoring();

  const [errorStats, setErrorStats] = useState<any>(null);

  useEffect(() => {
    if (isAdmin) {
      getSecurityStatistics();
      setErrorStats(getErrorStatistics());
    }
  }, [isAdmin, getSecurityStatistics, getErrorStatistics]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Access Denied</h3>
          <p className="text-muted-foreground">You don't have permission to view this dashboard.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading security dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Security Dashboard</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Security Dashboard</h1>
          <p className="text-muted-foreground">Monitor system security and abuse prevention</p>
        </div>
        <Button onClick={getSecurityStatistics} variant="outline">
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Security Alerts */}
      {hasAlerts && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Security Alerts
              </CardTitle>
              <CardDescription>
                {criticalAlerts} critical, {warningAlerts} warnings
              </CardDescription>
            </div>
            <Button onClick={clearAllAlerts} variant="outline" size="sm">
              Clear All
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <Alert key={alert.id} variant={alert.type === 'error' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{alert.title}</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  <span>{alert.message}</span>
                  <Button
                    onClick={() => dismissAlert(alert.id)}
                    variant="ghost"
                    size="sm"
                  >
                    Dismiss
                  </Button>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge variant={securityStats?.isHealthy ? 'default' : 'destructive'}>
                {securityStats?.isHealthy ? 'Healthy' : 'Issues Detected'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspicious Flags</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityStats?.activeSuspiciousFlags || 0}</div>
            <p className="text-xs text-muted-foreground">Active flags</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ratings (24h)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityStats?.ratingSubmissions24h || 0}</div>
            <p className="text-xs text-muted-foreground">
              {securityStats?.ratingSubmissions7d || 0} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Accounts (24h)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityStats?.accountCreations24h || 0}</div>
            <p className="text-xs text-muted-foreground">
              {securityStats?.accountCreations7d || 0} this week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Statistics */}
      <Tabs defaultValue="security" className="space-y-4">
        <TabsList>
          <TabsTrigger value="security">Security Stats</TabsTrigger>
          <TabsTrigger value="errors">Error Monitoring</TabsTrigger>
          <TabsTrigger value="patterns">Activity Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Activity Summary</CardTitle>
                <CardDescription>Recent system activity overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Average ratings per user</span>
                  <Badge variant="outline">
                    {securityStats?.averageRatingsPerUser?.toFixed(1) || '0.0'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Suspicious activity rate</span>
                  <Badge variant={
                    (securityStats?.suspiciousActivityRate || 0) > 0.1 ? 'destructive' : 'default'
                  }>
                    {((securityStats?.suspiciousActivityRate || 0) * 100).toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Rate limited actions (24h)</span>
                  <Badge variant="outline">
                    {securityStats?.rateLimitedActions24h || 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Metrics</CardTitle>
                <CardDescription>Key security indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>System Health</span>
                    <span className={securityStats?.isHealthy ? 'text-green-600' : 'text-red-600'}>
                      {securityStats?.isHealthy ? 'Good' : 'Poor'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        securityStats?.isHealthy ? 'bg-green-600' : 'bg-red-600'
                      }`}
                      style={{ width: securityStats?.isHealthy ? '100%' : '30%' }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Statistics</CardTitle>
              <CardDescription>System error monitoring and trends</CardDescription>
            </CardHeader>
            <CardContent>
              {errorStats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{errorStats.totalErrors24h}</div>
                      <div className="text-sm text-muted-foreground">Errors (24h)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{errorStats.totalErrors1h}</div>
                      <div className="text-sm text-muted-foreground">Errors (1h)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{errorStats.errorRate24h.toFixed(1)}</div>
                      <div className="text-sm text-muted-foreground">Errors/hour</div>
                    </div>
                    <div className="text-center">
                      <Badge variant={errorStats.isHealthy ? 'default' : 'destructive'}>
                        {errorStats.isHealthy ? 'Healthy' : 'Unhealthy'}
                      </Badge>
                    </div>
                  </div>

                  {errorStats.mostCommonError && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">Most Common Error</h4>
                      <Badge variant="outline">{errorStats.mostCommonError}</Badge>
                    </div>
                  )}

                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Errors by Severity</h4>
                    <div className="space-y-2">
                      {Object.entries(errorStats.errorsBySeverity).map(([severity, count]) => (
                        <div key={severity} className="flex justify-between items-center">
                          <span className="capitalize">{severity}</span>
                          <Badge variant={
                            severity === 'critical' ? 'destructive' : 
                            severity === 'high' ? 'destructive' :
                            severity === 'medium' ? 'secondary' : 'outline'
                          }>
                            {count}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No error statistics available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Patterns</CardTitle>
              <CardDescription>Analysis of user behavior patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">Pattern Analysis</h3>
                  <p className="text-muted-foreground">
                    Advanced pattern analysis features coming soon
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SecurityDashboard;