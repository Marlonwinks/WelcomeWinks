import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProfileEditor } from '../ProfileEditor';
import { UserProfile } from '@/types/firebase';

// Mock the useAuth hook
const mockUserProfile: UserProfile = {
  userId: 'test-user',
  accountType: 'full',
  name: 'Test User',
  location: 'Test City',
  preferences: {
    defaultView: 'map',
    locationSharing: true,
    notificationPreferences: {
      newBusinessesNearby: true,
      scoreUpdates: true,
      communityActivity: false
    },
    privacySettings: {
      shareContributions: true,
      publicProfile: false
    }
  },
  privacyConsent: true,
  termsAccepted: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockAuthContext = {
  user: null,
  userProfile: mockUserProfile,
  cookieAccount: null,
  loading: false,
  error: null,
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
  createCookieAccount: vi.fn(),
  getCookieAccount: vi.fn(),
  updateCookieActivity: vi.fn(),
  getCurrentAccount: vi.fn(() => ({ type: 'full' as const, data: null })),
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
  migrateCookieToFullAccount: vi.fn()
};

// Mock the useAuth hook
vi.mock('@/contexts/AuthProvider', () => ({
  useAuth: () => mockAuthContext
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

describe('ProfileEditor', () => {
  it('renders profile editor with user data', () => {
    render(<ProfileEditor />);

    // Check if main sections are rendered
    expect(screen.getByText('Personal Information')).toBeInTheDocument();
    expect(screen.getByText('App Preferences')).toBeInTheDocument();
    expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    expect(screen.getByText('Legal & Consent')).toBeInTheDocument();
  });

  it('shows full account badge for full accounts', () => {
    render(<ProfileEditor />);

    expect(screen.getByText('Full Account')).toBeInTheDocument();
  });

  it('displays user name in input field', () => {
    render(<ProfileEditor />);

    const nameInput = screen.getByDisplayValue('Test User');
    expect(nameInput).toBeInTheDocument();
  });

  it('shows save button when not in read-only mode', () => {
    render(<ProfileEditor />);

    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('does not show save button in read-only mode', () => {
    render(<ProfileEditor readOnly={true} />);

    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
  });
});