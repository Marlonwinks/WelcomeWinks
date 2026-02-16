# Design Document

## Overview

The streamlined user onboarding enhancement transforms the Welcome Winks app's entry experience by implementing a location-first, goal-oriented flow with comprehensive authentication options and persistent data storage. The design leverages the existing React/TypeScript architecture while introducing Firebase integration, multiple account types, and a robust business rating database system.

The enhancement focuses on five core user paths:
1. **Location Detection & Presentation** - Automatic location detection with clear user feedback
2. **Goal Selection Interface** - Clear choice between marking businesses or discovering welcoming places
3. **Authentication Options** - Three account types: full registration, cookie-based temporary accounts, or automatic cookie accounts
4. **Persistent Data Storage** - Firebase-based business rating database with IP-based account management
5. **Streamlined Task Flows** - Optimized paths for both business marking and discovery scenarios with data persistence

## Architecture

### Component Architecture

The design extends the existing component structure with new onboarding-specific components, authentication system, and Firebase integration:

```
src/
├── components/
│   ├── auth/                 # New authentication components
│   │   ├── LoginForm.tsx     # Email/password login form
│   │   ├── SignupForm.tsx    # Full account registration form
│   │   └── AccountOptions.tsx # Three account type selection
│   ├── onboarding/           # Enhanced onboarding components
│   │   ├── LocationDetector.tsx
│   │   ├── GoalSelector.tsx
│   │   ├── OnboardingWizard.tsx
│   │   └── RegistrationPrompt.tsx # Now includes account options
│   ├── business/             # Enhanced existing components
│   │   ├── BusinessCard.tsx  # Add visual score indicators from Firebase
│   │   └── ScoreIndicator.tsx # New component for consistent iconography
│   ├── maps/                 # Enhanced existing components
│   │   └── InteractiveMap.tsx # Add score indicator overlays from Firebase
│   └── layout/               # Existing components
├── hooks/                    # Enhanced existing hooks
│   ├── useGeolocation.tsx    # Enhanced with better error handling
│   ├── useOnboardingFlow.tsx # New hook for flow state management
│   ├── useAuth.tsx           # New hook for authentication state
│   ├── useFirebaseRatings.tsx # New hook for business ratings
│   └── useCookieAccount.tsx  # New hook for cookie-based accounts
├── contexts/                 # Enhanced existing contexts
│   ├── LocationProvider.tsx  # Enhanced with onboarding state
│   ├── AuthProvider.tsx      # New context for authentication
│   └── RatingsProvider.tsx   # New context for business ratings
├── services/                 # New Firebase services
│   ├── firebase.ts           # Firebase configuration and initialization
│   ├── auth.service.ts       # Authentication service functions
│   ├── ratings.service.ts    # Business ratings service functions
│   └── cookieAccount.service.ts # Cookie account management
└── pages/                    # Modified existing pages
    ├── Index.tsx             # Transformed into onboarding entry point
    ├── ExplorePage.tsx       # Enhanced with Firebase score indicators
    └── MarkPage.tsx          # Enhanced with Firebase rating storage
```

### State Management Architecture

The design uses a combination of React Context, Firebase state, and local component state:

- **LocationProvider**: Enhanced to include onboarding state and user preferences
- **OnboardingContext**: New context for managing the onboarding flow state
- **AuthProvider**: New context for managing authentication state (full accounts, cookie accounts, login status)
- **RatingsProvider**: New context for managing business ratings from Firebase
- **Firebase State**: Real-time business ratings, user accounts, and cookie account data
- **Local State**: Component-level state for UI interactions and form data
- **Cookie Storage**: Temporary account identifiers and 45-day expiration tracking

### Navigation Flow Architecture

```mermaid
graph TD
    A[App Entry] --> B[Check Existing Account]
    B --> C{Has Account?}
    C -->|Cookie Account| D[Restore Cookie Data]
    C -->|Full Account| E[Auto Login]
    C -->|No Account| F[Location Detection]
    D --> F
    E --> F
    F --> G{Location Success?}
    G -->|Yes| H[Goal Selection]
    G -->|No| I[Manual Location Entry]
    I --> H
    H --> J{User Choice}
    J -->|Mark Business| K[Business Marking Flow]
    J -->|Find Welcoming| L[Business Discovery Flow]
    K --> M[Survey Questions]
    M --> N[Score Confirmation]
    N --> O[Save to Firebase]
    O --> P[Account Options Prompt]
    L --> Q[Browse Businesses with Firebase Scores]
    Q --> R[View Details]
    R --> P
    P --> S{Account Choice}
    S -->|Full Account| T[Signup Form]
    S -->|Cookie Account| U[Create Cookie Account]
    S -->|Decline| V[Auto Create Cookie Account]
    T --> W[Save to Firebase with Full Account]
    U --> X[Save to Firebase with Cookie ID]
    V --> X
    W --> Y[Continue Using App]
    X --> Y
```

## Components and Interfaces

### 1. OnboardingWizard Component

**Purpose**: Orchestrates the entire onboarding flow
**Location**: `src/components/onboarding/OnboardingWizard.tsx`

```typescript
interface OnboardingWizardProps {
  onComplete: (userPreferences: UserPreferences) => void;
}

interface OnboardingState {
  step: 'location' | 'goal-selection' | 'completed';
  location: LocationData | null;
  selectedGoal: 'mark' | 'discover' | null;
  hasCompletedOnboarding: boolean;
}
```

**Key Features**:
- Step-by-step wizard interface
- Progress indication
- State persistence across sessions
- Responsive design for mobile/desktop

### 2. LocationDetector Component

**Purpose**: Handles location detection and user feedback
**Location**: `src/components/onboarding/LocationDetector.tsx`

```typescript
interface LocationDetectorProps {
  onLocationDetected: (location: LocationData) => void;
  onLocationError: (error: string) => void;
}

interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  address: string;
  source: 'gps' | 'ip' | 'manual';
}
```

**Key Features**:
- Automatic GPS detection with permission handling
- IP-based fallback with clear indication
- Manual location entry with Google Places autocomplete
- Loading states and error handling
- Location accuracy indicators

### 3. GoalSelector Component

**Purpose**: Presents clear goal selection interface
**Location**: `src/components/onboarding/GoalSelector.tsx`

```typescript
interface GoalSelectorProps {
  location: LocationData;
  onGoalSelected: (goal: UserGoal) => void;
}

type UserGoal = 'mark-business' | 'find-welcoming';

interface GoalOption {
  id: UserGoal;
  title: string;
  description: string;
  icon: React.ComponentType;
  primaryAction: string;
}
```

**Key Features**:
- Large, touch-friendly selection cards
- Clear visual hierarchy with icons
- Contextual descriptions based on location
- Accessibility-compliant design

### 4. ScoreIndicator Component

**Purpose**: Consistent visual representation of welcoming scores
**Location**: `src/components/business/ScoreIndicator.tsx`

```typescript
interface ScoreIndicatorProps {
  score: number | null;
  size: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  variant: 'icon' | 'badge' | 'full';
}

type WelcomingLevel = 'very-welcoming' | 'moderately-welcoming' | 'not-welcoming' | 'unrated';
```

**Key Features**:
- Consistent iconography (smile, neutral, frown, question mark)
- Color-coded indicators (green, yellow, red, gray)
- Multiple size variants for different contexts
- Accessibility features (alt text, ARIA labels)

### 5. AccountOptions Component

**Purpose**: Presents three account type options after goal completion
**Location**: `src/components/auth/AccountOptions.tsx`

```typescript
interface AccountOptionsProps {
  completedGoal: UserGoal;
  onFullAccount: () => void;
  onCookieAccount: () => void;
  onDecline: () => void;
}

interface AccountOption {
  type: 'full' | 'cookie' | 'decline';
  title: string;
  description: string;
  benefits: string[];
  dataRetention: string;
  icon: React.ComponentType;
}
```

**Key Features**:
- Three clear account options with distinct benefits
- Data retention policy explanations
- Goal-specific benefit messaging
- Non-intrusive design that doesn't block app usage

### 6. SignupForm Component

**Purpose**: Full account registration with email/password
**Location**: `src/components/auth/SignupForm.tsx`

```typescript
interface SignupFormProps {
  onSuccess: (user: FirebaseUser) => void;
  onCancel: () => void;
}

interface SignupData {
  email: string;
  password: string;
  confirmPassword: string;
  // Optional demographic fields
  name?: string;
  location?: string;
  gender?: string;
  race?: string;
  veteranStatus?: boolean;
  politicalPosition?: string;
}
```

**Key Features**:
- Email/password validation with strength requirements
- Optional demographic fields for personalization
- Privacy consent and terms acceptance
- Integration with Firebase Authentication
- Automatic migration of cookie account data

### 7. LoginForm Component

**Purpose**: Returning user login for full accounts
**Location**: `src/components/auth/LoginForm.tsx`

```typescript
interface LoginFormProps {
  onSuccess: (user: FirebaseUser) => void;
  onCancel: () => void;
  onForgotPassword: () => void;
}

interface LoginData {
  email: string;
  password: string;
  rememberMe: boolean;
}
```

**Key Features**:
- Email/password authentication
- "Remember me" functionality
- Password reset integration
- Error handling for invalid credentials
- Automatic account data restoration

## Data Models

### Enhanced Location Model

```typescript
interface EnhancedLocationData {
  // Existing fields
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  error: string | null;
  
  // New fields for onboarding
  address: string | null;
  source: 'gps' | 'ip' | 'manual';
  accuracy: number | null;
  timestamp: Date;
  userConfirmed: boolean;
}
```

### Onboarding State Model

```typescript
interface OnboardingState {
  hasCompletedOnboarding: boolean;
  preferredGoal: UserGoal | null;
  locationPreference: 'auto' | 'manual';
  registrationStatus: 'registered' | 'skipped' | 'remind-later' | 'not-prompted';
  lastOnboardingDate: Date | null;
  onboardingVersion: string;
}
```

### User Preferences Model

```typescript
interface UserPreferences {
  defaultView: 'map' | 'list';
  locationSharing: boolean;
  notificationPreferences: {
    newBusinessesNearby: boolean;
    scoreUpdates: boolean;
    communityActivity: boolean;
  };
  privacySettings: {
    shareContributions: boolean;
    publicProfile: boolean;
  };
}
```

### Authentication Models

```typescript
// Firebase User Account Model
interface FirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  createdAt: Date;
  lastLoginAt: Date;
  ipAddress: string;
  accountType: 'full';
}

// Cookie Account Model
interface CookieAccount {
  cookieId: string;
  ipAddress: string;
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  accountType: 'cookie';
  isExpired: boolean;
}

// User Profile Model (for both account types)
interface UserProfile {
  userId: string; // Firebase UID or cookie ID
  accountType: 'full' | 'cookie';
  
  // Optional demographic fields
  name?: string;
  location?: string;
  gender?: string;
  race?: string;
  veteranStatus?: boolean;
  politicalPosition?: string;
  
  // Preferences
  preferences: UserPreferences;
  privacyConsent: boolean;
  termsAccepted: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Registration Data Model
interface RegistrationData {
  // Required fields for full accounts
  email: string;
  password: string;
  
  // Optional demographic fields
  name?: string;
  location?: string;
  gender?: string;
  race?: string;
  veteranStatus?: boolean;
  politicalPosition?: string;
  
  // Preferences
  preferences: UserPreferences;
  privacyConsent: boolean;
  termsAccepted: boolean;
}
```

### Business Rating Models

```typescript
// Business Model
interface Business {
  businessId: string; // Google Places ID
  name: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  googlePlacesData: any; // Raw Google Places data
  
  // Rating aggregation
  averageScore: number | null;
  totalRatings: number;
  ratingBreakdown: {
    veryWelcoming: number;
    moderatelyWelcoming: number;
    notWelcoming: number;
  };
  
  // Status
  status: 'neutral' | 'rated';
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Individual Rating Model
interface BusinessRating {
  ratingId: string;
  businessId: string; // References Business.businessId
  userId: string; // Firebase UID or cookie ID
  userAccountType: 'full' | 'cookie';
  
  // Survey responses (6 questions)
  responses: {
    trumpWelcome: number; // -2 to +2
    obamaWelcome: number; // -2 to +2
    personOfColorComfort: number; // -2 to +2
    lgbtqSafety: number; // -2 to +2
    undocumentedSafety: number; // -2 to +2
    firearmNormal: number; // -2 to +2
  };
  
  // Calculated score
  totalScore: number; // Sum of all responses
  welcomingLevel: 'very-welcoming' | 'moderately-welcoming' | 'not-welcoming';
  
  // Metadata
  createdAt: Date;
  userIpAddress: string;
}

// Rating Aggregation Model
interface RatingAggregation {
  businessId: string;
  totalRatings: number;
  averageScore: number;
  scoreDistribution: {
    veryWelcoming: number;
    moderatelyWelcoming: number;
    notWelcoming: number;
  };
  lastUpdated: Date;
}
```

## Firebase Architecture

### Firebase Services Integration

The application integrates with Firebase for authentication, data storage, and real-time updates:

**Firebase Configuration** (`src/services/firebase.ts`):
```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  // Firebase project configuration
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### Firestore Database Structure

```
/users/{userId}
  - accountType: 'full' | 'cookie'
  - email?: string (only for full accounts)
  - ipAddress: string
  - profile: UserProfile
  - createdAt: timestamp
  - lastActiveAt: timestamp
  - expiresAt?: timestamp (only for cookie accounts)

/businesses/{businessId}
  - googlePlacesId: string
  - name: string
  - address: string
  - location: GeoPoint
  - averageScore: number | null
  - totalRatings: number
  - status: 'neutral' | 'rated'
  - createdAt: timestamp
  - updatedAt: timestamp

/ratings/{ratingId}
  - businessId: string
  - userId: string
  - userAccountType: 'full' | 'cookie'
  - responses: object
  - totalScore: number
  - welcomingLevel: string
  - createdAt: timestamp
  - userIpAddress: string

/cookieAccounts/{cookieId}
  - ipAddress: string
  - createdAt: timestamp
  - lastActiveAt: timestamp
  - expiresAt: timestamp
  - isExpired: boolean
```

### Service Layer Architecture

**Authentication Service** (`src/services/auth.service.ts`):
```typescript
export class AuthService {
  // Full account methods
  async signUp(email: string, password: string, profile: UserProfile): Promise<FirebaseUser>
  async signIn(email: string, password: string): Promise<FirebaseUser>
  async signOut(): Promise<void>
  async resetPassword(email: string): Promise<void>
  
  // Cookie account methods
  async createCookieAccount(ipAddress: string): Promise<CookieAccount>
  async getCookieAccount(cookieId: string): Promise<CookieAccount | null>
  async updateCookieActivity(cookieId: string): Promise<void>
  async expireCookieAccount(cookieId: string): Promise<void>
  
  // Account migration
  async migrateCookieToFullAccount(cookieId: string, firebaseUser: FirebaseUser): Promise<void>
}
```

**Ratings Service** (`src/services/ratings.service.ts`):
```typescript
export class RatingsService {
  // Business methods
  async createBusiness(googlePlacesData: any): Promise<Business>
  async getBusiness(businessId: string): Promise<Business | null>
  async getBusinessesByLocation(lat: number, lng: number, radius: number): Promise<Business[]>
  
  // Rating methods
  async submitRating(businessId: string, userId: string, responses: SurveyResponses): Promise<BusinessRating>
  async getBusinessRatings(businessId: string): Promise<BusinessRating[]>
  async getUserRatings(userId: string): Promise<BusinessRating[]>
  
  // Aggregation methods
  async updateBusinessAggregation(businessId: string): Promise<void>
  async calculateWelcomingLevel(totalScore: number): WelcomingLevel
}
```

**Cookie Account Service** (`src/services/cookieAccount.service.ts`):
```typescript
export class CookieAccountService {
  async generateCookieId(): Promise<string>
  async storeCookieLocally(cookieId: string): void
  async getCookieFromStorage(): Promise<string | null>
  async clearCookieFromStorage(): void
  async checkCookieExpiration(cookieId: string): Promise<boolean>
  async extendCookieExpiration(cookieId: string): Promise<void>
}
```

### Real-time Data Synchronization

The application uses Firestore real-time listeners for:

1. **Business Rating Updates**: Automatically update UI when new ratings are submitted
2. **User Activity Tracking**: Update last active timestamps for cookie accounts
3. **Account Status Changes**: Handle account expiration and migration events

### Data Security and Privacy

**Security Rules** (Firestore):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Cookie accounts can be accessed by IP address
    match /cookieAccounts/{cookieId} {
      allow read, write: if request.auth == null; // Allow anonymous access
    }
    
    // Businesses are publicly readable, only authenticated users can create
    match /businesses/{businessId} {
      allow read: if true;
      allow create, update: if request.auth != null || 
        exists(/databases/$(database)/documents/cookieAccounts/$(request.auth.uid));
    }
    
    // Ratings are publicly readable, only account holders can create
    match /ratings/{ratingId} {
      allow read: if true;
      allow create: if request.auth != null || 
        exists(/databases/$(database)/documents/cookieAccounts/$(resource.data.userId));
      allow update, delete: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

## Error Handling

### Location Detection Errors

1. **GPS Permission Denied**
   - Fallback to IP-based detection
   - Clear explanation of reduced accuracy
   - Option to manually enter location

2. **IP Detection Failed**
   - Prompt for manual location entry
   - Provide common location suggestions
   - Allow app usage with default location

3. **Manual Location Invalid**
   - Real-time validation with Google Places API
   - Suggestion dropdown with corrections
   - Clear error messaging

### Firebase and Authentication Errors

1. **Firebase Authentication Errors**
   - Invalid email/password combinations
   - Email already in use during signup
   - Weak password validation
   - Network connectivity issues
   - Account disabled or deleted

2. **Firestore Database Errors**
   - Permission denied errors
   - Network timeouts and retries
   - Document not found scenarios
   - Quota exceeded errors
   - Offline mode handling

3. **Cookie Account Errors**
   - Expired cookie account detection
   - IP address mismatch handling
   - Local storage unavailable
   - Cookie corruption or tampering

### Network and API Errors

1. **Google Places API Failures**
   - Graceful degradation to cached data
   - Retry mechanisms with exponential backoff
   - User-friendly error messages

2. **Registration and Authentication Failures**
   - Form validation with inline feedback
   - Retry options for network errors
   - Data persistence during failures
   - Account migration error handling

3. **Business Rating Errors**
   - Rating submission failures
   - Duplicate rating prevention
   - Data synchronization conflicts
   - Aggregation calculation errors

## Testing Strategy

### Unit Testing

**Location Detection**:
- Mock geolocation API responses
- Test fallback mechanisms
- Validate error handling paths

**Component Rendering**:
- Test all onboarding steps render correctly
- Validate responsive design breakpoints
- Ensure accessibility compliance

**State Management**:
- Test onboarding flow state transitions
- Validate persistence mechanisms
- Test error recovery scenarios

### Integration Testing

**User Flows**:
- Complete onboarding flow from start to finish
- Test goal selection and navigation
- Validate registration process

**API Integration**:
- Test Google Places API integration
- Validate location services
- Test error scenarios with API failures

### End-to-End Testing

**Critical Paths**:
- New user onboarding complete flow
- Returning user experience
- Mobile vs desktop experience consistency

**Performance Testing**:
- Location detection speed
- Component rendering performance
- Memory usage during onboarding

## Implementation Phases

### Phase 1: Firebase Infrastructure Setup
- Configure Firebase project and authentication
- Set up Firestore database with security rules
- Create Firebase service layer (auth, ratings, cookie accounts)
- Implement basic Firebase connection and error handling

### Phase 2: Authentication System
- Create AuthProvider context and useAuth hook
- Implement SignupForm and LoginForm components
- Build AccountOptions component for three account types
- Add cookie account management system

### Phase 3: Core Onboarding Infrastructure
- Create OnboardingWizard component with authentication integration
- Enhance LocationProvider with onboarding state
- Implement LocationDetector component
- Add onboarding flow routing with account detection

### Phase 4: Business Rating Database
- Implement business creation and storage in Firebase
- Create rating submission and aggregation system
- Build RatingsProvider context and hooks
- Add real-time rating updates and synchronization

### Phase 5: Goal Selection and Navigation
- Implement GoalSelector component
- Modify Index.tsx for onboarding entry point with account restoration
- Create navigation flow between onboarding and existing pages
- Add progress tracking with account persistence

### Phase 6: Visual Score Indicators with Firebase Data
- Create ScoreIndicator component with Firebase integration
- Integrate score indicators into BusinessCard with real ratings
- Enhance InteractiveMap with Firebase score overlays
- Update ExplorePage with live rating data

### Phase 7: Account Management and Data Migration
- Implement cookie account expiration and cleanup
- Add account migration from cookie to full account
- Create user profile management
- Add IP address tracking and validation

### Phase 8: Polish and Optimization
- Add animations and transitions
- Implement accessibility improvements
- Performance optimization for Firebase queries
- Cross-browser testing and offline mode handling

## Security Considerations

### Firebase Security
- Firestore security rules to protect user data
- Authentication state validation on all protected operations
- IP address validation for cookie accounts
- Secure cookie account expiration and cleanup

### Authentication Security
- Strong password requirements for full accounts
- Email verification for new accounts
- Secure password reset functionality
- Protection against brute force attacks

### Cookie Account Security
- Secure cookie ID generation using cryptographic methods
- IP address binding to prevent account hijacking
- Automatic expiration after 45 days of inactivity
- Local storage encryption for sensitive cookie data

### Location Privacy
- Clear consent mechanisms for location sharing
- Option to use approximate location only
- Data retention policies for location data
- IP address anonymization after account expiration

### User Data Protection
- Secure storage of registration data in Firebase
- GDPR compliance for EU users with data export/deletion
- Clear privacy policy integration
- Demographic data encryption at rest

### API Security
- Secure Firebase API key management
- Rate limiting for Firebase operations
- Input validation for all user data
- Protection against injection attacks in rating submissions

### Business Rating Security
- Prevention of duplicate ratings from same user/IP
- Validation of rating data integrity
- Protection against rating manipulation
- Audit trail for all rating submissions

## Performance Considerations

### Loading Optimization
- Lazy loading of onboarding components
- Progressive enhancement for location features
- Efficient caching of location data

### Mobile Performance
- Touch-optimized interactions
- Reduced network requests on mobile
- Battery-conscious location detection

### Accessibility
- Screen reader compatibility
- Keyboard navigation support
- High contrast mode support
- Reduced motion preferences

# Welcome Winks - Complete Codebase Summary

## 🏗️ Project Overview

**Welcome Winks** is a React-based location discovery app that helps users find welcoming places through community insights using a unique "Winks Score" rating system based on political climate surveys.

### Tech Stack
- **React 18.3.1** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** with custom design system
- **shadcn/ui** component library
- **Google Maps API** with Places service
- **Supabase** for backend (configured but not actively used)
- **TanStack React Query** for server state

## 📁 Complete File Structure

### Root Configuration Files
```
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration with path aliases
├── tsconfig.app.json              # App-specific TypeScript config
├── tsconfig.node.json             # Node-specific TypeScript config
├── vite.config.ts                 # Vite configuration with proxy setup
├── tailwind.config.ts             # Tailwind CSS configuration with custom design system
├── components.json                # shadcn/ui configuration
├── eslint.config.js               # ESLint configuration
├── postcss.config.js              # PostCSS configuration
├── vercel.json                    # Vercel deployment configuration
├── .env                           # Environment variables (Google API key)
├── index.html                     # HTML entry point
└── README.md                      # Project documentation
```

### Source Code Structure
```
src/
├── main.tsx                       # React app entry point
├── App.tsx                        # Main app component with routing
├── App.css                        # Legacy CSS (mostly unused)
├── index.css                      # Main CSS with design system variables
├── components/
│   ├── business/
│   │   └── BusinessCard.tsx       # Business display card with Winks score
│   ├── charts/
│   │   └── DonutChart.tsx         # Circular progress chart for scores
│   ├── layout/
│   │   ├── AppShell.tsx           # Main layout wrapper (mobile/desktop)
│   │   ├── BottomNavigation.tsx   # Mobile bottom navigation
│   │   ├── DesktopSidebar.tsx     # Desktop left sidebar navigation
│   │   ├── TopHeader.tsx          # Desktop top header
│   │   └── CookieConsent.tsx      # GDPR cookie consent component
│   ├── maps/
│   │   ├── InteractiveMap.tsx     # Google Maps integration component
│   │   ├── MapMarker.tsx          # Custom map marker component
│   │   └── MapView.tsx            # Map view with placeholder functionality
│   └── ui/                        # shadcn/ui components (40+ files)
│       ├── button.tsx             # Button component
│       ├── card.tsx               # Card component
│       ├── input.tsx              # Input component
│       ├── theme-provider.tsx     # Theme context provider
│       ├── theme-toggle.tsx       # Dark/light mode toggle
│       └── [38 other UI components]
├── contexts/
│   └── LocationProvider.tsx       # Location state context provider
├── hooks/
│   ├── useGeolocation.tsx         # Browser + IP geolocation hook
│   ├── useGooglePlacesService.tsx # Google Places service hook
│   ├── usePlaceDetails.tsx        # Individual place details hook
│   ├── usePlacesAutocomplete.tsx  # Places autocomplete hook
│   ├── use-mobile.tsx             # Mobile breakpoint detection hook
│   └── use-toast.ts               # Toast notification hook
├── integrations/
│   └── supabase/
│       ├── client.ts              # Supabase client configuration
│       └── types.ts               # Database type definitions
├── lib/
│   └── utils.ts                   # Utility functions (cn function)
└── pages/
    ├── Index.tsx                  # Home page with hero and search
    ├── ExplorePage.tsx            # Business discovery page
    ├── MarkPage.tsx               # Business rating survey page
    ├── BusinessPage.tsx           # Individual business details page
    ├── ProfilePage.tsx            # User profile page
    ├── NotificationsPage.tsx      # Notifications page
    ├── AdminDashboard.tsx         # Admin analytics dashboard
    └── NotFound.tsx               # 404 error page
```

### Supabase Configuration
```
supabase/
└── config.toml                    # Supabase project configuration
```

## 🎨 Design System Details

### Color System (src/index.css)
```css
/* Light Mode Colors */
--primary: 199 89% 48%;           /* Calm teal-blue #3AA4D8 */
--secondary: 32 95% 70%;          /* Warm amber #FFB86B */
--success: 142 76% 45%;           /* Green #34C759 */
--destructive: 4 90% 58%;         /* Red #FF453A */
--warning: 48 100% 50%;           /* Yellow #FFCC00 */

/* Dark Mode Colors */
--background: 215 28% 7%;         /* Dark background #0B1117 */
--foreground: 0 0% 98%;           /* Light text */
```

### Typography
- **Font**: Inter with font feature settings
- **Sizes**: xs (12px) to 2xl (28px)
- **Line Heights**: Optimized for readability

### Custom CSS Classes
- `.text-gradient`: Brand gradient text effect
- `.shadow-brand`: Consistent shadow styling
- `.interactive-scale`: Hover scale effects
- `.glass`: Glassmorphism effect
- `.floating-cta`: Elevated button styling
- `.btn-hero`: Primary CTA button styling

## 🗺️ Application Routes

### Main Routes (src/App.tsx)
```typescript
"/"                    → Index.tsx (Home page)
"/explore"            → ExplorePage.tsx (Business discovery)
"/mark"               → MarkPage.tsx (Business rating survey)
"/business/:id"       → BusinessPage.tsx (Business details)
"/profile"            → ProfilePage.tsx (User profile)
"/notifications"      → NotificationsPage.tsx (Notifications)
"/admin"              → AdminDashboard.tsx (Admin dashboard)
"*"                   → NotFound.tsx (404 page)
```

## 📱 Component Architecture

### Layout System
- **AppShell** (src/components/layout/AppShell.tsx): Main responsive wrapper
- **Mobile**: BottomNavigation with floating action button
- **Desktop**: DesktopSidebar + TopHeader
- **Breakpoint**: 768px (useIsMobile hook)

### Navigation Components
- **BottomNavigation** (src/components/layout/BottomNavigation.tsx): Mobile nav with 4 items + floating CTA
- **DesktopSidebar** (src/components/layout/DesktopSidebar.tsx): Left sidebar with brand and navigation
- **TopHeader** (src/components/layout/TopHeader.tsx): Desktop header with search and user avatar

### Business Components
- **BusinessCard** (src/components/business/BusinessCard.tsx): Displays business info with Winks score
- **DonutChart** (src/components/charts/DonutChart.tsx): Circular progress indicator

### Map Components
- **InteractiveMap** (src/components/maps/InteractiveMap.tsx): Google Maps with markers and info windows
- **MapMarker** (src/components/maps/MapMarker.tsx): Custom marker with score visualization
- **MapView** (src/components/maps/MapView.tsx): Placeholder map component

## 🔧 State Management

### Context Providers
- **LocationProvider** (src/contexts/LocationProvider.tsx): Global location state
- **ThemeProvider** (src/components/ui/theme-provider.tsx): Light/dark theme state
- **QueryClientProvider**: TanStack React Query for server state

### Custom Hooks
- **useGeolocation** (src/hooks/useGeolocation.tsx): Browser + IP location detection
- **useLocation**: Consumer hook for LocationProvider
- **usePlacesAutocomplete** (src/hooks/usePlacesAutocomplete.tsx): Google Places suggestions
- **usePlaceDetails** (src/hooks/usePlaceDetails.tsx): Individual place information
- **useIsMobile** (src/hooks/use-mobile.tsx): Responsive breakpoint detection

## 🎯 Key Features

### Location Services
- **GPS Detection**: Browser geolocation API
- **IP Fallback**: ip-api.com service
- **Manual Entry**: Google Places autocomplete
- **Geocoding**: Google Geocoding API for address resolution

### Business Rating System ("Winks Score")
Located in: src/pages/MarkPage.tsx

**Survey Questions** (6 total):
1. "Would President Trump be welcome?" (negative scoring)
2. "Would President Obama be welcome?" (positive scoring)
3. "Would a person of color feel comfortable?" (positive scoring)
4. "Would LGBTQ+ member feel safe?" (positive scoring)
5. "Would undocumented individual feel safe?" (positive scoring)
6. "Would person carrying firearm be normal?" (negative scoring)

**Scoring Logic**:
- Options: Yes (+2), Probably (+1), Probably Not (-1), No (-2)
- Normal questions: positive scores for "Yes"
- Reverse questions: negative scores for "Yes"
- Final score: Sum of all answers
- Visual: Smile (>5), Frown (<-5), Neutral (between)

### Google Maps Integration
- **API Key**: Stored in .env as VITE_GOOGLE_PLACES_API_KEY
- **Libraries**: ['places'] loaded in App.tsx
- **Services**: Places, Geocoding, Maps JavaScript API
- **Proxy**: Vite proxy for /maps-api to avoid CORS

## 📄 Page Details

### Index.tsx (Home Page)
- **Location**: src/pages/Index.tsx
- **Features**: Hero section, search, location display, nearby places, quick filters
- **Components**: InteractiveMap, location modal, suggestions dropdown
- **State**: Search query, manual location, nearby places, map center

### ExplorePage.tsx (Business Discovery)
- **Location**: src/pages/ExplorePage.tsx
- **Features**: Business list/map toggle, filtering, search
- **Components**: BusinessCard, InteractiveMap, filter badges
- **State**: View mode, selected filters, places cache

### MarkPage.tsx (Business Rating)
- **Location**: src/pages/MarkPage.tsx
- **Features**: Multi-step survey, place search, score calculation
- **Components**: Progress bar, question cards, score display
- **State**: Current step, place name, answers, final score

### BusinessPage.tsx (Business Details)
- **Location**: src/pages/BusinessPage.tsx
- **Features**: Business info, Winks score, question breakdown
- **Components**: Score display, action buttons, info cards
- **State**: Place details, loading states

## 🔑 Environment Configuration

### Environment Variables (.env)
```
VITE_GOOGLE_PLACES_API_KEY="AIzaSyCHl06FLm0U6hZGUD1vaf-v4UPo5JHFqyI"
```

### Vite Configuration (vite.config.ts)
- **Proxy**: /maps-api → https://maps.googleapis.com
- **Aliases**: @ → ./src
- **Plugins**: React SWC, Lovable tagger (dev only)

### TypeScript Configuration (tsconfig.json)
- **Path Aliases**: @/* → ./src/*
- **Strict Settings**: Disabled for flexibility
- **References**: App and Node configs

## 🎨 Styling Architecture

### Tailwind Configuration (tailwind.config.ts)
- **Custom Colors**: Primary, secondary, success, destructive, warning
- **Custom Fonts**: Inter font family
- **Custom Animations**: fade-in, scale-in, slide-up, pulse-glow, float
- **Custom Shadows**: soft, medium, strong, brand
- **Custom Gradients**: brand, surface, hero

### CSS Variables (src/index.css)
- **Design Tokens**: All colors defined as HSL values
- **Dark Mode**: Complete dark theme with .dark class
- **Custom Properties**: Gradients, shadows, transitions
- **Utility Classes**: Text gradient, interactive effects

## 🔌 External Integrations

### Google Services
- **Maps JavaScript API**: Interactive maps
- **Places API**: Business search and details
- **Geocoding API**: Address to coordinates conversion
- **Places Autocomplete**: Search suggestions

### Supabase (Configured but Unused)
- **Client**: src/integrations/supabase/client.ts
- **Types**: Comprehensive database type definitions
- **Tables**: 20+ tables for various features (mostly unused)

### IP Geolocation
- **Service**: ip-api.com
- **Fallback**: When GPS permission denied
- **Data**: City, region, coordinates

## 🧪 Development Setup

### Scripts (package.json)
```json
"dev": "vite"                     # Development server
"build": "vite build"             # Production build
"build:dev": "vite build --mode development"  # Dev build
"lint": "eslint ."                # Linting
"preview": "vite preview"         # Preview build
```

### Development Server
- **Port**: 8080
- **Host**: :: (all interfaces)
- **Proxy**: Google Maps API proxy configured

## 🎯 Current Implementation Status

### ✅ Fully Implemented
- Responsive layout system (mobile/desktop)
- Google Maps integration with places search
- Location detection (GPS + IP fallback)
- Business rating survey system
- Theme system (light/dark mode)
- Component library (shadcn/ui)
- Routing and navigation

### 🔄 Partially Implemented
- Business data (uses Google Places, no persistent storage)
- User profiles (UI only, no backend)
- Admin dashboard (UI only, no real data)
- Notifications system (UI only)

### ❌ Not Implemented
- User authentication
- Persistent business ratings storage
- Real-time data updates
- Push notifications
- Social features

## 🚀 Key Extension Points

### For New Features
1. **Database Integration**: Supabase client ready in src/integrations/supabase/
2. **Authentication**: Can extend existing profile system
3. **Real-time Updates**: React Query setup ready for server state
4. **Mobile App**: PWA-ready with responsive design

### For Onboarding Enhancement
1. **Context System**: LocationProvider can be extended
2. **Hook System**: Custom hooks pattern established
3. **Component Library**: shadcn/ui components available
4. **Routing**: React Router setup ready for new flows

## 📚 Important Code Patterns

### Component Structure
```typescript
// Standard component pattern
interface ComponentProps {
  // Props definition
}

export const Component: React.FC<ComponentProps> = ({ props }) => {
  // Component logic
  return (
    // JSX with Tailwind classes
  );
};
```

### Hook Pattern
```typescript
// Custom hook pattern
export const useCustomHook = () => {
  const [state, setState] = useState();
  
  // Hook logic
  
  return { state, actions };
};
```

### Context Pattern
```typescript
// Context provider pattern
const Context = createContext<ContextType | undefined>(undefined);

export const Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Provider logic
  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export const useContext = () => {
  const context = useContext(Context);
  if (!context) throw new Error('useContext must be used within Provider');
  return context;
};
```

This comprehensive summary provides exact file locations and implementation details for every aspect of the Welcome Winks codebase, enabling any AI to understand and work with the project immediately.