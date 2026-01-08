
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, Query, DocumentData } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, Shield, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ViewType, ActivityLog } from '@/types';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface AdminVerificationPageProps {
  setActiveView: (view: ViewType) => void;
}

// IMPORTANT: Replace this with your actual Admin User ID
const ADMIN_UID = "ADMIN_UID_HERE"; 

export function AdminVerificationPage({ setActiveView }: AdminVerificationPageProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const activitiesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'activities'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  useEffect(() => {
    if (!user || user.uid !== ADMIN_UID || !activitiesQuery) {
        setIsLoading(false);
        return;
    }

    const unsubscribe = onSnapshot(activitiesQuery, 
        (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as ActivityLog));
            setActivities(data);
            setIsLoading(false);
            setError(null);
        },
        (err) => {
            console.error(err);
            setError("An error occurred while fetching activities.");
            setIsLoading(false);
        }
    );

    return () => unsubscribe();
  }, [activitiesQuery, user]);

  const handleVerify = (activityId: string) => {
    if (!firestore) return;
    const activityRef = doc(firestore, 'activities', activityId);
    updateDocumentNonBlocking(activityRef, { status: 'Approved' });
    toast({
        title: "Success",
        description: "Activity approved successfully ✅",
    });
  };

  if (user?.uid !== ADMIN_UID) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center h-full">
         <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>This panel is for admin use only.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2"><Shield /> Admin Carbon Verification Panel</CardTitle>
               <Button variant="outline" onClick={() => setActiveView('leaderboard')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Leaderboard
              </Button>
            </div>
            <CardDescription>
              Review and verify user-submitted carbon footprint activities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity Type</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                            <TableCell className="text-center"><Skeleton className="h-5 w-20 mx-auto" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                        </TableRow>
                    ))
                ) : (
                  activities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>{activity.activityType}</TableCell>
                      <TableCell className="font-mono text-xs">{activity.userId}</TableCell>
                      <TableCell className="font-mono">{activity.calculatedCredits?.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            activity.status === 'Approved' ? 'bg-green-100 text-green-800' :
                            activity.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                        }`}>
                            {activity.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {activity.status !== 'Approved' && (
                          <Button size="sm" onClick={() => handleVerify(activity.id)}>
                            Verify & Approve
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
