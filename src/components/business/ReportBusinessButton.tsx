import React, { useState } from 'react';
import { Flag, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { reportsService, ReportSubmission, BusinessReport } from '@/services/reports.service';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/components/ui/use-toast';

interface ReportBusinessButtonProps {
  businessId: string;
  businessName: string;
  className?: string;
}

const ReportBusinessButton: React.FC<ReportBusinessButtonProps> = ({
  businessId,
  businessName,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState<BusinessReport['reason'] | ''>('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasReported, setHasReported] = useState(false);

  const { user, userProfile } = useAuth();

  // Check if user has already reported this business
  React.useEffect(() => {
    if (isOpen && user?.uid) {
      checkExistingReport();
    }
  }, [isOpen, user?.uid]);

  const checkExistingReport = async () => {
    try {
      const userId = user?.uid;
      if (!userId) return;

      const hasReported = await reportsService.hasUserReportedBusiness(businessId, userId);
      setHasReported(hasReported);
    } catch (error) {
      console.warn('Failed to check existing report:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason || !description.trim()) {
      setError('Please select a reason and provide a description.');
      return;
    }

    if (description.trim().length < 10) {
      setError('Please provide a more detailed description (at least 10 characters).');
      return;
    }

    const userId = user?.uid;
    if (!userId) {
      setError('You must be registered and logged in to submit a report.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      console.log('🔐 Authentication state:', {
        userId,
        accountType: userProfile?.accountType || 'unknown',
        hasUser: !!user,
        hasUserProfile: !!userProfile
      });

      const reportData: ReportSubmission = {
        businessId,
        businessName,
        reason,
        description: description.trim()
      };

      const accountType = userProfile?.accountType || 'full';
      const userEmail = user?.email;

      await reportsService.submitReport(
        reportData,
        userId,
        accountType,
        userEmail
      );

      setSuccess(true);
      setHasReported(true);

      // Reset form
      setReason('');
      setDescription('');

      // Close dialog after 2 seconds
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
      }, 2000);

    } catch (error) {
      console.error('Failed to submit report:', error);
      setError('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setReason('');
    setDescription('');
    setError(null);
    setSuccess(false);
  };

  const reasonOptions = [
    { value: 'fake_reviews', label: 'Fake Reviews', description: 'This business has fake or manipulated reviews' },
    { value: 'spam_reviews', label: 'Spam Reviews', description: 'Multiple spam reviews from same users/IPs' }
  ];

  const { toast } = useToast();

  const handleOpenReport = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to report a business.",
        variant: "destructive",
      });
      return;
    }
    setIsOpen(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Only allow closing via onOpenChange, opening is handled manually
      if (!open) {
        setIsOpen(false);
        resetForm();
      }
    }}>
      <Button
        variant="outline"
        size="sm"
        className={`flex items-center gap-2 ${className}`}
        onClick={handleOpenReport}
      >
        <Flag className="h-4 w-4" />
        Report
      </Button>

      {/* Dialog Content only renders when open, so trigger isn't strictly needed if we control open state */}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-red-500" />
            Report Business
          </DialogTitle>
        </DialogHeader>

        {hasReported ? (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You have already reported this business. Our team will review your report.
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => setIsOpen(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        ) : success ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Thank you for your report. Our team will review it and take appropriate action.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Business: {businessName}</Label>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Report *</Label>
              <Select value={reason} onValueChange={(value) => setReason(value as BusinessReport['reason'])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {reasonOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Please provide details about the issue..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={500}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                {description.length}/500 characters (minimum 10)
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !reason || description.trim().length < 10}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  'Submit Report'
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Reports are reviewed by our moderation team. False reports may result in account restrictions.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReportBusinessButton;