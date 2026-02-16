import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shield, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAdminAuth } from '@/contexts/AdminAuthProvider';

const AdminLogin: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  
  const { login, isAuthenticated } = useAdminAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin');
    }
  }, [isAuthenticated, navigate]);

  // Rate limiting - block after 3 failed attempts for 5 minutes
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockEndTime, setBlockEndTime] = useState<number | null>(null);

  useEffect(() => {
    const checkBlock = () => {
      if (blockEndTime && Date.now() < blockEndTime) {
        setIsBlocked(true);
      } else {
        setIsBlocked(false);
        setBlockEndTime(null);
        setAttemptCount(0);
      }
    };

    checkBlock();
    const interval = setInterval(checkBlock, 1000);
    return () => clearInterval(interval);
  }, [blockEndTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isBlocked) {
      setError('Too many failed attempts. Please try again later.');
      return;
    }

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const success = await login(username, password);
      
      if (success) {
        // Reset attempt count on successful login
        setAttemptCount(0);
        navigate('/admin');
      } else {
        const newAttemptCount = attemptCount + 1;
        setAttemptCount(newAttemptCount);
        
        if (newAttemptCount >= 3) {
          // Block for 5 minutes after 3 failed attempts
          const blockTime = Date.now() + (5 * 60 * 1000);
          setBlockEndTime(blockTime);
          setIsBlocked(true);
          setError('Too many failed attempts. Access blocked for 5 minutes.');
        } else {
          setError(`Invalid credentials. ${3 - newAttemptCount} attempts remaining.`);
        }
        
        // Clear password field
        setPassword('');
      }
    } catch (error) {
      setError('An error occurred during login. Please try again.');
      console.error('Admin login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getBlockTimeRemaining = (): string => {
    if (!blockEndTime) return '';
    const remaining = Math.ceil((blockEndTime - Date.now()) / 1000);
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-strong">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Admin Access</CardTitle>
            <p className="text-muted-foreground">
              Enter your credentials to access the admin dashboard
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {isBlocked && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Access blocked. Time remaining: {getBlockTimeRemaining()}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  disabled={isLoading || isBlocked}
                  autoComplete="username"
                  className="transition-smooth"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    disabled={isLoading || isBlocked}
                    autoComplete="current-password"
                    className="pr-10 transition-smooth"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading || isBlocked}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || isBlocked}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="text-muted-foreground hover:text-foreground"
              >
                ← Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="mt-4 text-center text-xs text-muted-foreground">
          <p>This is a secure admin area. All access attempts are logged.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;