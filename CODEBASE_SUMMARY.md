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