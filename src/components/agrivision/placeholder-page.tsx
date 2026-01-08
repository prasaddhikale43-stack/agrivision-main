"use client";

import { Wrench } from 'lucide-react';
import type { ViewType } from '@/types';

interface PlaceholderPageProps {
  view: ViewType;
}

const pageTitles: Record<string, string> = {
  leaderboard: 'Farmer Leaderboard',
  weather: 'Weather & News',
};

export function PlaceholderPage({ view }: PlaceholderPageProps) {
  const title = pageTitles[view] || 'Coming Soon';

  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center text-center h-full">
      <Wrench className="h-16 w-16 text-primary mb-6" />
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{title}</h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        This feature is currently under construction. Check back soon for exciting updates!
      </p>
    </div>
  );
}
