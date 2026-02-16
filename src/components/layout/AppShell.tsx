import React from 'react';
import { BottomNavigation } from './BottomNavigation';
import { DesktopSidebar } from './DesktopSidebar';
import { TopHeader } from './TopHeader';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background font-inter selection:bg-primary/20">
      {!isMobile && <DesktopSidebar />}
      {!isMobile && <TopHeader />}

      <main
        className={cn(
          "min-h-screen relative transition-[margin] duration-300 ease-in-out",
          !isMobile && "ml-64 pt-16",
          "pb-20 md:pb-0" // Add padding bottom for mobile nav
        )}
      >
        <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl animate-fade-in">
          {children}
        </div>
      </main>

      {isMobile && <BottomNavigation />}
    </div>
  );
};