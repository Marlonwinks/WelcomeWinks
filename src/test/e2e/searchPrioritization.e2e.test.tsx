import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import App from '../../App';
import { PreferencesProvider } from '../../hooks/usePreferencePersistence';

// Mock Firebase
vi.mock('../../integrations/firebase/client', () => ({
  auth: {
    currentUser: { uid: 'test-user-id' }
  },
  db: {}
}));

// Mock Google Maps
const mockPlaces = [
  {
    place_id: '1',
    name: 'Italian Bistro',
    types: ['restaurant', 'italian_restaurant'],
    price_level: 2,
    rating: 4.5,
    geometry: { location: { lat: () => 40.7128, lng: () => -74.0060 } }
  },
  {
    place_id: '2',
    name: 'Vegan Cafe',
    types: ['restaurant', 'cafe', 'vegan_restaurant'],
    price_level: 1,
    rating: 4.8,
    geometry: { location: { lat: () => 40.7130, lng: () => -74.0062 } }
  },
  {
    place_id: '3',
    name: 'Steakhouse',
    types: ['restaurant', 'steakhouse'],
    price_level: 4,
    rating: 4.3,
    geometry: { location: { lat: () => 40.7125, lng: () => -74.0058 } }
  }
];

describe('Search Result Prioritization - End-to-End', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Complete User Flow: Set Preferences → Search → View Prioritized Results', () => {
    it('should allow user to set preferences and see prioritized results', async () => {
      const user = userEvent.setup();
      
      render(
        <BrowserRouter>
          <PreferencesProvider>
            <App />
          </PreferencesProvider>
        </BrowserRouter>
      );

      // Navigate to profile page
      const profileLink = await screen.findByRole('link', { name: /profile/i });
      await user.click(profileLink);

      // Open dining preferences section
      const preferencesSection = await screen.findByText(/dining preferences/i);
      expect(preferencesSection).toBeInTheDocument();

      // Set cuisine preferences
      const cuisineSelect = screen.getByLabelText(/preferred cuisines/i);
      await user.click(cuisineSelect);
      await user.click(screen.getByText(/italian/i));
      
      // Set price range
      const priceSlider = screen.getByLabelText(/price range/i);
      await user.click(priceSlider);

      // Set dietary restrictions
      const vegetarianCheckbox = screen.getByLabelText(/vegetarian/i);
      await user.click(vegetarianCheckbox);

      // Save preferences
      const saveButton = screen.getByRole('button', { name: /save preferences/i });
      await user.click(saveButton);

      // Verify save success
      await waitFor(() => {
        expect(screen.getByText(/preferences saved/i)).toBeInTheDocument();
      });

      // Navigate to explore page
      const exploreLink = screen.getByRole('link', { name: /explore/i });
      await user.click(exploreLink);

      // Verify prioritization is active
      await waitFor(() => {
        expect(screen.getByText(/prioritized by preferences/i)).toBeInTheDocument();
      });

      // Verify results are displayed with match indicators
      const businessCards = screen.getAllByTestId('business-card');
      expect(businessCards.length).toBeGreaterThan(0);

      // Verify match quality indicators are present
      const matchIndicators = screen.getAllByTestId('match-quality-indicator');
      expect(matchIndicators.length).toBeGreaterThan(0);
    });
  });

  describe('Preference Updates and Result Re-prioritization', () => {
    it('should re-prioritize results when preferences are updated', async () => {
      const user = userEvent.setup();
      
      // Set initial preferences
      localStorage.setItem('userPreferences', JSON.stringify({
        dining: {
          cuisines: { preferred: ['italian'], disliked: [], importance: 'high' },
          priceRange: { min: 1, max: 3, importance: 'medium' }
        }
      }));

      render(
        <BrowserRouter>
          <PreferencesProvider>
            <App />
          </PreferencesProvider>
        </BrowserRouter>
      );

      // Go to explore page
      const exploreLink = await screen.findByRole('link', { name: /explore/i });
      await user.click(exploreLink);

      // Capture initial order
      const initialCards = screen.getAllByTestId('business-card');
      const initialFirstBusiness = within(initialCards[0]).getByTestId('business-name').textContent;

      // Update preferences
      const profileLink = screen.getByRole('link', { name: /profile/i });
      await user.click(profileLink);

      // Change cuisine preference
      const cuisineSelect = screen.getByLabelText(/preferred cuisines/i);
      await user.click(cuisineSelect);
      await user.click(screen.getByText(/vegan/i));

      const saveButton = screen.getByRole('button', { name: /save preferences/i });
      await user.click(saveButton);

      // Return to explore page
      await user.click(screen.getByRole('link', { name: /explore/i }));

      // Verify results have changed
      await waitFor(() => {
        const updatedCards = screen.getAllByTestId('business-card');
        const updatedFirstBusiness = within(updatedCards[0]).getByTestId('business-name').textContent;
        expect(updatedFirstBusiness).not.toBe(initialFirstBusiness);
      });
    });
  });

  describe('Edge Cases and Fallback Scenarios', () => {
    it('should show default sorting when no preferences are set', async () => {
      render(
        <BrowserRouter>
          <PreferencesProvider>
            <App />
          </PreferencesProvider>
        </BrowserRouter>
      );

      const exploreLink = await screen.findByRole('link', { name: /explore/i });
      await userEvent.click(exploreLink);

      // Should show prompt to set preferences
      await waitFor(() => {
        expect(screen.getByText(/set preferences/i)).toBeInTheDocument();
      });

      // Results should still be displayed
      const businessCards = screen.getAllByTestId('business-card');
      expect(businessCards.length).toBeGreaterThan(0);
    });

    it('should handle no matching results gracefully', async () => {
      // Set very restrictive preferences
      localStorage.setItem('userPreferences', JSON.stringify({
        dining: {
          cuisines: { preferred: ['ethiopian'], disliked: [], importance: 'must-have' },
          priceRange: { min: 4, max: 4, importance: 'must-have' },
          dietary: { restrictions: ['kosher'], importance: 'must-have' }
        }
      }));

      render(
        <BrowserRouter>
          <PreferencesProvider>
            <App />
          </PreferencesProvider>
        </BrowserRouter>
      );

      const exploreLink = await screen.findByRole('link', { name: /explore/i });
      await userEvent.click(exploreLink);

      // Should show no matches message
      await waitFor(() => {
        expect(screen.getByText(/no matches found/i)).toBeInTheDocument();
      });

      // Should suggest adjusting preferences
      expect(screen.getByText(/adjust.*preferences/i)).toBeInTheDocument();
    });

    it('should handle missing business attributes gracefully', async () => {
      localStorage.setItem('userPreferences', JSON.stringify({
        dining: {
          cuisines: { preferred: ['italian'], disliked: [], importance: 'high' }
        }
      }));

      render(
        <BrowserRouter>
          <PreferencesProvider>
            <App />
          </PreferencesProvider>
        </BrowserRouter>
      );

      const exploreLink = await screen.findByRole('link', { name: /explore/i });
      await userEvent.click(exploreLink);

      // Should still display results even with missing attributes
      await waitFor(() => {
        const businessCards = screen.getAllByTestId('business-card');
        expect(businessCards.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Match Indicators Display', () => {
    it('should display match quality indicators correctly', async () => {
      localStorage.setItem('userPreferences', JSON.stringify({
        dining: {
          cuisines: { preferred: ['italian'], disliked: [], importance: 'high' },
          priceRange: { min: 1, max: 3, importance: 'medium' }
        }
      }));

      render(
        <BrowserRouter>
          <PreferencesProvider>
            <App />
          </PreferencesProvider>
        </BrowserRouter>
      );

      const exploreLink = await screen.findByRole('link', { name: /explore/i });
      await userEvent.click(exploreLink);

      // Verify match indicators are present
      await waitFor(() => {
        const indicators = screen.getAllByTestId('match-quality-indicator');
        expect(indicators.length).toBeGreaterThan(0);
      });

      // Click on a business card to see detailed match breakdown
      const firstCard = screen.getAllByTestId('business-card')[0];
      await userEvent.click(firstCard);

      // Verify detailed match information is shown
      await waitFor(() => {
        expect(screen.getByTestId('preference-match-details')).toBeInTheDocument();
      });

      // Verify score breakdown is displayed
      expect(screen.getByText(/cuisine score/i)).toBeInTheDocument();
      expect(screen.getByText(/price score/i)).toBeInTheDocument();
    });

    it('should show high match indicator for strongly matching businesses', async () => {
      localStorage.setItem('userPreferences', JSON.stringify({
        dining: {
          cuisines: { preferred: ['italian'], disliked: [], importance: 'high' },
          priceRange: { min: 2, max: 2, importance: 'high' }
        }
      }));

      render(
        <BrowserRouter>
          <PreferencesProvider>
            <App />
          </PreferencesProvider>
        </BrowserRouter>
      );

      const exploreLink = await screen.findByRole('link', { name: /explore/i });
      await userEvent.click(exploreLink);

      await waitFor(() => {
        const highMatchIndicator = screen.getByText(/excellent match/i);
        expect(highMatchIndicator).toBeInTheDocument();
      });
    });
  });

  describe('Interaction Tracking and Suggestions', () => {
    it('should track business views and generate suggestions', async () => {
      const user = userEvent.setup();

      localStorage.setItem('userPreferences', JSON.stringify({
        dining: {
          cuisines: { preferred: ['italian'], disliked: [], importance: 'medium' },
          learningData: {
            viewedBusinesses: [],
            savedBusinesses: [],
            ratedBusinesses: []
          }
        }
      }));

      render(
        <BrowserRouter>
          <PreferencesProvider>
            <App />
          </PreferencesProvider>
        </BrowserRouter>
      );

      // View multiple vegan restaurants
      const exploreLink = await screen.findByRole('link', { name: /explore/i });
      await user.click(exploreLink);

      // Click on vegan cafe multiple times
      const veganCafe = await screen.findByText(/vegan cafe/i);
      await user.click(veganCafe);
      
      // Wait and go back
      await new Promise(resolve => setTimeout(resolve, 3000));
      await user.click(screen.getByRole('button', { name: /back/i }));

      // View another vegan place
      await user.click(veganCafe);
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Go to profile to see suggestions
      await user.click(screen.getByRole('link', { name: /profile/i }));

      // Should see preference suggestions
      await waitFor(() => {
        expect(screen.getByText(/preference suggestions/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Should suggest adding vegan to preferences
      expect(screen.getByText(/vegan/i)).toBeInTheDocument();
    });
  });

  describe('Firebase Persistence and Sync', () => {
    it('should persist preferences to Firebase and sync', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <PreferencesProvider>
            <App />
          </PreferencesProvider>
        </BrowserRouter>
      );

      // Set preferences
      const profileLink = await screen.findByRole('link', { name: /profile/i });
      await user.click(profileLink);

      const cuisineSelect = screen.getByLabelText(/preferred cuisines/i);
      await user.click(cuisineSelect);
      await user.click(screen.getByText(/italian/i));

      const saveButton = screen.getByRole('button', { name: /save preferences/i });
      await user.click(saveButton);

      // Verify Firebase save was called
      await waitFor(() => {
        expect(screen.getByText(/synced to cloud/i)).toBeInTheDocument();
      });

      // Clear localStorage to simulate new session
      localStorage.clear();

      // Reload and verify preferences are loaded from Firebase
      render(
        <BrowserRouter>
          <PreferencesProvider>
            <App />
          </PreferencesProvider>
        </BrowserRouter>
      );

      await user.click(screen.getByRole('link', { name: /profile/i }));

      await waitFor(() => {
        expect(screen.getByText(/italian/i)).toBeInTheDocument();
      });
    });
  });

  describe('Offline Behavior', () => {
    it('should work offline with cached preferences', async () => {
      // Set preferences in localStorage
      localStorage.setItem('userPreferences', JSON.stringify({
        dining: {
          cuisines: { preferred: ['italian'], disliked: [], importance: 'high' }
        }
      }));

      // Simulate offline
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

      render(
        <BrowserRouter>
          <PreferencesProvider>
            <App />
          </PreferencesProvider>
        </BrowserRouter>
      );

      const exploreLink = await screen.findByRole('link', { name: /explore/i });
      await userEvent.click(exploreLink);

      // Should show offline indicator
      await waitFor(() => {
        expect(screen.getByText(/offline/i)).toBeInTheDocument();
      });

      // Should still show prioritized results using cached preferences
      await waitFor(() => {
        expect(screen.getByText(/prioritized by preferences/i)).toBeInTheDocument();
      });

      const businessCards = screen.getAllByTestId('business-card');
      expect(businessCards.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility Compliance', () => {
    it('should support keyboard navigation in preferences manager', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <PreferencesProvider>
            <App />
          </PreferencesProvider>
        </BrowserRouter>
      );

      const profileLink = await screen.findByRole('link', { name: /profile/i });
      await user.click(profileLink);

      // Tab through preference controls
      await user.tab();
      expect(screen.getByLabelText(/preferred cuisines/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/price range/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/dietary restrictions/i)).toHaveFocus();
    });

    it('should have proper ARIA labels on match indicators', async () => {
      localStorage.setItem('userPreferences', JSON.stringify({
        dining: {
          cuisines: { preferred: ['italian'], disliked: [], importance: 'high' }
        }
      }));

      render(
        <BrowserRouter>
          <PreferencesProvider>
            <App />
          </PreferencesProvider>
        </BrowserRouter>
      );

      const exploreLink = await screen.findByRole('link', { name: /explore/i });
      await userEvent.click(exploreLink);

      await waitFor(() => {
        const matchIndicator = screen.getAllByTestId('match-quality-indicator')[0];
        expect(matchIndicator).toHaveAttribute('aria-label');
        expect(matchIndicator.getAttribute('aria-label')).toMatch(/match quality/i);
      });
    });

    it('should announce result count changes to screen readers', async () => {
      const user = userEvent.setup();

      localStorage.setItem('userPreferences', JSON.stringify({
        dining: {
          cuisines: { preferred: ['italian'], disliked: [], importance: 'medium' }
        }
      }));

      render(
        <BrowserRouter>
          <PreferencesProvider>
            <App />
          </PreferencesProvider>
        </BrowserRouter>
      );

      const exploreLink = await screen.findByRole('link', { name: /explore/i });
      await user.click(exploreLink);

      // Verify live region for result count
      await waitFor(() => {
        const liveRegion = screen.getByRole('status');
        expect(liveRegion).toBeInTheDocument();
        expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('should use color-blind friendly colors for match indicators', async () => {
      localStorage.setItem('userPreferences', JSON.stringify({
        dining: {
          cuisines: { preferred: ['italian'], disliked: [], importance: 'high' }
        }
      }));

      render(
        <BrowserRouter>
          <PreferencesProvider>
            <App />
          </PreferencesProvider>
        </BrowserRouter>
      );

      const exploreLink = await screen.findByRole('link', { name: /explore/i });
      await userEvent.click(exploreLink);

      await waitFor(() => {
        const matchIndicators = screen.getAllByTestId('match-quality-indicator');
        matchIndicators.forEach(indicator => {
          // Should have text alternative, not just color
          expect(indicator.textContent).toBeTruthy();
        });
      });
    });
  });
});
