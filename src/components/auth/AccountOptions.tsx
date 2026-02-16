import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthProvider';
import { UserGoal } from '../../types/onboarding';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  User, 
  Clock, 
  X, 
  Shield, 
  Database, 
  Trash2, 
  Download,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';

interface AccountOptionsProps {
  completedGoal: UserGoal;
  onFullAccount: () => void;
  onCookieAccount: () => void;
  onDecline: () => void;
  onClose?: () => void;
}

interface AccountOption {
  type: 'full' | 'cookie' | 'decline';
  title: string;
  description: string;
  benefits: string[];
  dataRetention: string;
  icon: React.ComponentType<{ className?: string }>;
  buttonText: string;
  buttonVariant: 'default' | 'secondary' | 'outline';
  recommended?: boolean;
}

const getGoalSpecificBenefits = (goal: UserGoal) => {
  const baseBenefits = {
    full: [
      'Save your ratings and preferences permanently',
      'Access your data from any device',
      'Receive personalized recommendations',
      'Contribute to community insights',
      'Export your data anytime'
    ],
    cookie: [
      'Save your ratings for 45 days',
      'No email required',
      'Quick and easy setup',
      'Automatic data cleanup',
      'Can upgrade to full account later'
    ],
    decline: [
      'Use the app without any account',
      'Your data is saved locally for 45 days',
      'No personal information collected',
      'Complete privacy',
      'Can create account later if needed'
    ]
  };

  const goalSpecificBenefits = {
    'mark-business': {
      full: ['Track all businesses you\'ve rated', 'See your rating history and impact'],
      cookie: ['Remember businesses you\'ve rated this session', 'Quick rating without signup'],
      decline: ['Rate businesses anonymously', 'No commitment required']
    },
    'find-welcoming': {
      full: ['Get personalized business recommendations', 'Save favorite welcoming places'],
      cookie: ['Remember your search preferences', 'Quick discovery without signup'],
      decline: ['Browse welcoming businesses freely', 'No tracking of your searches']
    }
  };

  return {
    full: [...baseBenefits.full, ...goalSpecificBenefits[goal].full],
    cookie: [...baseBenefits.cookie, ...goalSpecificBenefits[goal].cookie],
    decline: [...baseBenefits.decline, ...goalSpecificBenefits[goal].decline]
  };
};

export function AccountOptions({ completedGoal, onFullAccount, onCookieAccount, onDecline, onClose }: AccountOptionsProps) {
  const { createCookieAccount } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const goalBenefits = getGoalSpecificBenefits(completedGoal);

  const accountOptions: AccountOption[] = [
    {
      type: 'full',
      title: 'Create Full Account',
      description: 'Get the complete Welcome Winks experience with permanent data storage and personalized features.',
      benefits: goalBenefits.full,
      dataRetention: 'Your data is stored permanently and securely. You can export or delete it anytime.',
      icon: User,
      buttonText: 'Create Account',
      buttonVariant: 'default',
      recommended: true
    },
    {
      type: 'cookie',
      title: 'Use Temporary Account',
      description: 'Quick setup with 45-day data storage. Perfect for trying out the app without commitment.',
      benefits: goalBenefits.cookie,
      dataRetention: 'Your data is stored for 45 days from your last activity, then automatically deleted.',
      icon: Clock,
      buttonText: 'Use Temporary Account',
      buttonVariant: 'secondary'
    },
    {
      type: 'decline',
      title: 'Continue Without Account',
      description: 'Use the app with maximum privacy. Your data is saved locally and cleaned up automatically.',
      benefits: goalBenefits.decline,
      dataRetention: 'Data is stored locally on your device for 45 days, then automatically removed.',
      icon: X,
      buttonText: 'Continue Without Account',
      buttonVariant: 'outline'
    }
  ];

  const handleOptionSelect = async (option: AccountOption) => {
    setLoading(option.type);
    setError(null);

    try {
      switch (option.type) {
        case 'full':
          onFullAccount();
          break;
        case 'cookie':
          await createCookieAccount();
          onCookieAccount();
          break;
        case 'decline':
          // Create cookie account automatically but don't show it to user
          await createCookieAccount();
          onDecline();
          break;
      }
    } catch (err) {
      console.error('Account option selection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to set up account. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const getGoalDisplayName = (goal: UserGoal): string => {
    switch (goal) {
      case 'mark-business':
        return 'rating businesses';
      case 'find-welcoming':
        return 'finding welcoming places';
      default:
        return 'using the app';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Choose Your Account Type</h2>
              <p className="text-gray-600 mt-1">
                Great job {getGoalDisplayName(completedGoal)}! Now choose how you'd like to save your progress.
              </p>
            </div>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Account Options */}
          <div className="grid gap-6 md:grid-cols-3">
            {accountOptions.map((option) => {
              const Icon = option.icon;
              const isLoading = loading === option.type;
              
              return (
                <Card 
                  key={option.type} 
                  className={`relative transition-all duration-200 hover:shadow-lg ${
                    option.recommended ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  {option.recommended && (
                    <Badge className="absolute -top-2 left-4 bg-blue-500">
                      Recommended
                    </Badge>
                  )}
                  
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        option.type === 'full' ? 'bg-blue-100 text-blue-600' :
                        option.type === 'cookie' ? 'bg-orange-100 text-orange-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{option.title}</CardTitle>
                      </div>
                    </div>
                    <CardDescription className="text-sm">
                      {option.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Benefits */}
                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Benefits
                      </h4>
                      <ul className="space-y-1">
                        {option.benefits.map((benefit, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-green-600 mt-1">•</span>
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Data Retention */}
                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <Database className="h-4 w-4 text-blue-600" />
                        Data Storage
                      </h4>
                      <p className="text-sm text-gray-600">{option.dataRetention}</p>
                    </div>

                    {/* Privacy Features */}
                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-purple-600" />
                        Privacy
                      </h4>
                      <div className="space-y-1">
                        {option.type === 'full' && (
                          <>
                            <p className="text-sm text-gray-600 flex items-center gap-2">
                              <Download className="h-3 w-3" />
                              Export your data anytime
                            </p>
                            <p className="text-sm text-gray-600 flex items-center gap-2">
                              <Trash2 className="h-3 w-3" />
                              Delete your account anytime
                            </p>
                          </>
                        )}
                        {option.type === 'cookie' && (
                          <>
                            <p className="text-sm text-gray-600 flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              Auto-expires after 45 days
                            </p>
                            <p className="text-sm text-gray-600 flex items-center gap-2">
                              <User className="h-3 w-3" />
                              Upgrade to full account later
                            </p>
                          </>
                        )}
                        {option.type === 'decline' && (
                          <>
                            <p className="text-sm text-gray-600 flex items-center gap-2">
                              <Shield className="h-3 w-3" />
                              Maximum privacy protection
                            </p>
                            <p className="text-sm text-gray-600 flex items-center gap-2">
                              <Trash2 className="h-3 w-3" />
                              Auto-cleanup after 45 days
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button
                      onClick={() => handleOptionSelect(option)}
                      disabled={loading !== null}
                      variant={option.buttonVariant}
                      className="w-full mt-4"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                          Setting up...
                        </>
                      ) : (
                        option.buttonText
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Additional Information */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="space-y-2">
                <h4 className="font-medium text-blue-900">Good to Know</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• You can always upgrade from a temporary account to a full account later</li>
                  <li>• All account types follow the same privacy and security standards</li>
                  <li>• Your ratings and contributions help make the community better for everyone</li>
                  <li>• We never sell your personal data or share it with third parties</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              By continuing, you agree to our{' '}
              <a href="/terms" className="text-blue-600 hover:underline" target="_blank">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-blue-600 hover:underline" target="_blank">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}