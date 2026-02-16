import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Hidden component that provides keyboard shortcut access to admin login
 * Press Ctrl+Shift+A (or Cmd+Shift+A on Mac) to access admin login
 */
export const AdminAccessHelper: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+Shift+A (or Cmd+Shift+A on Mac)
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'A') {
        event.preventDefault();
        navigate('/admin/login');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return null; // This component renders nothing
};

/**
 * Console helper function to access admin login
 * Users can type `window.adminAccess()` in browser console
 */
export const setupConsoleAdminAccess = () => {
  if (typeof window !== 'undefined') {
    (window as any).adminAccess = () => {
      window.location.href = '/admin/login';
      console.log('Redirecting to admin login...');
    };
  }
};