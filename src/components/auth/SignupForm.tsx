import React, { useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthProvider';
import { RegistrationData, UserPreferences } from '../../types/firebase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface SignupFormProps {
  onSuccess: (user: FirebaseUser) => void;
  onCancel: () => void;
  initialData?: Partial<RegistrationData>;
}

interface FormData extends Omit<RegistrationData, 'preferences'> {
  confirmPassword: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  privacyConsent?: string;
  termsAccepted?: string;
  general?: string;
}

const defaultFormData: FormData = {
  email: '',
  password: '',
  confirmPassword: '',
  name: '',
  location: '',
  gender: '',
  race: '',
  veteranStatus: false,
  politicalPosition: '',
  privacyConsent: false,
  termsAccepted: false
};

export function SignupForm({ onSuccess, onCancel, initialData }: SignupFormProps) {
  const { signUp } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    ...defaultFormData,
    ...initialData
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password strength validation
  const validatePasswordStrength = (password: string): string[] => {
    const issues: string[] = [];
    if (password.length < 8) issues.push('At least 8 characters');
    if (!/[A-Z]/.test(password)) issues.push('One uppercase letter');
    if (!/[a-z]/.test(password)) issues.push('One lowercase letter');
    if (!/\d/.test(password)) issues.push('One number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) issues.push('One special character');
    return issues;
  };

  // Email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordIssues = validatePasswordStrength(formData.password);
      if (passwordIssues.length > 0) {
        newErrors.password = `Password must have: ${passwordIssues.join(', ')}`;
      }
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Privacy consent validation
    if (!formData.privacyConsent) {
      newErrors.privacyConsent = 'You must accept the privacy policy to continue';
    }

    // Terms validation
    if (!formData.termsAccepted) {
      newErrors.termsAccepted = 'You must accept the terms of service to continue';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Prepare registration data
      const registrationData: RegistrationData = {
        email: formData.email,
        password: formData.password,
        name: formData.name || undefined,
        location: formData.location || undefined,
        gender: formData.gender || undefined,
        race: formData.race || undefined,
        veteranStatus: formData.veteranStatus,
        politicalPosition: formData.politicalPosition || undefined,
        privacyConsent: formData.privacyConsent,
        termsAccepted: formData.termsAccepted
      };

      const appUser = await signUp(registrationData);
      
      // Call success callback with Firebase user
      // Note: We need to get the Firebase user from auth state
      // For now, we'll create a mock Firebase user object
      const firebaseUser = {
        uid: appUser.uid,
        email: appUser.email,
        emailVerified: appUser.emailVerified
      } as FirebaseUser;
      
      onSuccess(firebaseUser);
    } catch (error) {
      console.error('Signup error:', error);
      setErrors({
        general: error instanceof Error ? error.message : 'Failed to create account. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific errors when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const passwordStrengthIssues = formData.password ? validatePasswordStrength(formData.password) : [];
  const isPasswordStrong = passwordStrengthIssues.length === 0 && formData.password.length > 0;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create Your Account</CardTitle>
        <CardDescription>
          Join Welcome Winks to save your preferences and contribute to the community
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Error */}
          {errors.general && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Required Fields Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Account Information</h3>
            
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="your.email@example.com"
                className={errors.email ? 'border-red-500' : ''}
                disabled={loading}
                required
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Create a strong password"
                  className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                  disabled={loading}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {/* Password strength indicator */}
              {formData.password && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {isPasswordStrong ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                    )}
                    <span className={`text-sm ${isPasswordStrong ? 'text-green-600' : 'text-orange-500'}`}>
                      {isPasswordStrong ? 'Strong password' : 'Password requirements:'}
                    </span>
                  </div>
                  {!isPasswordStrong && (
                    <ul className="text-sm text-gray-600 ml-6 space-y-1">
                      {passwordStrengthIssues.map((issue, index) => (
                        <li key={index}>• {issue}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Confirm your password"
                  className={errors.confirmPassword ? 'border-red-500 pr-10' : 'pr-10'}
                  disabled={loading}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Optional Demographic Fields */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Personal Information (Optional)</h3>
            <p className="text-sm text-gray-600">
              This information helps us provide better recommendations and insights.
            </p>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Your full name"
                disabled={loading}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="City, State"
                disabled={loading}
              />
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => handleInputChange('gender', value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="non-binary">Non-binary</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Race */}
            <div className="space-y-2">
              <Label htmlFor="race">Race/Ethnicity</Label>
              <Select
                value={formData.race}
                onValueChange={(value) => handleInputChange('race', value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select race/ethnicity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="white">White</SelectItem>
                  <SelectItem value="black">Black or African American</SelectItem>
                  <SelectItem value="hispanic">Hispanic or Latino</SelectItem>
                  <SelectItem value="asian">Asian</SelectItem>
                  <SelectItem value="native-american">Native American</SelectItem>
                  <SelectItem value="pacific-islander">Pacific Islander</SelectItem>
                  <SelectItem value="mixed">Mixed Race</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Veteran Status */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="veteranStatus"
                checked={formData.veteranStatus}
                onCheckedChange={(checked) => handleInputChange('veteranStatus', checked)}
                disabled={loading}
              />
              <Label htmlFor="veteranStatus">I am a military veteran</Label>
            </div>

            {/* Political Position */}
            <div className="space-y-2">
              <Label htmlFor="politicalPosition">Political Position</Label>
              <Select
                value={formData.politicalPosition}
                onValueChange={(value) => handleInputChange('politicalPosition', value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select political position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="very-liberal">Very Liberal</SelectItem>
                  <SelectItem value="liberal">Liberal</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="conservative">Conservative</SelectItem>
                  <SelectItem value="very-conservative">Very Conservative</SelectItem>
                  <SelectItem value="libertarian">Libertarian</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>


          {/* Legal Agreements */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Legal Agreements</h3>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="privacyConsent"
                  checked={formData.privacyConsent}
                  onCheckedChange={(checked) => handleInputChange('privacyConsent', checked)}
                  disabled={loading}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <Label htmlFor="privacyConsent" className="text-sm">
                    I agree to the <a href="/privacy" className="text-blue-600 hover:underline" target="_blank">Privacy Policy</a> *
                  </Label>
                  {errors.privacyConsent && (
                    <p className="text-sm text-red-600">{errors.privacyConsent}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="termsAccepted"
                  checked={formData.termsAccepted}
                  onCheckedChange={(checked) => handleInputChange('termsAccepted', checked)}
                  disabled={loading}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <Label htmlFor="termsAccepted" className="text-sm">
                    I agree to the <a href="/terms" className="text-blue-600 hover:underline" target="_blank">Terms of Service</a> *
                  </Label>
                  {errors.termsAccepted && (
                    <p className="text-sm text-red-600">{errors.termsAccepted}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}