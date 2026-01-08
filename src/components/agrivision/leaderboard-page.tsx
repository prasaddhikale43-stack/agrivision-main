
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, Query, DocumentData, where } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Trophy, Award, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ViewType, UserProfile } from '@/types';

interface LeaderboardPageProps {
  setActiveView: (view: ViewType) => void;
}

export function LeaderboardPage({ setActiveView }: LeaderboardPageProps) {
  const [leaderboardData, setLeaderboardData] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const firestore = useFirestore();

  // Query users that have a rank and order by it.
  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'), where('rank', '>', 0), orderBy('rank', 'asc'));
  }, [firestore]);


  useEffect(() => {
    if (!usersQuery) {
        setIsLoading(false);
        setError("Firestore is not available.");
        return;
    }

    const unsubscribe = onSnapshot(usersQuery, 
        (snapshot) => {
            const data = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
            setLeaderboardData(data);
            setIsLoading(false);
            setError(null);
        },
        (err) => {
            console.error(err);
            if (err.code === 'permission-denied') {
                setError("You do not have permission to view the leaderboard. Please check Firestore security rules.");
            } else {
                setError("An error occurred while fetching the leaderboard.");
            }
            setIsLoading(false);
        }
    );

    return () => unsubscribe();
  }, [usersQuery]);

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="animate-fade-in">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2"><Trophy className="text-yellow-500" /> Farmer Leaderboard</CardTitle>
            <Button variant="outline" onClick={() => setActiveView('carbon')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tracker
            </Button>
          </div>
          <CardDescription>
            See who is leading the way in sustainable farming. Rankings are updated periodically based on total carbon credits earned.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-2">
              <p className='text-center text-muted-foreground'>Loading leaderboard...</p>
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Fetching Data</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!isLoading && !error && leaderboardData.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Rank</TableHead>
                  <TableHead>Farmer Name</TableHead>
                  <TableHead className="text-right">Total Credits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboardData.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className={cn(user && entry.id === user.uid ? 'bg-primary/10' : '')}
                  >
                    <TableCell className="font-bold text-lg">#{entry.rank}</TableCell>
                    <TableCell className="font-medium">{entry.fullName}{user && entry.id === user.uid ? ' (You)' : ''}</TableCell>
                    <TableCell className="text-right font-bold text-primary font-mono flex items-center justify-end gap-2">
                      <Award className="w-4 h-4 text-yellow-500" />
                      {entry.totalCarbonCredits?.toFixed(2) || '0.00'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!isLoading && !error && leaderboardData.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                <p className="text-lg">The leaderboard is empty.</p>
                <p>Log your first climate-smart activity to get on the board!</p>
              </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
