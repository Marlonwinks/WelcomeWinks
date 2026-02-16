import React, { useState } from 'react';
import { Settings, Navigation, MapPin, Target, Eye, Shield, BookOpen, Download, Upload, RotateCcw, Bell } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Switch } from './switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Label } from './label';
import { Separator } from './separator';
import { Badge } from './badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { ScrollArea } from './scroll-area';
import { usePreferences } from '../../contexts/PreferencesProvider';
import { useToast } from '../../hooks/use-toast';
import { cn } from '../../lib/utils';

interface PreferencesManagerProps {
  variant?: 'full' | 'compact' | 'modal';
  sections?: Array<'navigation' | 'location' | 'goals' | 'ui' | 'privacy' | 'notifications' | 'onboarding'>;
  className?: string;
}

export const PreferencesManager: React.FC<PreferencesManagerProps> = ({
  variant = 'full',
  sections = ['navigation', 'location', 'goals', 'ui', 'privacy', 'notifications', 'onboarding'],
  className,
}) => {
  const {
    preferences,
    updateNavigationPreferences,
    updateLocationPreferences,
    updateGoalPreferences,
    updateUIPreferences,
    updatePrivacyPreferences,
    updateNotificationPreferences,
    updateOnboardingPreferences,
    resetPreferences,
    resetSection,
    exportPreferences,
    importPreferences,
  } = usePreferences();
  
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(sections[0]);

  // Handle export
  const handleExport = () => {
    try {
      const prefsJson = exportPreferences();
      const blob = new Blob([prefsJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'welcome-winks-preferences.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Preferences Exported',
        description: 'Your preferences have been downloaded as a JSON file.',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export preferences. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle import
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            const success = importPreferences(content);
            if (success) {
              toast({
                title: 'Preferences Imported',
                description: 'Your preferences have been successfully imported.',
              });
            } else {
              throw new Error('Invalid preferences file');
            }
          } catch (error) {
            toast({
              title: 'Import Failed',
              description: 'Failed to import preferences. Please check the file format.',
              variant: 'destructive',
            });
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  // Handle reset
  const handleReset = () => {
    resetPreferences();
    toast({
      title: 'Preferences Reset',
      description: 'All preferences have been reset to defaults.',
    });
  };

  // Handle section reset
  const handleSectionReset = (section: keyof typeof preferences) => {
    resetSection(section);
    toast({
      title: 'Section Reset',
      description: `${section.charAt(0).toUpperCase() + section.slice(1)} preferences have been reset.`,
    });
  };

  // Render navigation preferences
  const renderNavigationPreferences = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Navigation className="w-5 h-5 mr-2" />
          Navigation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="enable-transitions">Enable Transitions</Label>
          <Switch
            id="enable-transitions"
            checked={preferences.navigation.enableTransitions}
            onCheckedChange={(checked) => 
              updateNavigationPreferences({ enableTransitions: checked })
            }
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="remember-location">Remember Last Location</Label>
          <Switch
            id="remember-location"
            checked={preferences.navigation.rememberLastLocation}
            onCheckedChange={(checked) => 
              updateNavigationPreferences({ rememberLastLocation: checked })
            }
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-navigate">Auto Navigate After Onboarding</Label>
          <Switch
            id="auto-navigate"
            checked={preferences.navigation.autoNavigateAfterOnboarding}
            onCheckedChange={(checked) => 
              updateNavigationPreferences({ autoNavigateAfterOnboarding: checked })
            }
          />
        </div>
        
        <div className="space-y-2">
          <Label>Back Button Behavior</Label>
          <Select
            value={preferences.navigation.preferredBackBehavior}
            onValueChange={(value: 'browser' | 'contextual') => 
              updateNavigationPreferences({ preferredBackBehavior: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contextual">Smart (Contextual)</SelectItem>
              <SelectItem value="browser">Browser Default</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSectionReset('navigation')}
          className="w-full"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Navigation Settings
        </Button>
      </CardContent>
    </Card>
  );

  // Render location preferences
  const renderLocationPreferences = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MapPin className="w-5 h-5 mr-2" />
          Location
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-detect">Auto Detect Location</Label>
          <Switch
            id="auto-detect"
            checked={preferences.location.autoDetect}
            onCheckedChange={(checked) => 
              updateLocationPreferences({ autoDetect: checked })
            }
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="fallback-ip">Fallback to IP Location</Label>
          <Switch
            id="fallback-ip"
            checked={preferences.location.fallbackToIP}
            onCheckedChange={(checked) => 
              updateLocationPreferences({ fallbackToIP: checked })
            }
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="remember-location-pref">Remember Location</Label>
          <Switch
            id="remember-location-pref"
            checked={preferences.location.rememberLocation}
            onCheckedChange={(checked) => 
              updateLocationPreferences({ rememberLocation: checked })
            }
          />
        </div>
        
        <div className="space-y-2">
          <Label>Location Accuracy</Label>
          <Select
            value={preferences.location.locationAccuracy}
            onValueChange={(value: 'high' | 'medium' | 'low') => 
              updateLocationPreferences({ locationAccuracy: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High (GPS)</SelectItem>
              <SelectItem value="medium">Medium (Network)</SelectItem>
              <SelectItem value="low">Low (IP)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Location History</Label>
          <div className="text-sm text-muted-foreground">
            {preferences.location.locationHistory.length} saved locations
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateLocationPreferences({ locationHistory: [] })}
            className="w-full"
          >
            Clear Location History
          </Button>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSectionReset('location')}
          className="w-full"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Location Settings
        </Button>
      </CardContent>
    </Card>
  );

  // Render goal preferences
  const renderGoalPreferences = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Target className="w-5 h-5 mr-2" />
          Goals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="remember-goal">Remember Goal Choice</Label>
          <Switch
            id="remember-goal"
            checked={preferences.goals.rememberGoalChoice}
            onCheckedChange={(checked) => 
              updateGoalPreferences({ rememberGoalChoice: checked })
            }
          />
        </div>
        
        <div className="space-y-2">
          <Label>Preferred Goal</Label>
          <div className="flex items-center space-x-2">
            {preferences.goals.preferredGoal ? (
              <Badge variant="default">
                {preferences.goals.preferredGoal === 'mark-business' ? 'Rate Business' : 'Find Welcoming'}
              </Badge>
            ) : (
              <Badge variant="outline">None Set</Badge>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Goal History</Label>
          <div className="text-sm text-muted-foreground">
            {preferences.goals.goalHistory.length} goal interactions
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateGoalPreferences({ goalHistory: [] })}
            className="w-full"
          >
            Clear Goal History
          </Button>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSectionReset('goals')}
          className="w-full"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Goal Settings
        </Button>
      </CardContent>
    </Card>
  );

  // Render UI preferences
  const renderUIPreferences = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Eye className="w-5 h-5 mr-2" />
          Interface
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        <div className="space-y-2">
          <Label>Default View</Label>
          <Select
            value={preferences.ui.defaultView}
            onValueChange={(value: 'map' | 'list' | 'dual') => 
              updateUIPreferences({ defaultView: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="map">Map View</SelectItem>
              <SelectItem value="list">List View</SelectItem>
              <SelectItem value="dual">Dual View (Map + List)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="show-breadcrumbs">Show Breadcrumbs</Label>
          <Switch
            id="show-breadcrumbs"
            checked={preferences.ui.showBreadcrumbs}
            onCheckedChange={(checked) => 
              updateUIPreferences({ showBreadcrumbs: checked })
            }
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="compact-mode">Compact Mode</Label>
          <Switch
            id="compact-mode"
            checked={preferences.ui.compactMode}
            onCheckedChange={(checked) => 
              updateUIPreferences({ compactMode: checked })
            }
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="reduced-motion">Reduced Motion</Label>
          <Switch
            id="reduced-motion"
            checked={preferences.ui.reducedMotion}
            onCheckedChange={(checked) => 
              updateUIPreferences({ reducedMotion: checked })
            }
          />
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSectionReset('ui')}
          className="w-full"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Interface Settings
        </Button>
      </CardContent>
    </Card>
  );

  // Render privacy preferences
  const renderPrivacyPreferences = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          Privacy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="share-location">Share Location</Label>
          <Switch
            id="share-location"
            checked={preferences.privacy.shareLocation}
            onCheckedChange={(checked) => 
              updatePrivacyPreferences({ shareLocation: checked })
            }
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="share-contributions">Share Contributions</Label>
          <Switch
            id="share-contributions"
            checked={preferences.privacy.shareContributions}
            onCheckedChange={(checked) => 
              updatePrivacyPreferences({ shareContributions: checked })
            }
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="allow-analytics">Allow Analytics</Label>
          <Switch
            id="allow-analytics"
            checked={preferences.privacy.allowAnalytics}
            onCheckedChange={(checked) => 
              updatePrivacyPreferences({ allowAnalytics: checked })
            }
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="remember-choices">Remember Choices</Label>
          <Switch
            id="remember-choices"
            checked={preferences.privacy.rememberChoices}
            onCheckedChange={(checked) => 
              updatePrivacyPreferences({ rememberChoices: checked })
            }
          />
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSectionReset('privacy')}
          className="w-full"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Privacy Settings
        </Button>
      </CardContent>
    </Card>
  );

  // Render onboarding preferences
  const renderOnboardingPreferences = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BookOpen className="w-5 h-5 mr-2" />
          Onboarding
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="skip-intro">Skip Introduction</Label>
          <Switch
            id="skip-intro"
            checked={preferences.onboarding.skipIntro}
            onCheckedChange={(checked) => 
              updateOnboardingPreferences({ skipIntro: checked })
            }
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="show-hints">Show Hints</Label>
          <Switch
            id="show-hints"
            checked={preferences.onboarding.showHints}
            onCheckedChange={(checked) => 
              updateOnboardingPreferences({ showHints: checked })
            }
          />
        </div>
        
        <div className="space-y-2">
          <Label>Completed Steps</Label>
          <div className="text-sm text-muted-foreground">
            {preferences.onboarding.completedSteps.length} steps completed
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateOnboardingPreferences({ completedSteps: [] })}
            className="w-full"
          >
            Reset Onboarding Progress
          </Button>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSectionReset('onboarding')}
          className="w-full"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Onboarding Settings
        </Button>
      </CardContent>
    </Card>
  );

  // Render notification preferences
  const renderNotificationPreferences = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master notification toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-medium">Enable Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Master switch for all notification types
            </p>
          </div>
          <Switch
            checked={preferences.notifications.enabled}
            onCheckedChange={(checked) => 
              updateNotificationPreferences({ enabled: checked })
            }
          />
        </div>

        <Separator />

        {/* Individual notification types */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Notification Types</h4>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>New Businesses Nearby</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when new businesses are added near you
                </p>
              </div>
              <Switch
                checked={preferences.notifications.newBusinessesNearby}
                onCheckedChange={(checked) => 
                  updateNotificationPreferences({ newBusinessesNearby: checked })
                }
                disabled={!preferences.notifications.enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Score Updates</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when businesses you've rated get new scores
                </p>
              </div>
              <Switch
                checked={preferences.notifications.scoreUpdates}
                onCheckedChange={(checked) => 
                  updateNotificationPreferences({ scoreUpdates: checked })
                }
                disabled={!preferences.notifications.enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Community Activity</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified about nearby rating activity
                </p>
              </div>
              <Switch
                checked={preferences.notifications.communityActivity}
                onCheckedChange={(checked) => 
                  updateNotificationPreferences({ communityActivity: checked })
                }
                disabled={!preferences.notifications.enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Achievements</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when you earn achievements
                </p>
              </div>
              <Switch
                checked={preferences.notifications.achievements}
                onCheckedChange={(checked) => 
                  updateNotificationPreferences({ achievements: checked })
                }
                disabled={!preferences.notifications.enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>System Updates</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified about app updates and important announcements
                </p>
              </div>
              <Switch
                checked={preferences.notifications.systemUpdates}
                onCheckedChange={(checked) => 
                  updateNotificationPreferences({ systemUpdates: checked })
                }
                disabled={!preferences.notifications.enabled}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Nearby radius setting */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Nearby Radius</h4>
          <div className="space-y-2">
            <Label>Notification Radius</Label>
            <p className="text-xs text-muted-foreground">
              Only receive notifications for businesses within this distance
            </p>
            <Select
              value={preferences.notifications.nearbyRadius.toString()}
              onValueChange={(value) => 
                updateNotificationPreferences({ nearbyRadius: parseFloat(value) })
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">0.5 miles</SelectItem>
                <SelectItem value="1.0">1.0 miles</SelectItem>
                <SelectItem value="2.0">2.0 miles</SelectItem>
                <SelectItem value="5.0">5.0 miles</SelectItem>
                <SelectItem value="10.0">10.0 miles</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Section renderers map
  const sectionRenderers = {
    navigation: renderNavigationPreferences,
    location: renderLocationPreferences,
    goals: renderGoalPreferences,
    ui: renderUIPreferences,
    privacy: renderPrivacyPreferences,
    notifications: renderNotificationPreferences,
    onboarding: renderOnboardingPreferences,
  };

  // Render compact variant
  if (variant === 'compact') {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Quick Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="transitions-compact">Transitions</Label>
            <Switch
              id="transitions-compact"
              checked={preferences.navigation.enableTransitions}
              onCheckedChange={(checked) => 
                updateNavigationPreferences({ enableTransitions: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="remember-compact">Remember Location</Label>
            <Switch
              id="remember-compact"
              checked={preferences.location.rememberLocation}
              onCheckedChange={(checked) => 
                updateLocationPreferences({ rememberLocation: checked })
              }
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render modal variant
  if (variant === 'modal') {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className={className}>
            <Settings className="w-4 h-4 mr-2" />
            Preferences
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Preferences</DialogTitle>
          </DialogHeader>
          <PreferencesManager variant="full" sections={sections} />
        </DialogContent>
      </Dialog>
    );
  }

  // Render full variant (default)
  return (
    <div className={cn('w-full space-y-6', className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Preferences</h2>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleImport}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset All
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          {sections.map((section) => (
            <TabsTrigger key={section} value={section} className="capitalize">
              {section}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {sections.map((section) => (
          <TabsContent key={section} value={section} className="mt-6">
            <ScrollArea className="h-[600px]">
              {sectionRenderers[section]()}
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

// Specialized variants
export const CompactPreferencesManager: React.FC<Omit<PreferencesManagerProps, 'variant'>> = (props) => (
  <PreferencesManager {...props} variant="compact" />
);

export const ModalPreferencesManager: React.FC<Omit<PreferencesManagerProps, 'variant'>> = (props) => (
  <PreferencesManager {...props} variant="modal" />
);