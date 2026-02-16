# Firebase Deployment Instructions

## Deploy Firestore Rules

To fix the notification permission errors, you need to deploy the updated Firestore rules:

### Option 1: Using Firebase CLI (Recommended)

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Set the active project**:
   ```bash
   firebase use angelic-ivy-411103
   ```

4. **Deploy the Firestore rules**:
   ```bash
   firebase deploy --only firestore:rules
   ```

### Option 2: Using Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `angelic-ivy-411103`
3. Navigate to **Firestore Database** → **Rules**
4. Copy the contents of `firestore.rules` file
5. Paste it into the rules editor
6. Click **Publish**

## What the Rules Do

The updated Firestore rules include:

- **Notifications Collection**: Users can read/write their own notifications
- **Scoring Configs Collection**: Anyone can read, only admins can write
- **Proper Security**: Ensures users can only access their own data

## Current Status

The notification system is currently working with **mock notifications** as a fallback when Firestore rules aren't deployed. Once the rules are deployed, the system will automatically switch to real Firestore notifications.

## Verification

After deploying the rules, you should see:
- Real notifications instead of mock ones
- No permission errors in the console
- Notifications persist between sessions
- Real-time updates work properly
