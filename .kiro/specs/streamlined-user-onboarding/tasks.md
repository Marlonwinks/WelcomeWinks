# Implementation Plan

- [x] 1. Create onboarding infrastructure and state management
  - Set up the foundational components and hooks needed for the onboarding flow
  - Create TypeScript interfaces for onboarding state and user preferences
  - Implement the core onboarding context provider
  - _Requirements: 1.1, 2.1, 8.4_

- [x] 1.1 Create onboarding TypeScript interfaces and types
  - Define OnboardingState, UserGoal, LocationData, and RegistrationData interfaces
  - Create type definitions for onboarding flow steps and user preferences
  - Add enums for welcoming score levels and location sources
  - _Requirements: 1.1, 2.1, 6.1_

- [x] 1.2 Implement OnboardingContext provider
  - Create React context for managing onboarding flow state
  - Implement state persistence using localStorage
  - Add methods for updating onboarding progress and user preferences
  - _Requirements: 1.5, 2.2, 8.4_

- [x] 1.3 Create useOnboardingFlow custom hook
  - Implement hook for consuming onboarding context
  - Add helper methods for checking onboarding completion status
  - Include utilities for managing onboarding step transitions
  - _Requirements: 1.5, 2.1, 8.1_

- [x] 2. Enhance location detection and user feedback
  - Improve the existing location detection system with better error handling
  - Add support for manual location entry with Google Places autocomplete
  - Create location accuracy indicators and user confirmation flows
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2.1 Enhance useGeolocation hook with onboarding features
  - Add location source tracking (GPS, IP, manual)
  - Implement location accuracy reporting
  - Add user confirmation state for detected locations
  - Include timestamp tracking for location data
  - _Requirements: 1.1, 1.2, 1.5_

- [x] 2.2 Create LocationDetector component
  - Build component for handling location detection UI
  - Implement loading states and error messaging
  - Add manual location entry with Google Places autocomplete
  - Include location accuracy indicators and confirmation buttons
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2.3 Enhance LocationProvider with onboarding state
  - Integrate onboarding state into existing LocationProvider
  - Add methods for handling manual location updates
  - Implement location preference persistence
  - _Requirements: 1.5, 8.4_

- [ ] 3. Create goal selection interface
  - Build the goal selection component that presents users with clear options
  - Implement responsive design for mobile and desktop experiences
  - Add contextual descriptions and visual cues for each goal option
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3.1 Create GoalSelector component
  - Build component with large, touch-friendly selection cards
  - Implement goal options with icons, titles, and descriptions
  - Add responsive design that works on mobile and desktop
  - Include accessibility features like ARIA labels and keyboard navigation
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3.2 Add goal preference persistence
  - Implement localStorage persistence for user's preferred goal
  - Add logic to highlight previously selected goals for returning users
  - Create methods for updating and retrieving goal preferences
  - _Requirements: 2.5, 8.4_

- [x] 4. Implement visual score indicator system
  - Create consistent visual indicators for welcoming scores across the app
  - Design iconography system using smile, neutral, and frown indicators
  - Implement color-coded system with accessibility considerations
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 4.1 Create ScoreIndicator component
  - Build reusable component for displaying welcoming scores
  - Implement multiple size variants (small, medium, large)
  - Add different display modes (icon, badge, full)
  - Include accessibility features with proper ARIA labels and alt text
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 4.2 Enhance BusinessCard component with score indicators
  - Integrate ScoreIndicator component into existing BusinessCard
  - Update layout to accommodate score display
  - Ensure consistent styling with existing design system
  - _Requirements: 7.1, 7.6_

- [x] 4.3 Update InteractiveMap with score indicator overlays
  - Add score indicators to map markers
  - Implement hover states showing detailed score information
  - Ensure markers are distinguishable and accessible
  - _Requirements: 7.1, 7.6_

- [x] 5. Create main onboarding wizard component
  - Build the orchestrating component that manages the entire onboarding flow
  - Implement step-by-step progression with progress indicators
  - Add navigation between onboarding steps and existing app pages
  - _Requirements: 1.1, 2.1, 8.1, 8.2, 8.3_

- [x] 5.1 Create OnboardingWizard component
  - Build wizard component that orchestrates the entire onboarding flow
  - Implement step progression (location → goal selection → completion)
  - Add progress indicators and navigation controls
  - Include responsive design for mobile and desktop
  - _Requirements: 1.1, 2.1, 8.1, 8.3_

- [x] 5.2 Add onboarding routing and navigation
  - Implement routing logic to show onboarding for new users
  - Add navigation between onboarding steps and main app
  - Create breadcrumb navigation for deep onboarding flows
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 6. Transform Index page into onboarding entry point
  - Modify the existing Index page to serve as the onboarding entry point
  - Add logic to detect new vs returning users
  - Implement smooth transitions between onboarding and normal app usage
  - _Requirements: 1.1, 2.1, 8.4_

- [x] 6.1 Modify Index.tsx for onboarding integration
  - Add onboarding detection logic to determine if user needs onboarding
  - Integrate OnboardingWizard component into Index page
  - Implement conditional rendering based on onboarding status
  - Maintain existing functionality for users who have completed onboarding
  - _Requirements: 1.1, 1.5, 2.1, 8.4_

- [x] 6.2 Add onboarding completion handling
  - Implement logic to handle onboarding completion
  - Add smooth transitions from onboarding to main app interface
  - Store onboarding completion status and user preferences
  - _Requirements: 2.1, 8.1, 8.4_

- [ ] 7. Enhance business marking flow with confirmation
  - Improve the existing business marking flow with score confirmation
  - Add visual feedback for calculated welcoming scores
  - Implement user confirmation step before finalizing scores
  - _Requirements: 3.4, 3.5, 3.6_

- [x] 7.1 Enhance MarkPage with score confirmation flow
  - Add score confirmation step after survey completion
  - Implement visual score display with ScoreIndicator component
  - Add user confirmation dialog with agree/disagree options
  - Include navigation back to business list after confirmation
  - _Requirements: 3.4, 3.5, 3.6_

- [x] 7.2 Add visual score feedback in marking flow
  - Display calculated welcoming score with appropriate iconography
  - Show score breakdown and explanation to users
  - Add visual feedback for score confirmation actions
  - _Requirements: 3.4, 7.1_

- [x] 8. Enhance business discovery flow with score display
  - Update the ExplorePage to show welcoming scores for businesses
  - Add filtering and sorting options based on welcoming scores
  - Implement detailed score information in business details
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 8.1 Update ExplorePage with score indicators
  - Integrate ScoreIndicator components into business listings
  - Add score-based filtering options to existing filters
  - Implement score sorting functionality
  - Update both list and map views with score information
  - _Requirements: 4.1, 4.2, 7.1_

- [x] 8.2 Add detailed score information display
  - Create detailed score breakdown view for businesses
  - Show basis for welcoming scores (survey response summary)
  - Add "Not Yet Rated" indicators for unrated businesses
  - _Requirements: 4.3, 4.4, 4.5_

- [x] 9. Implement registration prompt system
  - Create contextual registration invitation after users complete their goals
  - Build registration form with demographic fields and preferences
  - Add multiple response options (register, skip, remind later)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 9.1 Create RegistrationPrompt component
  - Build component that appears after goal completion
  - Implement goal-specific benefit messaging
  - Add multiple response options with clear CTAs
  - Include non-intrusive design that doesn't block app usage
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 9.2 Create registration form component
  - Build comprehensive registration form with required and optional fields
  - Implement form validation with inline feedback
  - Add demographic fields (name, location, gender, race, veteran status, political position)
  - Include privacy consent and terms acceptance checkboxes
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 9.3 Integrate registration prompt into user flows
  - Add registration prompt to business marking completion flow
  - Integrate prompt into business discovery flow
  - Implement logic to skip prompt for already registered users
  - Add "remind later" functionality with appropriate timing
  - _Requirements: 5.1, 5.4, 5.5_

- [x] 10. Add navigation flow optimization
  - Implement smooth transitions between different app sections
  - Add breadcrumb navigation and back button functionality
  - Create context-aware navigation that remembers user preferences
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 10.1 Implement enhanced navigation controls
  - Add breadcrumb navigation for deep onboarding flows
  - Implement context-aware back button functionality
  - Create smooth transitions between onboarding and main app
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 10.2 Add preference persistence and context memory
  - Implement user preference storage and retrieval
  - Add location and goal preference memory across sessions
  - Create easy access to location modification throughout the app
  - _Requirements: 8.4, 8.5_

- [x] 11. Implement accessibility and performance optimizations
  - Add comprehensive accessibility features throughout onboarding flow
  - Implement performance optimizations for mobile devices
  - Add loading states and error handling for all new components
  - _Requirements: 7.6, plus general accessibility and performance requirements_

- [x] 11.1 Add accessibility features
  - Implement screen reader compatibility for all new components
  - Add keyboard navigation support throughout onboarding flow
  - Include high contrast mode support and reduced motion preferences
  - Add proper ARIA labels and semantic HTML structure
  - _Requirements: 7.6_

- [x] 11.2 Implement performance optimizations
  - Add lazy loading for onboarding components
  - Implement efficient caching of location and preference data
  - Optimize mobile performance with touch-friendly interactions
  - Add loading states and skeleton screens for better perceived performance
  - _Requirements: General performance requirements_

- [-] 12. Add comprehensive error handling and testing
  - Implement robust error handling for all onboarding scenarios
  - Add retry mechanisms for network failures
  - Create comprehensive test coverage for new components and flows
  - _Requirements: Error handling requirements from design document_

- [x] 12.1 Implement comprehensive error handling
  - Add error boundaries for onboarding components
  - Implement retry mechanisms for location detection failures
  - Add graceful degradation for API failures
  - Create user-friendly error messages and recovery options
  - _Requirements: Error handling requirements_

- [ ] 12.2 Create test coverage for onboarding flow
  - Write unit tests for all new components and hooks
  - Add integration tests for complete onboarding flows
  - Create end-to-end tests for critical user paths
  - Test accessibility compliance and responsive design
  - _Requirements: Testing strategy from design document_

- [x] 13. Set up Firebase infrastructure and configuration
  - Configure Firebase project with authentication and Firestore database
  - Set up security rules for user data protection and cookie account access
  - Create Firebase service layer with authentication, ratings, and cookie account services
  - Implement basic Firebase connection and error handling
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

- [x] 13.1 Configure Firebase project and authentication
  - Create new Firebase project and configure authentication providers
  - Set up email/password authentication with proper security settings
  - Configure Firestore database with appropriate indexes and collections
  - Add Firebase configuration to environment variables
  - _Requirements: 6.1, 6.4, 6.5, 6.6_

- [x] 13.2 Create Firestore database structure and security rules
  - Design and implement database collections for users, businesses, ratings, and cookie accounts
  - Write comprehensive Firestore security rules for data protection
  - Set up proper indexing for efficient queries
  - Implement IP address validation and cookie account access rules
  - _Requirements: 7.2, 7.3, 8.1, 8.2, 8.3_

- [x] 13.3 Implement Firebase service layer
  - Create authentication service with signup, login, and cookie account methods
  - Build ratings service for business creation, rating submission, and aggregation
  - Implement cookie account service with expiration and IP tracking
  - Add error handling and retry mechanisms for all Firebase operations
  - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.4, 7.1, 7.2_

- [x] 14. Create authentication system with three account types
  - Build AuthProvider context and useAuth hook for authentication state management
  - Implement SignupForm component for full account registration
  - Create LoginForm component for returning user authentication
  - Build AccountOptions component to present three account type choices
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.9, 6.1, 6.2, 6.3, 6.4_

- [x] 14.1 Create AuthProvider context and authentication hooks
  - Implement AuthProvider context with Firebase authentication integration
  - Create useAuth hook for consuming authentication state
  - Add useCookieAccount hook for cookie-based account management
  - Implement automatic account detection and restoration on app startup
  - _Requirements: 5.6, 5.7, 5.8, 7.4, 7.5_

- [x] 14.2 Build SignupForm component for full account registration
  - Create comprehensive signup form with email, password, and demographic fields
  - Implement form validation with password strength requirements
  - Add privacy consent and terms acceptance checkboxes
  - Integrate with Firebase Authentication for account creation
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

- [x] 14.3 Create LoginForm component for returning users
  - Build login form with email/password authentication
  - Add "remember me" functionality and password reset integration
  - Implement error handling for invalid credentials
  - Add automatic account data restoration after successful login
  - _Requirements: 6.8_

- [x] 14.4 Implement AccountOptions component
  - Create component presenting three account type choices with clear benefits
  - Add data retention policy explanations for each account type
  - Implement goal-specific benefit messaging
  - Include non-intrusive design that doesn't block app usage
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 15. Implement cookie-based account system with IP tracking
  - Create cookie account generation and management system
  - Implement IP address tracking and validation
  - Add 45-day expiration system with activity-based renewal
  - Build automatic cookie account creation for declined users
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

- [x] 15.1 Create cookie account generation and storage
  - Implement secure cookie ID generation using cryptographic methods
  - Create local storage system for cookie account identifiers
  - Add cookie account creation in Firebase with IP address binding
  - Implement automatic cookie detection and restoration
  - _Requirements: 7.1, 7.2, 7.4_

- [x] 15.2 Implement IP address tracking and validation
  - Add IP address capture and storage for all account types
  - Implement IP address validation for cookie account access
  - Create IP address anonymization after account expiration
  - Add protection against cookie account hijacking
  - _Requirements: 7.2, 7.3, 7.8_

- [x] 15.3 Build 45-day expiration system with activity tracking
  - Implement automatic expiration after 45 days of inactivity
  - Create activity tracking system that updates on app visits
  - Add expired account detection and cleanup
  - Build automatic new user treatment for expired accounts
  - _Requirements: 7.5, 7.6, 7.7_

- [x] 16. Create business rating database with Firebase integration
  - Implement business creation and storage system in Firebase
  - Build rating submission system with survey response storage
  - Create rating aggregation and average calculation system
  - Add neutral default status for all new businesses
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

- [ ] 16.1 Implement business creation and storage system
  - Create business document structure in Firestore
  - Implement automatic business creation from Google Places data
  - Add business search and retrieval by location
  - Set neutral/no rating as default status for new businesses
  - _Requirements: 8.4, 8.5_

- [x] 16.2 Build rating submission and storage system
  - Create rating document structure with survey responses
  - Implement rating submission with user and IP address tracking
  - Add duplicate rating prevention for same user/business combination
  - Store individual ratings with full survey response data
  - _Requirements: 8.1, 8.2_

- [x] 16.3 Create rating aggregation and calculation system
  - Implement automatic rating aggregation when new ratings are submitted
  - Calculate average scores and welcoming level classifications
  - Update business documents with aggregated rating data
  - Add real-time rating updates and synchronization
  - _Requirements: 8.3, 8.6, 8.7_

- [x] 17. Update existing components with Firebase integration
  - Enhance MarkPage to save ratings to Firebase database
  - Update ExplorePage to display ratings from Firebase
  - Modify BusinessCard and ScoreIndicator to use Firebase data
  - Add real-time rating updates throughout the application
  - _Requirements: 8.1, 8.3, 8.6, 8.7, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 17.1 Enhance MarkPage with Firebase rating submission
  - Integrate rating submission with Firebase ratings service
  - Add user authentication check before allowing rating submission
  - Implement rating confirmation with Firebase storage
  - Add error handling for rating submission failures
  - _Requirements: 8.1, 8.2_

- [x] 17.2 Update ExplorePage with Firebase rating display
  - Integrate Firebase ratings data into business listings
  - Add real-time rating updates using Firestore listeners
  - Implement rating-based filtering and sorting
  - Display community average ratings and rating counts
  - _Requirements: 8.3, 8.6, 8.7, 10.1, 10.2_

- [x] 17.3 Enhance BusinessCard and ScoreIndicator with Firebase data
  - Update ScoreIndicator to display Firebase rating data
  - Modify BusinessCard to show aggregated ratings and rating counts
  - Add neutral/no rating indicators for unrated businesses
  - Implement real-time rating updates in business cards
  - _Requirements: 10.1, 10.5, 10.6_

- [x] 18. Implement account migration and data management
  - Create system to migrate cookie account data to full accounts
  - Implement user profile management for both account types
  - Add account data export and deletion for GDPR compliance
  - Build account activity tracking and management
  - _Requirements: 6.6, 7.8_

- [x] 18.1 Create cookie to full account migration system
  - Implement data migration when cookie users create full accounts
  - Transfer all ratings and preferences to new full account
  - Clean up old cookie account data after successful migration
  - Add migration confirmation and error handling
  - _Requirements: 6.6, 7.8_

- [x] 18.2 Build user profile management system
  - Create profile editing interface for both account types
  - Implement demographic data updates and privacy settings
  - Add account deletion functionality with data cleanup
  - Build data export functionality for GDPR compliance
  - _Requirements: 6.2, 6.3, 6.6_

- [x] 19. Add comprehensive error handling and security measures
  - Implement robust error handling for all Firebase operations
  - Add security measures to prevent rating manipulation
  - Create audit trail for all rating submissions
  - Implement rate limiting and abuse prevention
  - _Requirements: Security considerations from design document_

- [x] 19.1 Implement Firebase error handling and retry mechanisms
  - Add comprehensive error handling for authentication failures
  - Implement retry mechanisms for network and database errors
  - Create user-friendly error messages for all failure scenarios
  - Add offline mode handling and data synchronization
  - _Requirements: Error handling requirements from design document_

- [x] 19.2 Add security measures and abuse prevention
  - Implement duplicate rating prevention per user/business
  - Add rate limiting for rating submissions and account creation
  - Create audit trail for all rating and account operations
  - Implement protection against rating manipulation and spam
  - _Requirements: Security considerations from design document_

- [x] 20. Update onboarding flow with authentication integration
  - Modify OnboardingWizard to include account detection and restoration
  - Update RegistrationPrompt to use new AccountOptions component
  - Integrate authentication state into onboarding flow navigation
  - Add account-aware onboarding completion and data persistence
  - _Requirements: 5.1, 5.6, 5.9, 6.6, 7.4, 7.8_

- [x] 20.1 Enhance OnboardingWizard with authentication
  - Add account detection at onboarding start
  - Implement automatic data restoration for returning users
  - Integrate authentication state into onboarding step progression
  - Add account-specific onboarding completion handling
  - _Requirements: 5.6, 5.7, 5.8, 7.4_

- [x] 20.2 Update RegistrationPrompt with AccountOptions
  - Replace existing registration prompt with new AccountOptions component
  - Integrate three account type selection into user flows
  - Add account creation handling for each option type
  - Implement smooth transitions between account creation and app usage
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_