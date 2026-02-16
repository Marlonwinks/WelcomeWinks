import React, { useState } from 'react';
import { UserPlus, ArrowRight, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { LoginForm, PasswordResetForm } from '../auth/LoginForm';
import { SignupForm } from '../auth/SignupForm';
import { useAuth } from '../../contexts/AuthProvider';

interface AccountStepProps {
  onAccountCreated?: () => void;
  onSkip?: () => void;
  className?: string;
}

type AccountView = 'options' | 'login' | 'signup' | 'forgot-password';

export const AccountStep: React.FC<AccountStepProps> = ({
  onAccountCreated,
  onSkip,
  className = '',
}) => {
  const [currentView, setCurrentView] = useState<AccountView>('options');
  const [isLoading, setIsLoading] = useState(false);
  const { getCurrentAccount } = useAuth();
  const handleAccountSuccess = () => {
    setIsLoading(false);
    onAccountCreated?.();
  };

  const handleSkip = () => {
    onSkip?.();
  };

  const handleBackToOptions = () => {
    setCurrentView('options');
    setIsLoading(false);
  };

  // If user already has an account, skip this step
  const currentAccount = getCurrentAccount();

  React.useEffect(() => {
    if (currentAccount.type === 'full') {
      onAccountCreated?.();
    }
  }, [currentAccount.type, onAccountCreated]);

  if (currentAccount.type === 'full') {
    return null;
  }

  if (currentView === 'forgot-password') {
    return (
      <Card className={`w-full max-w-md mx-auto ${className}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Reset Password</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentView('login')}
              aria-label="Back to login"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <PasswordResetForm
            onSuccess={() => setCurrentView('login')}
            onCancel={() => setCurrentView('login')}
          />
        </CardContent>
      </Card>
    );
  }

  if (currentView === 'login') {
    return (
      <Card className={`w-full max-w-md mx-auto ${className}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Sign In</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToOptions}
              aria-label="Back to account options"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <LoginForm
            onSuccess={handleAccountSuccess}
            onCancel={handleBackToOptions}
            onForgotPassword={() => setCurrentView('forgot-password')}
            onSignUp={() => setCurrentView('signup')}
          />
          <div className="mt-4 pt-4 border-t space-y-2">
            <Button
              variant="ghost"
              onClick={() => setCurrentView('signup')}
              className="w-full"
            >
              Need an account? Sign up here
            </Button>
            <Button
              variant="outline"
              onClick={handleSkip}
              className="w-full"
            >
              Continue Without Account
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (currentView === 'signup') {
    return (
      <Card className={`w-full max-w-md mx-auto ${className}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Create Account</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToOptions}
              aria-label="Back to account options"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <SignupForm
            onSuccess={handleAccountSuccess}
            onCancel={handleBackToOptions}
          />
          <div className="mt-4 pt-4 border-t space-y-2">
            <Button
              variant="ghost"
              onClick={() => setCurrentView('login')}
              className="w-full"
            >
              Already have an account? Sign in here
            </Button>
            <Button
              variant="outline"
              onClick={handleSkip}
              className="w-full"
            >
              Continue Without Account
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default options view
  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserPlus className="w-8 h-8 text-primary" />
        </div>
        <CardTitle>Save Your Progress</CardTitle>
        <p className="text-muted-foreground">
          Create an account to save your ratings and get personalized recommendations, or continue without one.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Account Benefits */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm">With an account, you can:</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
              <span>Save your ratings and see your contribution history</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
              <span>Get personalized business recommendations</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
              <span>Sync your preferences across devices</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
              <span>Connect with the welcoming community</span>
            </div>
          </div>
        </div>

        {/* Account Options */}
        <div className="space-y-3 pt-4">
          <Button
            onClick={() => setCurrentView('signup')}
            className="w-full h-12"
            size="lg"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Create Free Account
          </Button>

          <Button
            variant="outline"
            onClick={() => setCurrentView('login')}
            className="w-full h-12"
            size="lg"
          >
            Sign In to Existing Account
          </Button>
        </div>

        {/* Skip Option */}
        <div className="pt-4 border-t">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Optional
              </Badge>
              <span className="text-sm text-muted-foreground">
                No account required
              </span>
            </div>
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="w-full"
            >
              Continue Without Account
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};