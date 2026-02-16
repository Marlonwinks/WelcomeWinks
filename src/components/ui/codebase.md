Welcome Winks - Complete Codebase Analysis
🏗️ Project Architecture
Welcome Winks is a React-based location discovery app that helps users find welcoming places through community insights. It's built with modern web technologies and follows a component-based architecture.

📦 Tech Stack & Dependencies
Core Framework:

React 18.3.1 with TypeScript
Vite for build tooling and development
React Router DOM for client-side routing
UI & Styling:

Tailwind CSS with custom design system
shadcn/ui component library (Radix UI primitives)
Lucide React for icons
Custom CSS variables for theming (light/dark mode)
State Management & Data:

TanStack React Query for server state
React Context for location state
Supabase for backend (configured but not actively used)
External Services:

Google Maps API with Places service
Google Places Autocomplete
IP geolocation fallback service
🎨 Design System
Color Palette:

Primary: Calm teal-blue (#3AA4D8)
Secondary: Warm amber (#FFB86B)
Success: Green (#34C759)
Destructive: Red (#FF453A)
Warning: Yellow (#FFCC00)
Typography:

Font: Inter with font feature settings
Responsive sizing system (xs to 2xl)
Animations:

Custom keyframes for fade, scale, slide effects
Pulse glow and float animations
Smooth transitions with cubic-bezier easing
📱 Application Structure
Layout System:

AppShell: Responsive wrapper with mobile/desktop layouts
Mobile: Bottom navigation with floating action button
Desktop: Left sidebar with top header
Responsive breakpoint: 768px
Core Pages:

Index (/) - Hero landing with search and nearby places
ExplorePage (/explore) - Business discovery with map/list views
MarkPage (/mark) - Survey flow for rating businesses
BusinessPage (/business/:id) - Individual business details
ProfilePage (/profile) - User profile and settings
NotificationsPage (/notifications) - User notifications
AdminDashboard (/admin) - Analytics and moderation
🗺️ Location & Maps Integration
Location Services:

Browser geolocation with IP fallback
Google Geocoding for address resolution
LocationProvider context for global state
Maps Features:

Interactive Google Maps with custom markers
Places search with 5km radius
Business type filtering (restaurants, cafes, bars, bookstores)
InfoWindow popups with business details
Search & Autocomplete:

Google Places Autocomplete API
Debounced search with 500ms delay
Vite proxy configuration for CORS handling
📊 Business Rating System
"Winks Score" Algorithm: The app uses a unique survey-based rating system with 6 questions:

"Would President Trump be welcome?" (negative scoring)
"Would President Obama be welcome?" (positive scoring)
"Would a person of color feel comfortable?" (positive scoring)
"Would LGBTQ+ member feel safe?" (positive scoring)
"Would undocumented individual feel safe?" (positive scoring)
"Would person carrying firearm be normal?" (negative scoring)
Scoring Logic:

Yes/No/Probably/Probably Not options
Score range: -2 to +2 per question
Final score: Sum of all question scores
Visual indicators: Smile (>5), Frown (<-5), Neutral (between)
🎯 Key Components
Business Components:

BusinessCard: Displays business info with Winks score
DonutChart: Circular progress indicator for scores
Map Components:

InteractiveMap: Google Maps integration with markers
MapMarker: Custom marker with score visualization
MapView: Placeholder map with mock data
Layout Components:

BottomNavigation: Mobile navigation with floating CTA
DesktopSidebar: Desktop navigation sidebar
TopHeader: Desktop header with search
CookieConsent: GDPR compliance component
🔧 Custom Hooks
Location Hooks:

useGeolocation: Browser + IP geolocation
useLocation: Context consumer for location state
Google Services Hooks:

usePlacesAutocomplete: Debounced place suggestions
usePlaceDetails: Fetch detailed place information
useGooglePlacesService: Places service initialization
Utility Hooks:

useIsMobile: Responsive breakpoint detection
useToast: Toast notification system
🎨 Styling Architecture
CSS Custom Properties:

Comprehensive design tokens in :root
Dark mode variants with .dark class
Gradient definitions and shadow systems
Utility Classes:

.text-gradient: Brand gradient text
.shadow-brand: Consistent shadow styling
.interactive-scale: Hover scale effects
.glass: Glassmorphism effect
.floating-cta: Elevated button styling
Animation Classes:

.marker-pulse: Map marker animation
.btn-hero: Primary CTA button styling
.card-glass: Glass card variant
📁 File Organization
src/
├── components/
│   ├── business/     # Business-related components
│   ├── charts/       # Data visualization
│   ├── layout/       # App shell and navigation
│   ├── maps/         # Google Maps integration
│   └── ui/           # shadcn/ui components
├── contexts/         # React contexts
├── hooks/           # Custom React hooks
├── integrations/    # External service integrations
├── lib/             # Utility functions
└── pages/           # Route components
🔑 Environment & Configuration
Environment Variables:

VITE_GOOGLE_PLACES_API_KEY: Google Maps/Places API key
Build Configuration:

Vite with React SWC plugin
TypeScript with path aliases (@/*)
Proxy configuration for Google Maps API
Deployment:

Vercel configuration with SPA routing
Supabase backend integration ready
🚀 Development Workflow
Available Scripts:

npm run dev: Development server
npm run build: Production build
npm run build:dev: Development build
npm run lint: ESLint checking
npm run preview: Preview build
Code Quality:

TypeScript with relaxed settings
ESLint with React hooks rules
Prettier-compatible formatting
🔮 Current State & Limitations
Implemented Features:

✅ Responsive layout system
✅ Google Maps integration
✅ Location services
✅ Business search and display
✅ Survey-based rating system
✅ Theme system (light/dark)
✅ Mobile-first design
Mock Data Areas:

Business ratings (Winks scores default to 0)
User profiles and authentication
Admin dashboard analytics
Notification system
Most business lists use Google Places data
Integration Opportunities:

Supabase database is configured but not actively used
Real user authentication system
Persistent business ratings storage
User-generated content and reviews