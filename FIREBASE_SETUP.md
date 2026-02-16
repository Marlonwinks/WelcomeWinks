# Firebase Setup Guide

This guide explains how to set up Firebase for the Welcome Winks application.

## Prerequisites

1. A Google account
2. Access to the [Firebase Console](https://console.firebase.google.com/)

## Step 1: Create Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name (e.g., "welcome-winks")
4. Choose whether to enable Google Analytics (recommended)
5. Select or create a Google Analytics account if enabled
6. Click "Create project"

## Step 2: Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable "Email/Password" authentication
5. Optionally enable "Email link (passwordless sign-in)"

## Step 3: Create Firestore Database

1. Go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (we'll update security rules later)
4. Select a location for your database (choose closest to your users)
5. Click "Done"

## Step 4: Get Firebase Configuration

1. Go to "Project settings" (gear icon in left sidebar)
2. Scroll down to "Your apps" section
3. Click "Add app" and select the web icon (</>)
4. Register your app with a nickname (e.g., "welcome-winks-web")
5. Copy the Firebase configuration object

## Step 5: Update Environment Variables

1. Copy `.env.example` to `.env`
2. Replace the placeholder values with your Firebase configuration:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY="your-actual-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
```

## Step 6: Deploy Security Rules

### Firestore Security Rules

1. In Firebase Console, go to "Firestore Database"
2. Click on the "Rules" tab
3. Replace the default rules with the content from `firestore.rules`
4. Click "Publish"

### Firestore Indexes

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login to Firebase: `firebase login`
3. Initialize Firebase in your project: `firebase init firestore`
4. Deploy indexes: `firebase deploy --only firestore:indexes`

## Step 7: Test the Setup

Run the application and check the browser console for Firebase setup status:

```bash
npm run dev
```

Look for the "🔥 Firebase Setup Status" log group in the console.

## Development vs Production

### Development Setup

For development, you can optionally use Firebase emulators:

1. Install Firebase CLI tools
2. Set up emulators: `firebase init emulators`
3. Start emulators: `firebase emulators:start`
4. Set `VITE_USE_FIREBASE_EMULATOR="true"` in your `.env` file

### Production Setup

For production deployment:

1. Ensure all environment variables are properly set
2. Update Firestore security rules to be more restrictive
3. Set up Firebase hosting (optional): `firebase init hosting`
4. Deploy: `firebase deploy`

## Security Considerations

### Firestore Security Rules

The provided security rules implement:

- User data isolation (users can only access their own data)
- Cookie account IP validation
- Public read access for businesses and ratings
- Authenticated write access for ratings and businesses
- Admin-only access for sensitive operations

### API Key Security

- Firebase API keys are safe to include in client-side code
- They identify your project but don't grant access to data
- Access is controlled by security rules, not API keys

### Cookie Account Security

- Cookie IDs are cryptographically generated
- IP address validation prevents account hijacking
- Automatic expiration after 45 days of inactivity
- Local storage encryption for sensitive data

## Monitoring and Analytics

### Firebase Analytics

If enabled during setup, Firebase Analytics will automatically track:

- User engagement
- App performance
- Custom events (can be added later)

### Error Monitoring

The app includes comprehensive error handling:

- Firebase operation errors are caught and logged
- User-friendly error messages
- Retry mechanisms for transient failures
- Error severity classification

## Troubleshooting

### Common Issues

1. **"Missing required Firebase environment variables"**
   - Check that all variables in `.env` are set
   - Ensure no placeholder values remain

2. **"Permission denied" errors**
   - Verify Firestore security rules are deployed
   - Check that user is properly authenticated

3. **"Network request failed"**
   - Check internet connection
   - Verify Firebase project is active
   - Check for firewall/proxy issues

4. **Cookie account issues**
   - Ensure localStorage is available
   - Check browser privacy settings
   - Verify IP address detection is working

### Debug Mode

Enable debug logging by setting:

```env
VITE_FIREBASE_DEBUG="true"
```

This will provide detailed logs of Firebase operations.

## Backup and Recovery

### Data Export

Firebase provides automatic backups, but you can also:

1. Use Firebase CLI to export data: `firebase firestore:export`
2. Set up scheduled exports in Google Cloud Console
3. Implement data export functionality in the app

### Disaster Recovery

1. Keep multiple environment configurations
2. Use Firebase projects for different environments (dev, staging, prod)
3. Regularly test backup restoration procedures

## Cost Management

### Firestore Pricing

Monitor usage in Firebase Console:

- Document reads/writes
- Storage usage
- Network egress

### Optimization Tips

1. Use efficient queries with proper indexing
2. Implement pagination for large datasets
3. Cache frequently accessed data
4. Use Firestore offline persistence

## Support

For issues with this setup:

1. Check the Firebase documentation
2. Review the application logs
3. Test with the provided utility functions
4. Contact the development team

## Next Steps

After Firebase is set up:

1. Test user registration and authentication
2. Test business rating submission
3. Verify cookie account functionality
4. Set up monitoring and alerts
5. Plan for scaling and optimization