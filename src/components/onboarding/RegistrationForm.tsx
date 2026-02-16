import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { RegistrationData, UserPreferences, DEFAULT_USER_PREFERENCES } from '@/types/onboarding';
import { 
  announceToScreenReader, 
  generateId,
  useFocusTrap
} from '@/lib/accessibility';

interface RegistrationFormProps {
  onSubmit: (data: RegistrationData) => void;
  onBack: () => void;
  isLoading?: boolean;
  className?: string;
}

interface FormErrors {
  email?: string;
  username?: string;
  privacyConsent?: string;
  termsAccepted?: string;
  general?: string;
}

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
  { value: 'other', label: 'Other' },
];

const RACE_OPTIONS = [
  { value: 'white', label: 'White' },
  { value: 'black', label: 'Black or African American' },
  { value: 'hispanic', label: 'Hispanic or Latino' },
  { value: 'asian', label: 'Asian' },
  { value: 'native-american', label: 'Native American' },
  { value: 'pacific-islander', label: 'Pacific Islander' },
  { value: 'mixed', label: 'Mixed Race' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
  { value: 'other', label: 'Other' },
];

const POLITICAL_POSITION_OPTIONS = [
  { value: 'very-liberal', label: 'Very Liberal' },
  { value: 'liberal', label: 'Liberal' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'conservative', label: 'Conservative' },
  { value: 'very-conservative', label: 'Very Conservative' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  onSubmit,
  onBack,
  isLoading = false,
  className = '',
}) => {
  const [formData, setFormData] = useState<Partial<RegistrationData>>({
    email: '',
    username: '',
    name: '',
    location: '',
    gender: '',
    race: '',
    veteranStatus: undefined,
    politicalPosition: '',
    preferences: DEFAULT_USER_PREFERENCES,
    privacyConsent: false,
    termsAccepted: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showSuccess, setShowSuccess] = useState(false);
  
  const formRef = useRef<HTMLFormElement>(null);
  const firstErrorRef = useRef<HTMLInputElement>(null);
  const formTitleId = generateId('registration-form-title');
  const formDescriptionId = generateId('registration-form-description');
  
  // Focus trap for the form
  const focusTrapRef = useFocusTrap(!showSuccess);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required field validation
    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.username?.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!formData.privacyConsent) {
      newErrors.privacyConsent = 'You must consent to our privacy policy';
    }

    if (!formData.termsAccepted) {
      newErrors.termsAccepted = 'You must accept our terms of service';
    }

    setErrors(newErrors);
    
    // Announce validation errors to screen readers
    if (Object.keys(newErrors).length > 0) {
      const errorCount = Object.keys(newErrors).length;
      announceToScreenReader(
        `Form has ${errorCount} error${errorCount > 1 ? 's' : ''}. Please review and correct.`,
        'assertive'
      );
    }
    
    return Object.keys(newErrors).length === 0;
  };

  // Focus first error field when validation fails
  useEffect(() => {
    if (Object.keys(errors).length > 0 && firstErrorRef.current) {
      firstErrorRef.current.focus();
    }
  }, [errors]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const registrationData: RegistrationData = {
        email: formData.email!,
        username: formData.username!,
        name: formData.name || undefined,
        location: formData.location || undefined,
        gender: formData.gender || undefined,
        race: formData.race || undefined,
        veteranStatus: formData.veteranStatus,
        politicalPosition: formData.politicalPosition || undefined,
        preferences: formData.preferences || DEFAULT_USER_PREFERENCES,
        privacyConsent: formData.privacyConsent!,
        termsAccepted: formData.termsAccepted!,
      };

      announceToScreenReader('Registration successful! Creating your account...', 'polite');
      setShowSuccess(true);
      setTimeout(() => {
        onSubmit(registrationData);
      }, 1000);
    } catch (error) {
      const errorMessage = 'An error occurred. Please try again.';
      setErrors({ general: errorMessage });
      announceToScreenReader(errorMessage, 'assertive');
    }
  };

  const updateFormData = (field: keyof RegistrationData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const updatePreferences = (field: keyof UserPreferences, value: any) => {
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [field]: value,
      },
    }));
  };

  if (showSuccess) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`} role="status" aria-live="polite">
        <Card className="w-full max-w-md mx-auto text-center">
          <CardContent className="pt-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-xl font-semibold mb-2">Welcome to Welcome Winks!</h3>
            <p className="text-muted-foreground">
              Your account has been created successfully. Redirecting you to the app...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`max-w-2xl mx-auto p-4 ${className}`} ref={focusTrapRef}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBack} 
              disabled={isLoading}
              aria-label="Go back to previous step"
            >
              <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
              Back
            </Button>
          </div>
          <CardTitle id={formTitleId}>Create Your Account</CardTitle>
          <CardDescription id={formDescriptionId}>
            Join the Welcome Winks community to track your contributions and get personalized recommendations.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form 
            ref={formRef}
            onSubmit={handleSubmit} 
            className="space-y-6"
            aria-labelledby={formTitleId}
            aria-describedby={formDescriptionId}
            noValidate
          >
            {errors.general && (
              <Alert variant="destructive" role="alert" aria-live="assertive">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            {/* Required Fields */}
            <fieldset className="space-y-4">
              <legend className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Required Information
              </legend>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    ref={errors.email ? firstErrorRef : undefined}
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => updateFormData('email', e.target.value)}
                    className={errors.email ? 'border-destructive' : ''}
                    disabled={isLoading}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    required
                  />
                  {errors.email && (
                    <p id="email-error" className="text-sm text-destructive" role="alert">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    ref={errors.username && !errors.email ? firstErrorRef : undefined}
                    id="username"
                    value={formData.username || ''}
                    onChange={(e) => updateFormData('username', e.target.value)}
                    className={errors.username ? 'border-destructive' : ''}
                    disabled={isLoading}
                    aria-invalid={!!errors.username}
                    aria-describedby={errors.username ? 'username-error' : undefined}
                    required
                  />
                  {errors.username && (
                    <p id="username-error" className="text-sm text-destructive" role="alert">
                      {errors.username}
                    </p>
                  )}
                </div>
              </div>
            </fieldset>

            {/* Optional Demographic Fields */}
            <fieldset className="space-y-4">
              <legend className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Optional Information
                <span className="text-xs normal-case ml-2">(helps us provide better recommendations)</span>
              </legend>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="City, State"
                    value={formData.location || ''}
                    onChange={(e) => updateFormData('location', e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={formData.gender || ''}
                    onValueChange={(value) => updateFormData('gender', value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="race">Race/Ethnicity</Label>
                  <Select
                    value={formData.race || ''}
                    onValueChange={(value) => updateFormData('race', value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select race/ethnicity" />
                    </SelectTrigger>
                    <SelectContent>
                      {RACE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="political-position">Political Position</Label>
                  <Select
                    value={formData.politicalPosition || ''}
                    onValueChange={(value) => updateFormData('politicalPosition', value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select political position" />
                    </SelectTrigger>
                    <SelectContent>
                      {POLITICAL_POSITION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <fieldset>
                    <legend className="text-sm font-medium">Veteran Status</legend>
                    <div className="flex items-center space-x-4" role="radiogroup" aria-label="Veteran status">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="veteran-yes"
                          checked={formData.veteranStatus === true}
                          onCheckedChange={(checked) => 
                            updateFormData('veteranStatus', checked ? true : undefined)
                          }
                          disabled={isLoading}
                          role="radio"
                          aria-checked={formData.veteranStatus === true}
                        />
                        <Label htmlFor="veteran-yes" className="text-sm">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="veteran-no"
                          checked={formData.veteranStatus === false}
                          onCheckedChange={(checked) => 
                            updateFormData('veteranStatus', checked ? false : undefined)
                          }
                          disabled={isLoading}
                          role="radio"
                          aria-checked={formData.veteranStatus === false}
                        />
                        <Label htmlFor="veteran-no" className="text-sm">No</Label>
                      </div>
                    </div>
                  </fieldset>
                </div>
              </div>
            </fieldset>

            {/* Privacy and Terms */}
            <fieldset className="space-y-4">
              <legend className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Privacy & Terms
              </legend>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="privacy-consent"
                    checked={formData.privacyConsent || false}
                    onCheckedChange={(checked) => updateFormData('privacyConsent', checked)}
                    className={errors.privacyConsent ? 'border-destructive' : ''}
                    disabled={isLoading}
                    aria-invalid={!!errors.privacyConsent}
                    aria-describedby={errors.privacyConsent ? 'privacy-error' : undefined}
                    required
                  />
                  <div className="space-y-1">
                    <Label htmlFor="privacy-consent" className="text-sm leading-relaxed">
                      I consent to the collection and use of my personal information as described in the{' '}
                      <button type="button" className="underline hover:text-primary" aria-label="Open Privacy Policy">
                        Privacy Policy
                      </button>
                      . *
                    </Label>
                    {errors.privacyConsent && (
                      <p id="privacy-error" className="text-sm text-destructive" role="alert">
                        {errors.privacyConsent}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms-accepted"
                    checked={formData.termsAccepted || false}
                    onCheckedChange={(checked) => updateFormData('termsAccepted', checked)}
                    className={errors.termsAccepted ? 'border-destructive' : ''}
                    disabled={isLoading}
                    aria-invalid={!!errors.termsAccepted}
                    aria-describedby={errors.termsAccepted ? 'terms-error' : undefined}
                    required
                  />
                  <div className="space-y-1">
                    <Label htmlFor="terms-accepted" className="text-sm leading-relaxed">
                      I agree to the{' '}
                      <button type="button" className="underline hover:text-primary" aria-label="Open Terms of Service">
                        Terms of Service
                      </button>
                      . *
                    </Label>
                    {errors.termsAccepted && (
                      <p id="terms-error" className="text-sm text-destructive" role="alert">
                        {errors.termsAccepted}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </fieldset>

            {/* Submit Button */}
            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegistrationForm;