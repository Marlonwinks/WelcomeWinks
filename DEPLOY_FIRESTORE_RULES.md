# Deploy Firestore Rules for Reporting System

## Issue
The business reporting system is failing with "Missing or insufficient permissions" because the Firestore security rules don't include permissions for the `businessReports` collection.

## Solution
The Firestore rules have been updated to include proper permissions for business reports. You need to deploy these updated rules to Firebase.

## Deployment Steps

### Option 1: Firebase CLI (Recommended)
```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase (if not already logged in)
firebase login

# Deploy only the Firestore rules
firebase deploy --only firestore:rules

# Or deploy everything (rules and indexes)
firebase deploy --only firestore
```

### Option 2: Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`angelic-ivy-411103`)
3. Navigate to **Firestore Database**
4. Click on the **Rules** tab
5. Copy the contents of `firestore.rules` from your project
6. Paste into the Firebase Console rules editor
7. Click **Publish**

## Updated Rules Summary

**⚠️ TEMPORARY TESTING RULES**
The `businessReports` collection is currently set to allow all operations for testing purposes. This should be made more restrictive in production.

### Current (Testing) Rules:
- **All users can create, read, and update reports**
- **No authentication required** (for testing)
- **All operations allowed** (for debugging)

### Future (Production) Rules:
The commented code in the rules file shows the intended production security:
- Users can only create reports with proper validation
- Users can only read their own reports
- Admins can read and manage all reports
- No one can delete reports (audit trail)
- Strict validation on all fields

## Validation Rules

Reports must include:
- Valid business ID and name
- Reporter information (user ID, account type)
- Valid reason (from predefined list)
- Description (minimum 10 characters)
- Proper severity level
- Initial status must be 'pending'
- Timestamps for creation and updates

## Testing After Deployment

1. **Try submitting a report** from a business page
2. **Check browser console** for any remaining errors
3. **Verify in Firebase Console** that reports are being created
4. **Test admin access** in the admin dashboard

## Troubleshooting

### If deployment fails:
- Check that you're logged into the correct Firebase project
- Verify you have admin permissions on the Firebase project
- Try deploying with `--debug` flag for more details

### If reports still fail after deployment:
- Check browser console for specific error messages
- Verify user authentication is working
- Check that the Firebase project ID matches in your config
- Wait a few minutes for rules to propagate globally

## Security Notes

**⚠️ IMPORTANT: TEMPORARY TESTING CONFIGURATION**

The current rules are **TEMPORARILY OPEN** for testing purposes. Before going to production:

1. **Replace the temporary rules** with the commented secure rules
2. **Test authentication** with different user types
3. **Verify admin-only operations** work correctly
4. **Enable proper validation** on all fields

### Production Security Features (Currently Disabled):
- Input validation on all report fields
- User isolation (users can only see their own reports)
- Admin-only management operations
- Audit trail protection (no deletions)
- Proper authentication requirements

### To Enable Production Security:
1. Uncomment the detailed rules in `firestore.rules`
2. Remove the `allow read, write: if true;` line
3. Test thoroughly with different user types
4. Deploy the updated rules