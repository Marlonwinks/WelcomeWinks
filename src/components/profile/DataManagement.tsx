import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Download,
  Trash2,
  AlertTriangle,
  Shield,
  FileText,
  Loader2,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ratingsService } from '@/services/ratings.service';

interface DataExportResult {
  profile: any;
  ratings: any[];
  preferences: any;
  activityLog: any[];
  exportDate: string;
  accountType: string;
}

interface AccountDeletionConfirmation {
  confirmText: string;
  understandDataLoss: boolean;
  understandPermanent: boolean;
  reason?: string;
}

export const DataManagement: React.FC = () => {
  const { userProfile, getCurrentAccount } = useAuth();
  const { toast } = useToast();

  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletionConfirm, setDeletionConfirm] = useState<AccountDeletionConfirmation>({
    confirmText: '',
    understandDataLoss: false,
    understandPermanent: false,
    reason: ''
  });

  const currentAccount = getCurrentAccount();
  const isCookieAccount = currentAccount.type === 'cookie';

  const handleDataExport = async () => {
    if (!userProfile) return;

    setIsExporting(true);
    try {
      // Use the centralized export service
      const { profileService } = await import('@/services/profile.service');
      const exportData = await profileService.exportUserData(userProfile.userId);

      // Create and download JSON file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `welcome-winks-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Data Export Complete",
        description: "Your data has been exported and downloaded successfully.",
      });

    } catch (error) {
      console.error('Failed to export data:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export your data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleAccountDeletion = async () => {
    if (!userProfile) return;

    // Validate confirmation
    const expectedText = isCookieAccount ? 'DELETE TEMPORARY ACCOUNT' : 'DELETE MY ACCOUNT';
    if (deletionConfirm.confirmText !== expectedText) {
      toast({
        title: "Confirmation Required",
        description: `Please type "${expectedText}" to confirm deletion.`,
        variant: "destructive"
      });
      return;
    }

    if (!deletionConfirm.understandDataLoss || !deletionConfirm.understandPermanent) {
      toast({
        title: "Confirmation Required",
        description: "Please confirm that you understand the consequences of account deletion.",
        variant: "destructive"
      });
      return;
    }

    setIsDeleting(true);
    try {
      // Import the profile service
      const { profileService } = await import('@/services/profile.service');

      // Delete account and all associated data
      await profileService.deleteAccount(userProfile.userId, {
        reason: deletionConfirm.reason,
        confirmedAt: new Date(),
        userAgent: navigator.userAgent
      });

      toast({
        title: "Account Deleted",
        description: "Your account and all associated data have been permanently deleted.",
      });

      // Redirect to home page after deletion
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);

    } catch (error) {
      console.error('Failed to delete account:', error);
      toast({
        title: "Deletion Failed",
        description: "Failed to delete your account. Please try again or contact support.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const resetDeletionForm = () => {
    setDeletionConfirm({
      confirmText: '',
      understandDataLoss: false,
      understandPermanent: false,
      reason: ''
    });
  };

  if (!userProfile) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading data management options...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Your Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Download a complete copy of your personal data, including your profile information,
            business ratings, preferences, and activity history. This data is provided in JSON format.
          </p>

          <div className="space-y-2">
            <h4 className="font-medium">Your data includes:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Profile information and preferences</li>
              <li>• Business ratings and survey responses</li>
              <li>• Account activity history (anonymized)</li>
              <li>• Privacy and consent settings</li>
            </ul>
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Privacy Protection:</strong> IP addresses in the export are partially anonymized
              and precise location data is removed to protect your privacy.
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleDataExport}
            disabled={isExporting}
            className="w-full"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Preparing Export...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export My Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Account Type</Label>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={isCookieAccount ? "secondary" : "default"}>
                  {isCookieAccount ? "Temporary Account" : "Full Account"}
                </Badge>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Account Created</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(userProfile.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium">Last Updated</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(userProfile.updatedAt).toLocaleDateString()}
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium">Data Retention</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {isCookieAccount ? "45 days from last activity" : "Permanent until deleted"}
              </p>
            </div>
          </div>

          {isCookieAccount && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>Temporary Account:</strong> Your data will be automatically deleted after 45 days
                of inactivity. Consider creating a full account to preserve your information permanently.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Account Deletion */}
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-destructive/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Account deletion is permanent and cannot be undone.
              All your data, including ratings and preferences, will be permanently deleted.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h4 className="font-medium">What will be deleted:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Your profile and personal information</li>
              <li>• All business ratings and survey responses</li>
              <li>• Account preferences and settings</li>
              <li>• Activity history and IP address records</li>
              {!isCookieAccount && <li>• Your email and login credentials</li>}
            </ul>
          </div>

          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full"
                onClick={resetDeletionForm}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete {isCookieAccount ? 'Temporary' : 'My'} Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Confirm Account Deletion
                </DialogTitle>
                <DialogDescription>
                  This action cannot be undone. Please confirm that you want to permanently
                  delete your account and all associated data.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="confirm-text">
                    Type "{isCookieAccount ? 'DELETE TEMPORARY ACCOUNT' : 'DELETE MY ACCOUNT'}" to confirm:
                  </Label>
                  <Input
                    id="confirm-text"
                    value={deletionConfirm.confirmText}
                    onChange={(e) => setDeletionConfirm(prev => ({
                      ...prev,
                      confirmText: e.target.value
                    }))}
                    placeholder={isCookieAccount ? 'DELETE TEMPORARY ACCOUNT' : 'DELETE MY ACCOUNT'}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="understand-loss"
                      checked={deletionConfirm.understandDataLoss}
                      onCheckedChange={(checked) => setDeletionConfirm(prev => ({
                        ...prev,
                        understandDataLoss: checked as boolean
                      }))}
                    />
                    <Label htmlFor="understand-loss" className="text-sm">
                      I understand that all my data will be permanently deleted
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="understand-permanent"
                      checked={deletionConfirm.understandPermanent}
                      onCheckedChange={(checked) => setDeletionConfirm(prev => ({
                        ...prev,
                        understandPermanent: checked as boolean
                      }))}
                    />
                    <Label htmlFor="understand-permanent" className="text-sm">
                      I understand this action cannot be undone
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deletion-reason">
                    Reason for deletion (optional):
                  </Label>
                  <Input
                    id="deletion-reason"
                    value={deletionConfirm.reason}
                    onChange={(e) => setDeletionConfirm(prev => ({
                      ...prev,
                      reason: e.target.value
                    }))}
                    placeholder="Help us improve by sharing why you're leaving"
                  />
                </div>
              </div>

              <DialogFooter className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteDialog(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleAccountDeletion}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
};