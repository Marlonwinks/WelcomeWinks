import React, { useState } from 'react';
import { MapPin, Locate, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DonutChart } from '@/components/charts/DonutChart';
import { MapMarker } from './MapMarker';

// Mock data for demonstration
const mockBusinesses: any[] = [];

export const MapView: React.FC = () => {
  const [selectedBusiness, setSelectedBusiness] = useState<typeof mockBusinesses[0] | null>(null);

  return (
    <div className="relative h-screen w-full">
      {/* Map container with placeholder */}
      <div className="w-full h-full bg-gradient-surface relative overflow-hidden">
        {/* Placeholder map background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5">
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0,20 Q20,10 40,20 T80,15 L100,20 L100,80 Q80,90 60,80 T20,85 L0,80 Z" fill="currentColor" />
            </svg>
          </div>
        </div>
        
        {/* Map markers */}
        {mockBusinesses.map((business, index) => (
          <MapMarker
            key={business.id}
            business={business}
            position={{ 
              x: 20 + (index * 25) + Math.random() * 10, 
              y: 30 + (index * 15) + Math.random() * 10 
            }}
            onClick={() => setSelectedBusiness(business)}
            isSelected={selectedBusiness?.id === business.id}
          />
        ))}
        
        {/* Map overlay text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Interactive Map View</p>
            <p className="text-xs mt-1">Click markers to explore places</p>
          </div>
        </div>
      </div>
      
      {/* Floating controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <Button size="icon" variant="secondary" className="shadow-brand interactive-scale">
          <Locate className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="secondary" className="shadow-brand interactive-scale">
          <Filter className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Selected business bottom sheet */}
      {selectedBusiness && (
        <div className="absolute bottom-4 left-4 right-4 animate-slide-up">
          <Card className="shadow-strong">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{selectedBusiness.name}</h3>
                  <p className="text-muted-foreground text-sm">{selectedBusiness.category}</p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedBusiness.address}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm font-medium">Score: {selectedBusiness.score}/5</span>
                    <span className="text-xs text-muted-foreground">• {selectedBusiness.totalMarks} marks</span>
                  </div>
                </div>
                <DonutChart score={selectedBusiness.score} size="sm" />
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button size="sm" className="btn-hero flex-1">
                  Mark this place
                </Button>
                <Button size="sm" variant="outline">
                  Details
                </Button>
                <Button size="sm" variant="outline">
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};