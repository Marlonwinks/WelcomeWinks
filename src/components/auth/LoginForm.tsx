import React, { useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthProvider';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Alert, AlertDescription } from '../ui/alert';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

interface LoginFormProps {
  onSuccess: (user: FirebaseUser) => void;
  onCancel: () => void;
  onForgotPassword: () => void;
  onSignUp?: () => void;
}

interface LoginData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

const defaultLoginData: LoginData = {
  email: '',
  password: '',
  rememberMe: false
};

export function LoginForm({ onSuccess, onCancel, onForgotPassword, onSignUp }: LoginFormProps) {
  const { signIn } = useAuth();
  const [loginData, setLoginData] = useState<LoginData>(defaultLoginData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Email validation
    if (!loginData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(loginData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!loginData.password) {
      newErrors.password = 'Password is required';
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
      const appUser = await signIn(loginData.email, loginData.password);
      
      // Handle "remember me" functionality
      if (loginData.rememberMe) {
        // Store email in localStorage for convenience
        localStorage.setItem('welcomeWinks_rememberedEmail', loginData.email);
      } else {
        localStorage.removeItem('welcomeWinks_rememberedEmail');
      }
      
      // Create a mock Firebase user object for the callback
      // In a real implementation, this would come from the auth context
      const firebaseUser = {
        uid: appUser.uid,
        email: appUser.email,
        emailVerified: appUser.emailVerified
      } as FirebaseUser;
      
      onSuccess(firebaseUser);
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle specific authentication errors
      let errorMessage = 'Failed to sign in. Please try again.';
      
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes('user-not-found')) {
          errorMessage = 'No account found with this email address.';
        } else if (message.includes('wrong-password') || message.includes('invalid-credential')) {
          errorMessage = 'Incorrect password. Please try again.';
        } else if (message.includes('too-many-requests')) {
          errorMessage = 'Too many failed attempts. Please try again later.';
        } else if (message.includes('network')) {
          errorMessage = 'Network error. Please check your connection.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof LoginData, value: any) => {
    setLoginData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific errors when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Load remembered email on component mount
  React.useEffect(() => {
    const rememberedEmail = localStorage.getItem('welcomeWinks_rememberedEmail');
    if (rememberedEmail) {
      setLoginData(prev => ({ ...prev, email: rememberedEmail, rememberMe: true }));
    }
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Welcome Back</CardTitle>
        <CardDescription>
          Sign in to your Welcome Winks account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* General Error */}
          {errors.general && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={loginData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="your.email@example.com"
              className={errors.email ? 'border-red-500' : ''}
              disabled={loading}
              autoComplete="email"
              required
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={loginData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Enter your password"
                className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                disabled={loading}
                autoComplete="current-password"
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
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          {/* Remember Me and Forgot Password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rememberMe"
                checked={loginData.rememberMe}
                onCheckedChange={(checked) => handleInputChange('rememberMe', checked)}
                disabled={loading}
              />
              <Label htmlFor="rememberMe" className="text-sm">
                Remember me
              </Label>
            </div>
            
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={onForgotPassword}
              disabled={loading}
              className="px-0 h-auto text-sm"
            >
              Forgot password?
            </Button>
          </div>

          {/* Form Actions */}
          <div className="space-y-3">
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              
              {onSignUp && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onSignUp}
                  disabled={loading}
                  className="flex-1"
                >
                  Create Account
                </Button>
              )}
            </div>
          </div>

          {/* Additional Help */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              {onSignUp ? (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={onSignUp}
                  disabled={loading}
                  className="px-0 h-auto text-sm"
                >
                  Sign up here
                </Button>
              ) : (
                <span className="text-blue-600">Contact support for help</span>
              )}
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Password Reset Form Component
interface PasswordResetFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialEmail?: string;
}

export function PasswordResetForm({ onSuccess, onCancel, initialEmail = '' }: PasswordResetFormProps) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email is required');
      return;
    }
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (error) {
      console.error('Password reset error:', error);
      setError(error instanceof Error ? error.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Check Your Email</CardTitle>
          <CardDescription>
            We've sent a password reset link to {email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                If you don't see the email in your inbox, check your spam folder.
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-2">
              <Button onClick={onSuccess} className="flex-1">
                Back to Login
              </Button>
              <Button
                variant="outline"
                onClick={() => setSuccess(false)}
                className="flex-1"
              >
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
        <CardDescription>
          Enter your email address and we'll send you a link to reset your password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="resetEmail">Email Address</Label>
            <Input
              id="resetEmail"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="your.email@example.com"
              disabled={loading}
              autoComplete="email"
              required
            />
          </div>

          <div className="flex gap-2">
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
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}