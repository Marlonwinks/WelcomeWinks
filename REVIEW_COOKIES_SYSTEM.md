# Review Cookies System

## Overview
A browser cookie-based system that prevents users from reviewing the same business multiple times from the same device/browser, helping to reduce spam reviews while maintaining user privacy.

## How It Works

### Cookie-Based Tracking
- **Local Storage**: Uses browser cookies to track reviewed businesses
- **Device-Specific**: Each device/browser maintains its own review history
- **Privacy-Friendly**: No server-side tracking of individual devices
- **Persistent**: Cookies last for 1 year but are automatically cleaned

### Review Prevention
- **Pre-Submission Check**: Checks if business was already reviewed before showing form
- **Submission Block**: Prevents duplicate review submissions at the service level
- **User Feedback**: Shows clear message when business was already reviewed
- **Override Option**: Admins can clear restrictions for testing

## Technical Implementation

### Cookie Structure
```typescript
interface ReviewCookie {
  businessId: string;    // Which business was reviewed
  timestamp: number;     // When it was reviewed
  userId?: string;       // Optional user ID for reference
}
```

### Storage Details
- **Cookie Name**: `ww_reviewed_businesses`
- **Format**: JSON array of review records
- **Expiry**: 365 days
- **Size Limit**: ~3.5KB (automatically trimmed if larger)
- **Encoding**: URL-encoded JSON for browser compatibility

### Automatic Cleanup
- **Age Limit**: Reviews older than 1 year are automatically removed
- **Size Management**: Keeps only the most recent 1000 reviews
- **Trimming**: If cookie gets too large, keeps only 500 most recent
- **Validation**: Invalid or corrupted data is automatically cleared

## User Experience

### When User Can Review
- ✅ First time visiting a business page
- ✅ Different businesses (no limit on total reviews)
- ✅ After admin clears the restriction
- ✅ After 1 year has passed

### When User Cannot Review
- ❌ Already reviewed this business from this device
- ❌ Cookie indicates previous review exists
- ❌ Even if using different user accounts

### User Interface
- **Clear Notice**: Shows when business was already reviewed
- **Explanation**: Explains why restriction exists (spam prevention)
- **Alternative Actions**: Can still view existing reviews and business info
- **Debug Info**: Development mode shows cookie statistics

## Admin Management

### Review Cookies Dashboard
- **Statistics Overview**: Total reviews, recent activity, cookie size
- **Business List**: All businesses reviewed from admin's device
- **Individual Removal**: Remove specific business restrictions
- **Bulk Clear**: Clear all review cookies
- **Debug Information**: Detailed cookie analysis

### Admin Tools
- **Clear All**: Remove all review restrictions for testing
- **Remove Specific**: Allow re-reviewing specific businesses
- **View Statistics**: Monitor cookie usage and size
- **Debug Mode**: Detailed information for troubleshooting

## Security Features

### Spam Prevention
- **Device Limitation**: Each device can only review once per business
- **Rate Limiting**: Tracks review frequency for spam detection
- **Pattern Detection**: Identifies suspicious review patterns
- **Cookie Validation**: Prevents cookie tampering

### Privacy Protection
- **Local Only**: Cookies stored only on user's device
- **No Tracking**: No server-side device fingerprinting
- **User Control**: Users can clear cookies themselves
- **Minimal Data**: Only stores business ID and timestamp

### Anti-Circumvention
- **Multiple Checks**: Both client and server-side validation
- **Service Integration**: Ratings service enforces cookie restrictions
- **Error Handling**: Graceful fallback if cookies fail
- **Logging**: Tracks attempts to bypass restrictions

## Integration Points

### Rating Form
- **Pre-Check**: Checks cookies before showing rating interface
- **Dynamic UI**: Hides form if business already reviewed
- **Clear Messaging**: Explains restriction to users
- **Override Option**: Development mode allows clearing restrictions

### Ratings Service
- **Submission Guard**: Blocks duplicate submissions at service level
- **Cookie Setting**: Marks business as reviewed after successful submission
- **Update Handling**: Allows updates but logs cookie warnings
- **Error Messages**: Clear feedback when submissions are blocked

### Admin Dashboard
- **Cookie Manager**: Full interface for managing review cookies
- **Statistics**: Overview of cookie usage and patterns
- **Debugging**: Tools for troubleshooting cookie issues
- **Testing**: Easy clearing of restrictions for testing

## Configuration

### Cookie Settings
```typescript
COOKIE_NAME = 'ww_reviewed_businesses'
COOKIE_EXPIRY_DAYS = 365
MAX_REVIEWS_STORED = 1000
COOKIE_SIZE_LIMIT = 3500 // bytes
TRIM_TO_COUNT = 500
```

### Spam Detection
```typescript
RAPID_REVIEW_WINDOW = 24 // hours
MAX_REVIEWS_PER_DAY = 10
SUSPICIOUS_THRESHOLD = 15 // reviews per week
```

## Best Practices

### For Users
- **One Review Per Business**: Each device can review a business once
- **Multiple Businesses**: No limit on reviewing different businesses
- **Cookie Management**: Clear browser cookies to reset restrictions
- **Account Independence**: Restrictions apply per device, not per account

### For Admins
- **Regular Monitoring**: Check cookie statistics for unusual patterns
- **Testing Cleanup**: Clear cookies when testing review functionality
- **Size Management**: Monitor cookie size to prevent browser limits
- **Pattern Analysis**: Look for suspicious review patterns

### For Developers
- **Error Handling**: Always handle cookie failures gracefully
- **Fallback Logic**: Don't break functionality if cookies fail
- **Size Monitoring**: Implement automatic cookie trimming
- **Privacy Compliance**: Ensure cookie usage complies with regulations

## Troubleshooting

### Common Issues
- **Cookie Not Set**: Check if localStorage is available
- **Restriction Not Working**: Verify cookie reading/writing
- **Size Errors**: Cookie may be too large for browser
- **Clearing Issues**: Browser may block cookie deletion

### Debug Information
- **Cookie Size**: Monitor for browser limits (4KB typical)
- **Review Count**: Track total reviews per device
- **Recent Activity**: Monitor for spam patterns
- **Validation Errors**: Check for corrupted cookie data

### Solutions
- **Clear Cookies**: Reset all review restrictions
- **Reduce Size**: Automatic trimming of old reviews
- **Validate Data**: Automatic cleanup of invalid entries
- **Fallback Mode**: Allow reviews if cookie system fails

## Future Enhancements

### Planned Features
- **Cross-Device Sync**: Optional account-based review tracking
- **Advanced Analytics**: Better spam pattern detection
- **User Dashboard**: Let users see their review history
- **Export Function**: Allow users to export their review data

### Privacy Improvements
- **Cookie Consent**: Explicit consent for review tracking
- **Data Minimization**: Store only essential information
- **User Control**: More granular control over cookie data
- **Transparency**: Clear explanation of data usage

## Compliance Notes

### Privacy Regulations
- **GDPR**: Cookies used for legitimate business purpose (spam prevention)
- **CCPA**: Users can clear cookies to delete data
- **Local Storage**: Data stored only on user's device
- **No Tracking**: No cross-site or behavioral tracking

### Browser Compatibility
- **Modern Browsers**: Full support for localStorage and cookies
- **Fallback**: Graceful degradation if cookies disabled
- **Size Limits**: Respects browser cookie size limitations
- **Security**: Uses secure cookie settings when available