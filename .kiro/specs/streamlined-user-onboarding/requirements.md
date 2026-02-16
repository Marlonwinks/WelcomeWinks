# Requirements Document

## Introduction

This feature enhances the Welcome Winks app with a streamlined user onboarding experience that efficiently guides users to accomplish their primary goals: either marking a business's political leanings ("Winking") or discovering welcoming businesses in their area. The enhancement focuses on location-first interaction, clear goal selection, and intuitive navigation paths that reduce friction and improve user engagement.

## Requirements

### Requirement 1: Location-First Onboarding

**User Story:** As a new user visiting Welcome Winks, I want the app to automatically detect my location and present it to me first, so that I can immediately see relevant businesses in my area without manual input.

#### Acceptance Criteria

1. WHEN a user first accesses the site THEN the system SHALL attempt to detect their device location using browser geolocation
2. IF geolocation permission is denied THEN the system SHALL fall back to IP-based location detection
3. WHEN location is successfully detected THEN the system SHALL display the user's current location prominently
4. WHEN location detection fails THEN the system SHALL prompt the user to manually enter their location
5. IF the user's location is already known from previous visits THEN the system SHALL display it immediately without re-requesting permission

### Requirement 2: Goal Selection Interface

**User Story:** As a user with a detected location, I want to be presented with clear options for what I want to do next, so that I can quickly navigate to either marking a business or finding welcoming establishments.

#### Acceptance Criteria

1. WHEN location is established THEN the system SHALL present two primary action options: "Wink at a Business" and "Find Welcoming Places"
2. WHEN the user selects "Wink at a Business" THEN the system SHALL navigate to the business marking flow
3. WHEN the user selects "Find Welcoming Places" THEN the system SHALL navigate to the business discovery flow
4. WHEN presenting options THEN the system SHALL use clear, intuitive language and visual cues
5. IF the user is returning THEN the system SHALL remember their previous preference and highlight it

### Requirement 3: Business Marking Flow (Scenario 1)

**User Story:** As a user who wants to mark a business's political leanings, I want to see nearby businesses in both list and map format, so that I can easily select and evaluate the establishment I'm familiar with.

#### Acceptance Criteria

1. WHEN entering the business marking flow THEN the system SHALL display businesses within the user's immediate area in both list and map views
2. WHEN displaying businesses THEN the system SHALL show establishments within a reasonable radius (5km) of the user's location
3. WHEN a user selects a business from either list or map THEN the system SHALL present the political leaning survey questions
4. WHEN survey questions are completed THEN the system SHALL calculate and display the welcoming score (Very Welcoming, Moderately Welcoming, Not Very Welcoming)
5. WHEN the score is displayed THEN the system SHALL ask for user confirmation of the assessment
6. WHEN user confirms the assessment THEN the system SHALL return to the map view showing all businesses with updated scoring
7. WHEN displaying businesses on map THEN the system SHALL use distinct visual indicators (icons) for different welcoming score levels

### Requirement 4: Business Discovery Flow (Scenario 2)

**User Story:** As a user who wants to understand how welcoming businesses are, I want to see the political leaning scores of nearby establishments, so that I can make informed decisions about where to patronize.

#### Acceptance Criteria

1. WHEN entering the business discovery flow THEN the system SHALL display nearby businesses with their current welcoming scores
2. WHEN displaying business scores THEN the system SHALL use consistent visual indicators matching the marking flow
3. WHEN a user selects a business THEN the system SHALL show detailed welcoming information and score breakdown
4. WHEN viewing business details THEN the system SHALL display the basis for the welcoming score (survey responses)
5. IF a business has no score THEN the system SHALL indicate "Not Yet Rated" and offer option to be the first to rate

### Requirement 5: Authentication Options and Account Management

**User Story:** As a user who has completed either goal, I want to be offered multiple account options including full registration, cookie-based temporary accounts, or declining altogether, so that I can choose my preferred level of engagement while still having my data preserved.

#### Acceptance Criteria

1. WHEN a user completes their primary goal (marking or discovering) THEN the system SHALL present three account options: "Create Full Account", "Use Temporary Account", or "Decline"
2. WHEN presenting account options THEN the system SHALL clearly explain benefits of each option and data retention policies
3. WHEN user chooses "Create Full Account" THEN the system SHALL present a streamlined registration form with email/password signup
4. WHEN user chooses "Use Temporary Account" THEN the system SHALL create a cookie-based account tied to their IP address
5. WHEN user declines all account options THEN the system SHALL create a cookie-based account automatically and explain data will be saved locally
6. WHEN creating cookie-based accounts THEN the system SHALL store the user's IP address and set account expiration to 45 days from last activity
7. WHEN user returns within 45 days THEN the system SHALL automatically restore their cookie-based account data
8. WHEN cookie-based account expires (45+ days inactive) THEN the system SHALL clear local data and treat user as new
9. IF user is already registered or has active cookie account THEN the system SHALL skip the account creation prompt

### Requirement 6: Full Account Registration and Data Collection

**User Story:** As a user choosing to create a full account, I want to provide relevant demographic and preference information through a secure signup process, so that the system can provide personalized recommendations and preserve my data permanently.

#### Acceptance Criteria

1. WHEN user chooses full account registration THEN the system SHALL present a signup form with email and password fields
2. WHEN collecting registration data THEN the system SHALL include optional demographic fields: name, location, gender, race, veteran status, political position
3. WHEN presenting registration form THEN the system SHALL clearly indicate which fields are required (email, password) vs optional
4. WHEN user submits registration THEN the system SHALL validate email format, password strength, and required field completion
5. WHEN registration is complete THEN the system SHALL create Firebase user account and store IP address for account association
6. WHEN full account is created THEN the system SHALL migrate any existing cookie-based data to the permanent account
7. WHEN collecting sensitive information THEN the system SHALL include privacy notices and data usage explanations
8. WHEN user has full account THEN the system SHALL provide login functionality for returning users

### Requirement 10: Visual Score Indicators

**User Story:** As a user viewing businesses on maps and lists, I want to quickly understand their welcoming scores through clear visual indicators, so that I can make rapid decisions without reading detailed information.

#### Acceptance Criteria

1. WHEN displaying businesses THEN the system SHALL use consistent iconography for welcoming score levels
2. WHEN showing Very Welcoming businesses THEN the system SHALL use a positive visual indicator (e.g., green smile icon)
3. WHEN showing Moderately Welcoming businesses THEN the system SHALL use a neutral visual indicator (e.g., yellow neutral icon)
4. WHEN showing Not Very Welcoming businesses THEN the system SHALL use a negative visual indicator (e.g., red frown icon)
5. WHEN showing unrated businesses THEN the system SHALL use a neutral/no rating indicator (e.g., gray neutral icon) as the default state
6. WHEN new businesses are added to database THEN the system SHALL initialize them with neutral/no rating status
7. WHEN icons are displayed THEN the system SHALL ensure they are accessible and clearly distinguishable for users with visual impairments

### Requirement 7: Cookie-Based Temporary Account System

**User Story:** As a user who wants to use the app without full registration, I want my data and contributions to be saved temporarily through a cookie-based system, so that I can return and continue where I left off without losing my progress.

#### Acceptance Criteria

1. WHEN user chooses temporary account or declines registration THEN the system SHALL create a unique cookie-based identifier
2. WHEN creating cookie account THEN the system SHALL store user's IP address and current timestamp in Firebase
3. WHEN user makes contributions (ratings, preferences) THEN the system SHALL associate data with their cookie identifier
4. WHEN user returns to the app THEN the system SHALL check for existing cookie and restore associated data
5. WHEN user is active (visits app) THEN the system SHALL update the last activity timestamp to reset the 45-day expiration
6. WHEN 45 days pass without activity THEN the system SHALL mark cookie account as expired and clear associated data
7. WHEN expired user returns THEN the system SHALL treat them as a new user and offer account options again
8. WHEN user with cookie account later chooses full registration THEN the system SHALL migrate cookie data to permanent account

### Requirement 8: Firebase Business Rating Database

**User Story:** As a user rating businesses, I want my ratings to be stored in a persistent database so that other users can see accumulated ratings and the community can build a comprehensive database of business political climates.

#### Acceptance Criteria

1. WHEN user submits a business rating THEN the system SHALL store the rating in Firebase Firestore database
2. WHEN storing ratings THEN the system SHALL include business ID, user identifier (full account or cookie), rating scores, and timestamp
3. WHEN displaying businesses THEN the system SHALL calculate average ratings from all stored ratings in Firebase
4. WHEN new business is rated for first time THEN the system SHALL create new business record with initial neutral status
5. WHEN business has no ratings THEN the system SHALL display "Not Yet Rated" status with neutral indicators
6. WHEN multiple users rate same business THEN the system SHALL aggregate scores and display community average
7. WHEN user views business details THEN the system SHALL show rating breakdown and number of contributors
8. WHEN storing business data THEN the system SHALL include Google Places ID, name, address, and location coordinates

### Requirement 9: Navigation Flow Optimization

**User Story:** As a user moving through the app, I want smooth transitions between different sections and the ability to easily return to previous steps, so that I can efficiently accomplish multiple goals in one session.

#### Acceptance Criteria

1. WHEN user completes a task THEN the system SHALL provide clear options for next actions
2. WHEN user wants to switch between marking and discovery modes THEN the system SHALL allow easy navigation without losing context
3. WHEN user is deep in a flow THEN the system SHALL provide breadcrumb navigation or clear back options
4. WHEN user returns to main interface THEN the system SHALL remember their location and previous preferences
5. IF user wants to change location THEN the system SHALL provide easy access to location modification