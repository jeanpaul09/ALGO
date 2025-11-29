'use client';

import { Button } from '@/components/ui/button';
import { Brain, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivateButtonProps {
  isActive: boolean;
  isLoading?: boolean;
  onClick: () => void;
}

export function ActivateButton({ isActive, isLoading, onClick }: ActivateButtonProps) {
  if (isActive) {
    return (
      <Button
        onClick={onClick}
        size="lg"
        variant="destructive"
        className="h-14 px-8 text-base font-semibold shadow-2xl shadow-red-500/30 hover:shadow-red-500/50 transition-all duration-300"
      >
        <Square className="h-5 w-5 mr-2" />
        DEACTIVATE AI AGENT
      </Button>
    );
  }

  return (
    <div className="relative group">
      {/* Glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary via-blue-500 to-primary rounded-xl opacity-75 group-hover:opacity-100 blur-lg transition duration-500 animate-pulse" />

      {/* Button */}
      <Button
        onClick={onClick}
        size="lg"
        disabled={isLoading}
        className={cn(
          "relative h-16 px-12 text-lg font-bold shadow-2xl",
          "bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90",
          "transform hover:scale-105 transition-all duration-300",
          "border-2 border-primary/50"
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-6 w-6 mr-3 animate-spin" />
            INITIALIZING...
          </>
        ) : (
          <>
            <Brain className="h-6 w-6 mr-3" />
            ACTIVATE AI AGENT
          </>
        )}
      </Button>
    </div>
  );
}
