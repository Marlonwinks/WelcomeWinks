import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { UserProfile, UserPreferences } from '@/types/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Save, 
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProfileEditorProps {
  onSave?: (profile: UserProfile) => void;
  onCancel?: () => void;
  readOnly?: boolean;
}

export const ProfileEditor: React.FC<ProfileEditorProps> = ({
  onSave,
  onCancel,
  readOnly = false
}) => {
  const { userProfile, updateUserProfile, getCurrentAccount } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  
  const currentAccount = getCurrentAccount();
  const isCookieAccount = currentAccount.type === 'cookie';

  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || '',
        location: userProfile.location || '',
        gender: userProfile.gender || '',
        race: userProfile.race || '',
        veteranStatus: userProfile.veteranStatus,
        politicalPosition: userProfile.politicalPosition || '',
        preferences: userProfile.preferences,
        privacyConsent: userProfile.privacyConsent,
        termsAccepted: userProfile.termsAccepted
      });
    }
  }, [userProfile]);

  const handleInputChange = (field: keyof UserProfile, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };



  const handleSave = async () => {
    if (!userProfile || !hasChanges) return;

    setIsLoading(true);
    try {
      const updates = {
        ...formData,
        updatedAt: new Date()
      };

      await updateUserProfile(userProfile.userId, updates);
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });

      setHasChanges(false);
      onSave?.(userProfile);
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || '',
        location: userProfile.location || '',
        gender: userProfile.gender || '',
        race: userProfile.race || '',
        veteranStatus: userProfile.veteranStatus,
        politicalPosition: userProfile.politicalPosition || '',
        preferences: userProfile.preferences,
        privacyConsent: userProfile.privacyConsent,
        termsAccepted: userProfile.termsAccepted
      });
    }
    setHasChanges(false);
    onCancel?.();
  };

  if (!userProfile) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading profile...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Type Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={isCookieAccount ? "secondary" : "default"}>
            {isCookieAccount ? "Temporary Account" : "Full Account"}
          </Badge>
          {isCookieAccount && (
            <span className="text-sm text-muted-foreground">
              Data expires in 45 days of inactivity
            </span>
          )}
        </div>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name (Optional)</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Your name"
                disabled={readOnly}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location (Optional)</Label>
              <Input
                id="location"
                value={formData.location || ''}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="City, State"
                disabled={readOnly}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gender">Gender (Optional)</Label>
              <Select
                value={formData.gender || ''}
                onValueChange={(value) => handleInputChange('gender', value)}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not-specified">Prefer not to say</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="non-binary">Non-binary</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="race">Race/Ethnicity (Optional)</Label>
              <Select
                value={formData.race || ''}
                onValueChange={(value) => handleInputChange('race', value)}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select race/ethnicity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not-specified">Prefer not to say</SelectItem>
                  <SelectItem value="white">White</SelectItem>
                  <SelectItem value="black">Black or African American</SelectItem>
                  <SelectItem value="hispanic">Hispanic or Latino</SelectItem>
                  <SelectItem value="asian">Asian</SelectItem>
                  <SelectItem value="native-american">Native American</SelectItem>
                  <SelectItem value="pacific-islander">Pacific Islander</SelectItem>
                  <SelectItem value="mixed">Mixed Race</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="veteran">Veteran Status</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="veteran"
                  checked={formData.veteranStatus || false}
                  onCheckedChange={(checked) => handleInputChange('veteranStatus', checked)}
                  disabled={readOnly}
                />
                <Label htmlFor="veteran" className="text-sm">
                  I am a military veteran
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="political">Political Position (Optional)</Label>
              <Select
                value={formData.politicalPosition || ''}
                onValueChange={(value) => handleInputChange('politicalPosition', value)}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select political position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not-specified">Prefer not to say</SelectItem>
                  <SelectItem value="very-liberal">Very Liberal</SelectItem>
                  <SelectItem value="liberal">Liberal</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="conservative">Conservative</SelectItem>
                  <SelectItem value="very-conservative">Very Conservative</SelectItem>
                  <SelectItem value="libertarian">Libertarian</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>



      {/* Cookie Account Warning */}
      {isCookieAccount && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Temporary Account:</strong> Your data will be automatically deleted after 45 days of inactivity. 
            Consider creating a full account to preserve your information permanently.
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      {!readOnly && (
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
          
          {hasChanges && (
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
        </div>
      )}
    </div>
  );
};