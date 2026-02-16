import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Cookie } from 'lucide-react';

export const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (consent !== 'true') {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'true');
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="shadow-strong">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <Cookie className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-semibold">Cookie Consent</h3>
              <p className="text-sm text-muted-foreground">
                We use cookies to enhance your experience.
              </p>
            </div>
          </div>
          <Button onClick={handleAccept} className="w-full">
            Accept
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
