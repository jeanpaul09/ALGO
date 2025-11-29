'use client';

import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">Mission Control</h2>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-green-500" />
          <Badge variant="success">System Online</Badge>
        </div>
      </div>
    </header>
  );
}
