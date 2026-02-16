import React from 'react';
import { cn } from '@/lib/utils';

interface WelcomeWinksLogoProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    variant?: 'full' | 'icon' | 'text';
    showTagline?: boolean;
}

export const WelcomeWinksLogo: React.FC<WelcomeWinksLogoProps> = ({
    className,
    size = 'md',
    variant = 'full',
    showTagline = false
}) => {
    const sizeClasses = {
        sm: 'h-8',
        md: 'h-10',
        lg: 'h-12',
        xl: 'h-16'
    };

    const imageSizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16'
    };

    const textClasses = {
        sm: 'text-lg',
        md: 'text-xl',
        lg: 'text-2xl',
        xl: 'text-3xl'
    };

    if (variant === 'icon') {
        return (
            <div className={cn("relative rounded-full overflow-hidden border border-border/50", imageSizeClasses[size], className)}>
                <img
                    src="/2-100.jpg"
                    alt="Welcome Winks Logo"
                    className="w-full h-full object-cover"
                />
            </div>
        );
    }

    if (variant === 'text') {
        return (
            <span className={cn("font-bold tracking-tight text-foreground", textClasses[size], className)}>
                Welcome Winks
            </span>
        );
    }

    return (
        <div className={cn("flex flex-col justify-center", className)}>
            <div className="flex items-center gap-3">
                <div className={cn("relative rounded-full overflow-hidden border border-border shadow-sm shrink-0", imageSizeClasses[size])}>
                    <img
                        src="/2-100.jpg"
                        alt="Welcome Winks Logo"
                        className="w-full h-full object-cover"
                    />
                </div>
                <span className={cn("font-bold tracking-tight text-foreground", textClasses[size])}>
                    Welcome Winks
                </span>
            </div>
            {showTagline && (
                <span className="text-xs text-muted-foreground ml-1 mt-0.5">Find Your Vibration</span>
            )}
        </div>
    );
};
