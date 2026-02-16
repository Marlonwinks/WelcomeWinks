import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { usePreferences } from '@/contexts/PreferencesProvider';
import {
  User,
  MapPin,
  Trophy,
  Settings,
  Edit3,
  Eye,
  Shield,
  Download,
  Activity,
  Calendar,
  Loader2,
  UserPlus,
  LogIn,
  LogOut,
  ArrowLeft,
  Utensils
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { ProfileEditor } from '@/components/profile/ProfileEditor';
import { DataManagement } from '@/components/profile/DataManagement';
import { AchievementsDisplay } from '@/components/profile/AchievementsDisplay';
import { SignupForm } from '@/components/auth/SignupForm';
import { LoginForm, PasswordResetForm } from '@/components/auth/LoginForm';
import { profileService } from '@/services/profile.service';
import { ratingsService } from '@/services/ratings.service';
import { useToast } from '@/hooks/use-toast';
import { User as FirebaseUser } from 'firebase/auth';
import { getWelcomingLevel } from '@/components/business/ScoreIndicator';
import { DiningPreferencesManager } from '@/components/preferences/DiningPreferencesManager';
import { PreferenceSuggestions } from '@/components/preferences/PreferenceSuggestions';
import { DiningPreferences } from '@/types/preferences';
import { BusinessRating, Business } from '@/types/firebase';

interface AccountActivity {
  totalRatings: number;
  lastActivity: Date | null;
  accountAge: number;
  ipAddressCount: number;
  recentActivity: unknown[];
}

const ProfilePage: React.FC = () => {
  const { userProfile, getCurrentAccount, signUp, signOut } = useAuth();
  const { preferences, updateDiningPreferences } = usePreferences();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingPreferences, setIsEditingPreferences] = useState(false);
  const [accountActivity, setAccountActivity] = useState<AccountActivity | null>(null);
  const [userRatings, setUserRatings] = useState<Array<BusinessRating & {
    business?: Business;
    wasMigrated?: boolean;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSignup, setShowSignup] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  const currentAccount = getCurrentAccount();
  const isCookieAccount = currentAccount.type === 'cookie';

  useEffect(() => {
    const loadProfileData = async () => {
      if (!userProfile) {
        setIsLoading(false);
        return;
      }

      try {
        // Load account activity
        const activity = await profileService.getAccountActivity(userProfile.userId);
        setAccountActivity(activity);

        // Load user ratings with business information
        const ratingsWithBusiness = await ratingsService.getUserRatingHistory(userProfile.userId);
        setUserRatings(ratingsWithBusiness.slice(0, 10)); // Limit to 10 most recent

        // Check and unlock achievements for existing user
        try {
          const userStats = await ratingsService.calculateUserStats(userProfile.userId);
          const achievementsService = (await import('@/services/achievements.service')).achievementsService;
          const unlockedAchievements = await achievementsService.checkAndUnlockAchievements(userProfile.userId, userStats);

          if (unlockedAchievements.length > 0) {
            console.log(`🏆 Unlocked ${unlockedAchievements.length} achievements on profile load:`, unlockedAchievements.map(a => a.title));

            // Show toast for newly unlocked achievements
            for (const achievement of unlockedAchievements) {
              toast({
                title: "Achievement Unlocked!",
                description: `${achievement.title}: ${achievement.description}`,
                variant: "default"
              });
            }
          }
        } catch (achievementError) {
          console.error('❌ Failed to check achievements on profile load:', achievementError);
          // Don't fail the profile loading if achievement checking fails
        }
      } catch (error) {
        console.error('Failed to load profile data:', error);
        toast({
          title: "Loading Error",
          description: "Failed to load some profile data. Please refresh the page.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProfileData();
  }, [userProfile, toast]);

  const handleProfileSave = () => {
    setIsEditing(false);
    toast({
      title: "Profile Updated",
      description: "Your profile has been successfully updated.",
    });
  };

  const handleDiningPreferencesSave = async () => {
    setIsSavingPreferences(true);
    try {
      // Preferences are already saved via updateDiningPreferences
      // This is just for UI feedback
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate save delay
      setIsEditingPreferences(false);
      toast({
        title: "Preferences Saved",
        description: "Your dining preferences have been updated successfully.",
      });
    } catch (error) {
      console.error('Failed to save dining preferences:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save your preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const handleDiningPreferencesCancel = () => {
    setIsEditingPreferences(false);
  };

  const handleSignupSuccess = async (firebaseUser: FirebaseUser) => {
    setIsSigningUp(false);
    setShowSignup(false);
    toast({
      title: "Account Created",
      description: "Welcome to Welcome Winks! Your account has been created successfully.",
    });
    // The auth context will automatically update the user state
  };

  const handleSignupCancel = () => {
    setShowSignup(false);
    setIsSigningUp(false);
  };

  const handleLoginSuccess = async (firebaseUser: FirebaseUser) => {
    setIsLoggingIn(false);
    setShowLogin(false);
    toast({
      title: "Welcome Back!",
      description: "You've successfully signed in to your account.",
    });
    // The auth context will automatically update the user state
  };

  const handleLoginCancel = () => {
    setShowLogin(false);
    setIsLoggingIn(false);
    setShowForgotPassword(false);
  };

  const handleBackToOptions = () => {
    setShowSignup(false);
    setShowLogin(false);
    setIsSigningUp(false);
    setIsLoggingIn(false);
    setShowForgotPassword(false);
  };

  const handleForgotPassword = () => {
    // TODO: Implement forgot password functionality
    toast({
      title: "Forgot Password",
      description: "Password reset functionality will be available soon.",
      variant: "default"
    });
  };

  const handleLogout = async () => {
    const confirmed = window.confirm('Are you sure you want to logout?');
    if (confirmed) {
      try {
        await signOut();
        toast({
          title: "Logged Out",
          description: "You have been successfully logged out.",
        });
      } catch (error) {
        console.error('Logout error:', error);
        toast({
          title: "Logout Failed",
          description: "There was an error logging out. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const getContributionLevel = (ratingsCount: number) => {
    if (ratingsCount === 0) return { level: 'New Marker', progress: 0, next: 'Bronze', nextTarget: 10 };
    if (ratingsCount < 10) return { level: 'New Marker', progress: ratingsCount, next: 'Bronze', nextTarget: 10 };
    if (ratingsCount < 25) return { level: 'Bronze Marker', progress: ratingsCount - 10, next: 'Silver', nextTarget: 25 };
    if (ratingsCount < 50) return { level: 'Silver Marker', progress: ratingsCount - 25, next: 'Gold', nextTarget: 50 };
    return { level: 'Gold Marker', progress: ratingsCount, next: 'Legend', nextTarget: 100 };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pb-20 md:pb-0 bg-background">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading profile...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen pb-20 md:pb-0 bg-background">
        <div className="max-w-4xl mx-auto p-4">
          {!showSignup && !showLogin ? (
            <Card>
              <CardContent className="p-6 text-center">
                <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold mb-2">No Profile Found</h2>
                <p className="text-muted-foreground mb-6">
                  Create an account to track your ratings, view your contribution level, and access all features.
                </p>

                <div className="space-y-4">
                  <div className="grid gap-3 max-w-md mx-auto">
                    <Button
                      onClick={() => setShowSignup(true)}
                      className="w-full"
                      size="lg"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create Account
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setShowLogin(true)}
                      className="w-full"
                      size="lg"
                    >
                      <LogIn className="h-4 w-4 mr-2" />
                      Sign In
                    </Button>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <p>Or continue as a guest to rate places without an account.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : showLogin ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToOptions}
                    className="p-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-lg font-semibold">Sign In to Your Account</h2>
                </div>

                {showForgotPassword ? (
                  <PasswordResetForm
                    onSuccess={() => {
                      setShowForgotPassword(false);
                      setShowLogin(true);
                      toast({
                        title: "Reset Link Sent",
                        description: "Check your email for instructions to reset your password.",
                      });
                    }}
                    onCancel={() => {
                      setShowForgotPassword(false);
                      setShowLogin(true);
                    }}
                  />
                ) : (
                  <LoginForm
                    onSuccess={handleLoginSuccess}
                    onCancel={handleBackToOptions}
                    onForgotPassword={() => {
                      setShowForgotPassword(true);
                    }}
                    onSignUp={() => {
                      setShowLogin(false);
                      setShowSignup(true);
                    }}
                  />
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToOptions}
                    className="p-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-lg font-semibold">Create Your Account</h2>
                </div>

                <SignupForm
                  onSuccess={handleSignupSuccess}
                  onCancel={handleBackToOptions}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  const contributionLevel = getContributionLevel(accountActivity?.totalRatings || 0);

  return (
    <div className="min-h-screen pb-20 md:pb-0 bg-background">
      <div className="max-w-7xl mx-auto p-3 md:p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Profile Card (Sticky on Desktop) */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
            <Card className="glass border-border overflow-hidden">
              <div className="h-24 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border/50" />
              <CardContent className="p-6 -mt-12 relative">
                <Avatar className="h-24 w-24 border-4 border-background shadow-lg mb-4">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary/5 text-primary text-2xl">
                    {userProfile.name?.charAt(0) || <User className="h-10 w-10" />}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-4">
                  <div>
                    <h1 className="text-2xl font-bold truncate">
                      {userProfile.name || 'Anonymous User'}
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={isCookieAccount ? "secondary" : "default"} className="shadow-sm">
                        {isCookieAccount ? "Temporary Account" : "Welcome Winks Member"}
                      </Badge>
                      <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5">
                        {contributionLevel.level}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {userProfile.location || 'Location not set'}
                  </div>

                  {accountActivity && (
                    <div className="grid grid-cols-2 gap-4 py-4 border-t border-border/50">
                      <div>
                        <span className="text-2xl font-bold block text-foreground">
                          {accountActivity.totalRatings}
                        </span>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Ratings</span>
                      </div>
                      <div>
                        <span className="text-2xl font-bold block text-foreground">
                          {accountActivity.accountAge}
                        </span>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Days Active</span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      className="w-full shadow-sm"
                      onClick={() => setIsEditing(!isEditing)}
                      variant={isEditing ? "secondary" : "default"}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      {isEditing ? "Cancel Editing" : "Edit Profile"}
                    </Button>

                    {isCookieAccount ? (
                      <Button variant="outline" className="w-full" onClick={() => setShowSignup(true)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create Full Account
                      </Button>
                    ) : (
                      <Button variant="ghost" className="w-full text-muted-foreground hover:text-destructive" onClick={handleLogout}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-border hidden lg:block">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Next Milestone</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm font-medium">
                    <span>{contributionLevel.next}</span>
                    <span>{contributionLevel.progress} / {contributionLevel.nextTarget}</span>
                  </div>
                  <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${(contributionLevel.progress / contributionLevel.nextTarget) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Main Content */}
          <div className="lg:col-span-8 space-y-6">
            <Tabs defaultValue={isEditing ? "edit" : "overview"} value={isEditing ? "edit" : undefined} className="w-full">
              <div className="overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 backdrop-blur-sm sticky top-0 md:relative z-10">
                  <TabsTrigger value="overview" className="flex-1 md:flex-none">Overview</TabsTrigger>
                  <TabsTrigger value="edit" className="flex-1 md:flex-none">Details</TabsTrigger>
                  <TabsTrigger value="preferences" className="flex-1 md:flex-none">Preferences</TabsTrigger>
                  <TabsTrigger value="achievements" className="flex-1 md:flex-none">Achievements</TabsTrigger>
                  <TabsTrigger value="activity" className="flex-1 md:flex-none">History</TabsTrigger>
                  <TabsTrigger value="data" className="flex-1 md:flex-none">Data & Privacy</TabsTrigger>
                </TabsList>
              </div>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4 md:space-y-6 mt-4 animate-in fade-in-50 duration-300">
                {/* Mobile Contribution Card (Hidden on Desktop) */}
                <Card className="glass border-border lg:hidden">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-accent" />
                      Contribution Level
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="outline">
                        {contributionLevel.level}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {accountActivity?.totalRatings || 0} ratings total
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress to {contributionLevel.next}</span>
                        <span className="text-muted-foreground">
                          {contributionLevel.progress}/{contributionLevel.nextTarget}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${(contributionLevel.progress / contributionLevel.nextTarget) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Ratings */}
                <Card className="glass border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      Your Recent Ratings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {userRatings.length > 0 ? (
                        userRatings.map((rating, index) => {
                          const correctWelcomingLevel = getWelcomingLevel(rating.totalScore);
                          const getBadgeVariant = (level: string) => {
                            switch (level) {
                              case 'very-welcoming': return 'default';
                              case 'moderately-welcoming': return 'secondary';
                              case 'not-welcoming': return 'destructive';
                              default: return 'outline';
                            }
                          };

                          return (
                            <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors border border-transparent hover:border-border/50 cursor-default">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold text-base">{rating.business?.name || 'Unknown Business'}</h4>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(rating.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Badge variant={getBadgeVariant(correctWelcomingLevel)} className="shadow-sm">
                                    {correctWelcomingLevel.replace('-', ' ')}
                                  </Badge>
                                  <div className="h-1 w-1 rounded-full bg-border" />
                                  <span className="text-sm font-medium">
                                    Score: {rating.totalScore.toFixed(1)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                          <MapPin className="h-10 w-10 mx-auto mb-3 opacity-20" />
                          <p className="font-medium">No ratings yet</p>
                          <p className="text-sm opacity-70">Start rating businesses to see them here</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Edit Profile Tab */}
              <TabsContent value="edit" className="space-y-6 animate-in fade-in-50">
                <ProfileEditor
                  onSave={handleProfileSave}
                  onCancel={() => setIsEditing(false)}
                />
              </TabsContent>

              {/* Dining Preferences Tab */}
              <TabsContent value="preferences" className="space-y-6 animate-in fade-in-50">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Utensils className="h-5 w-5 text-primary" />
                        Dining Preferences
                      </CardTitle>
                      {!isEditingPreferences && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingPreferences(true)}
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit Preferences
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isEditingPreferences ? (
                      <div className="space-y-6">
                        <DiningPreferencesManager
                          preferences={preferences.dining}
                          onChange={(updates) => updateDiningPreferences(updates)}
                        />
                        <div className="flex gap-2 justify-end pt-4 border-t">
                          <Button
                            variant="outline"
                            onClick={handleDiningPreferencesCancel}
                            disabled={isSavingPreferences}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleDiningPreferencesSave}
                            disabled={isSavingPreferences}
                          >
                            {isSavingPreferences ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              'Save Preferences'
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {/* Preference Summary Display */}
                        <div className="grid gap-6 md:grid-cols-2">
                          {/* Cuisines Summary */}
                          {(preferences.dining.cuisines.preferred.length > 0 || preferences.dining.dietary.restrictions.length > 0) && (
                            <div className="space-y-4">
                              {preferences.dining.cuisines.preferred.length > 0 && (
                                <div>
                                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">Cuisines</Label>
                                  <div className="flex flex-wrap gap-2">
                                    {preferences.dining.cuisines.preferred.map((cuisine) => (
                                      <Badge key={cuisine} variant="secondary" className="px-3 py-1">
                                        {cuisine}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {preferences.dining.dietary.restrictions.length > 0 && (
                                <div>
                                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">Dietary</Label>
                                  <div className="flex flex-wrap gap-2">
                                    {preferences.dining.dietary.restrictions.map((restriction) => (
                                      <Badge key={restriction} variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                                        {restriction.replace(/-/g, ' ')}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="space-y-4">
                            {/* Rating Summary */}
                            <div>
                              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">Minimum Standards</Label>
                              <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                                <p className="text-sm font-medium">Google Rating: {preferences.dining.rating.minRating.toFixed(1)}+</p>
                                {preferences.dining.rating.minWinksScore !== null && (
                                  <p className="text-sm font-medium mt-1">Welcome Winks Score: {preferences.dining.rating.minWinksScore.toFixed(1)}+</p>
                                )}
                              </div>
                            </div>

                            {/* Price Range */}
                            <div>
                              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">Price Range</Label>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4].map((price) => (
                                  <div
                                    key={price}
                                    className={`h-8 w-12 rounded flex items-center justify-center text-sm font-medium border ${price >= preferences.dining.priceRange.min && price <= preferences.dining.priceRange.max
                                      ? 'bg-primary text-primary-foreground border-primary'
                                      : 'bg-muted text-muted-foreground border-border'
                                      }`}
                                  >
                                    {'$'.repeat(price)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Empty State */}
                        {preferences.dining.cuisines.preferred.length === 0 &&
                          preferences.dining.dietary.restrictions.length === 0 &&
                          preferences.dining.ambiance.preferred.length === 0 &&
                          preferences.dining.features.preferred.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border col-span-2">
                              <Utensils className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>No dining preferences set</p>
                              <p className="text-sm mt-1">Set your preferences to get personalized recommendations</p>
                              <Button onClick={() => setIsEditingPreferences(true)} variant="link" className="mt-2">
                                Start Customizing
                              </Button>
                            </div>
                          )}

                        {/* Preference Suggestions */}
                        <div className="pt-6 border-t border-border/50">
                          <h3 className="text-sm font-medium mb-4">Recommended for You</h3>
                          <PreferenceSuggestions
                            variant="card"
                            maxSuggestions={3}
                            onSuggestionsApplied={() => {
                              toast({
                                title: 'Preferences updated',
                                description: 'Your dining preferences have been updated based on your activity.',
                              });
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Achievements Tab */}
              <TabsContent value="achievements" className="space-y-6">
                <AchievementsDisplay
                  userId={userProfile.userId}
                  userStats={{
                    averageScore: accountActivity?.totalRatings ?
                      userRatings.reduce((sum, rating) => sum + rating.totalScore, 0) / userRatings.length : 0,
                    totalRatings: userRatings.length,
                    uniqueBusinesses: new Set(userRatings.map(r => r.businessId)).size,
                    businessesHelped: userRatings.filter(r => r.totalScore >= 4.0).length,
                    highestScore: userRatings.length > 0 ? Math.max(...userRatings.map(r => r.totalScore)) : 0
                  }}
                />
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Account Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {accountActivity ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Total Ratings</Label>
                          <p className="text-2xl font-bold">{accountActivity.totalRatings}</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Account Age</Label>
                          <p className="text-2xl font-bold">{accountActivity.accountAge} days</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Last Activity</Label>
                          <p className="text-sm text-muted-foreground">
                            {accountActivity.lastActivity
                              ? new Date(accountActivity.lastActivity).toLocaleString()
                              : 'No recent activity'
                            }
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Login Sessions</Label>
                          <p className="text-sm text-muted-foreground">
                            {accountActivity.ipAddressCount} different sessions
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="ml-2">Loading activity data...</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Data & Privacy Tab */}
              <TabsContent value="data" className="space-y-6">
                <DataManagement />
              </TabsContent>
            </Tabs>

            {/* Helper Text */}
            <div className="text-center text-sm text-muted-foreground px-4">
              <p>Helping others choose where to go</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sign-up Modal for existing users */}
      {showSignup && userProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignupCancel}
                  className="p-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold">
                  {isCookieAccount ? "Upgrade to Full Account" : "Create Account"}
                </h2>
              </div>

              <SignupForm
                onSuccess={handleSignupSuccess}
                onCancel={handleSignupCancel}
                initialData={isCookieAccount ? {
                  name: userProfile.name,
                  location: userProfile.location
                } : undefined}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Login Modal for existing users */}
      {showLogin && userProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoginCancel}
                  className="p-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold">Sign In to Your Account</h2>
              </div>

              <LoginForm
                onSuccess={handleLoginSuccess}
                onCancel={handleLoginCancel}
                onForgotPassword={handleForgotPassword}
                onSignUp={() => {
                  setShowLogin(false);
                  setShowSignup(true);
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;