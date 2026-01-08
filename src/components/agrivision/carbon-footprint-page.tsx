
"use client";

import { useState, useMemo } from 'react';
import { useForm, Controller, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import type { CarbonPractice, UserProfile, CalculateCarbonCreditsOutput, ActivityLog, ViewType } from '@/types';
import { Upload, Coins, Trophy, Leaf, Sparkles, CheckCircle, XCircle, BarChart, Award, TestTube } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import practicesData from '@/lib/carbon-practices.json';
import { calculateCarbonCredits } from '@/ai/flows/calculate-carbon-credits';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

const fileRefinement = (value: any) => value instanceof FileList && value.length > 0;

const activitySchema = z.object({
  activityType: z.string().min(1, 'Please select a practice.'),
  area: z.coerce.number().optional(),
  pesticideUsed: z.string().optional(),
  pesticideAmount: z.coerce.number().optional(),
  notes: z.string().optional(),
  activityPhoto: z.any().refine(fileRefinement, 'Activity photo is required.'),
  cropPhoto: z.any().refine(fileRefinement, 'Crop photo is required.'),
  pesticidePhoto: z.any().refine(fileRefinement, 'Pesticide/receipt photo is required.'),
});

type ActivityFormValues = z.infer<typeof activitySchema>;

interface CarbonFootprintPageProps {
  setActiveView: (view: ViewType) => void;
}

export function CarbonFootprintPage({ setActiveView }: CarbonFootprintPageProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const firestore = useFirestore();
  const practices: CarbonPractice[] = practicesData.practices;

  const [analysisResult, setAnalysisResult] = useState<CalculateCarbonCreditsOutput | null>(null);
  const [isResultOpen, setIsResultOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  
  const activitiesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'activities'), where('userId', '==', user.uid));
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const { data: activities, isLoading: areActivitiesLoading } = useCollection<ActivityLog>(activitiesQuery);
  
  const totalEarnedCredits = useMemo(() => {
    if (!activities) return 0;
    return activities.reduce((sum, activity) => sum + (activity.calculatedCredits || 0), 0);
  }, [activities]);

  const yourCurrentRank = useMemo(() => {
    if (!user) return null;
    const allUsers = [
        { id: "user-1", userId: "user-1-uid", fullName: "Prasad Dhikale", totalCarbonCredits: 150.5 },
        { id: "user-2", userId: "user-2-uid", fullName: "Kaif Sayyad", totalCarbonCredits: 125.2 },
        { id: "user-3", userId: "user-3-uid", fullName: "Aditya Uphade", totalCarbonCredits: 98.7 },
        { id: user.uid, userId: user.uid, fullName: userProfile?.fullName || 'You', totalCarbonCredits: totalEarnedCredits },
    ];
    
    // Remove duplicates
    const uniqueUsers = Array.from(new Map(allUsers.map(u => [u.id, u])).values());

    // Sort and rank
    uniqueUsers.sort((a, b) => b.totalCarbonCredits - a.totalCarbonCredits);
    
    const userRank = uniqueUsers.findIndex(u => u.id === user.uid) + 1;
    return userRank > 0 ? userRank : 'N/A';
  }, [user, userProfile, totalEarnedCredits]);
  
  // Use a memoized value for the leaderboard data
  const leaderboardData = useMemo(() => {
    let baseData: Partial<UserProfile>[] = [
        { id: "user-1", userId: "user-1-uid", fullName: "Prasad Dhikale", totalCarbonCredits: 150.5 },
        { id: "user-2", userId: "user-2-uid", fullName: "Kaif Sayyad", totalCarbonCredits: 125.2 },
        { id: "user-3", userId: "user-3-uid", fullName: "Aditya Uphade", totalCarbonCredits: 98.7 },
    ];

    if (user) {
        const userIndex = baseData.findIndex(u => u.userId === user.uid || u.id === user.uid);
        
        const currentUserData: Partial<UserProfile> = {
            id: user.uid,
            userId: user.uid,
            fullName: userProfile?.fullName || "You",
            totalCarbonCredits: totalEarnedCredits,
        };

        if (userIndex !== -1) {
            baseData[userIndex] = currentUserData;
        } else {
            baseData.push(currentUserData);
        }
    }
    
    // Re-sort and re-rank
    baseData.sort((a, b) => (b.totalCarbonCredits ?? 0) - (a.totalCarbonCredits ?? 0));
    baseData.forEach((u, index) => {
        u.rank = index + 1;
    });
    
    return baseData as UserProfile[];
  }, [user, userProfile, totalEarnedCredits]);

  const formMethods = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
  });

  const { handleSubmit, control, reset, formState: { isSubmitting } } = formMethods;

  const getFileAsDataUri = (fileList: FileList | undefined): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!fileList || fileList.length === 0) {
            resolve('');
            return;
        }
        const file = fileList[0];
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  };

  const onSubmit = async (data: ActivityFormValues) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in.' });
      return;
    }
  
    try {
      // Step 1: Get image data URIs
      const [activityPhotoUrl, cropPhotoUrl, pesticidePhotoUrl] = await Promise.all([
        getFileAsDataUri(data.activityPhoto),
        getFileAsDataUri(data.cropPhoto),
        getFileAsDataUri(data.pesticidePhoto),
      ]);
  
      // Step 2: Call AI flow directly from the client
      const aiResult = await calculateCarbonCredits({
        userId: user.uid,
        activityType: data.activityType,
        area: data.area,
        pesticideUsed: data.pesticideUsed,
        pesticideAmount: data.pesticideAmount,
        notes: data.notes,
        activityPhotoUrl,
        cropPhotoUrl,
        pesticidePhotoUrl,
      });
  
      // Step 3: Show the results in the dialog instantly
      setAnalysisResult(aiResult);
      setIsResultOpen(true);
  
      // Step 4: Save the complete, verified activity to Firestore
      // This will trigger the simplified cloud function to update totals
      await addDoc(collection(firestore, 'activities'), {
        userId: user.uid,
        activityType: data.activityType,
        area: data.area || null,
        pesticideUsed: data.pesticideUsed || null,
        pesticideAmount: data.pesticideAmount || null,
        notes: data.notes || null,
        photoUrls: [activityPhotoUrl, cropPhotoUrl, pesticidePhotoUrl].filter(Boolean),
        status: 'Approved', // Set status directly, as AI verification is done
        createdAt: serverTimestamp(),
        calculatedCredits: aiResult.estimatedCO2SavedKg,
        advice: aiResult.reductionAdvice,
        climateImpactAnalysis: aiResult.climateImpactAnalysis, // save this for suggestion
      });
  
      toast({
        title: 'Activity Verified & Logged!',
        description: `You've earned ${aiResult.estimatedCO2SavedKg.toFixed(2)} credits.`,
      });
  
      reset();
  
    } catch (error) {
      console.error("Error during activity submission and analysis:", error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "Could not process your activity. Please try again.",
      });
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Carbon Credits Dashboard</h1>
        </div>
      
      <div className="grid lg:grid-cols-3 gap-6">
        <StatCard 
          title="Your Total Credits" 
          value={totalEarnedCredits.toFixed(2)} 
          icon={Coins} 
          isLoading={areActivitiesLoading}
        />
        <StatCard 
          title="Your Rank" 
          value={`#${yourCurrentRank}`} 
          description="on the leaderboard" 
          icon={Trophy} 
          isLoading={isProfileLoading}
        />
        <StatCard 
            title="Activities Logged"
            value={activities?.length.toString() ?? '0'}
            icon={BarChart}
            isLoading={areActivitiesLoading}
        />
      </div>

      <Card>
        <FormProvider {...formMethods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Leaf /> Log a Climate-Smart Activity</CardTitle>
                <CardDescription>Submit your activities to get them verified and earn carbon credits.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto pr-3">
                <ActivityFormFields control={control} isSubmitting={isSubmitting} practices={practices} />
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? 'Analyzing & Submitting...' : 'Log Activity & Get Credits'}
                </Button>
              </CardFooter>
            
          </form>
        </FormProvider>
      </Card>
      

      <Card>
          <CardHeader>
              <CardTitle>Recent Activity History</CardTitle>
              <CardDescription>A log of your climate-smart activities.</CardDescription>
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Activity</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Credits</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {areActivitiesLoading ? (
                          [...Array(3)].map((_, i) => (
                              <TableRow key={i}>
                                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                  <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                              </TableRow>
                          ))
                      ) : activities && activities.length > 0 ? (
                          activities.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)).map(activity => (
                              <TableRow key={activity.id}>
                                  <TableCell className="font-medium">{activity.activityType}</TableCell>
                                  <TableCell>{activity.createdAt ? format(activity.createdAt.toDate(), 'PP') : 'N/A'}</TableCell>
                                  <TableCell>
                                      <span className={`px-2 py-1 text-xs rounded-full ${
                                          activity.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                          activity.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                          'bg-yellow-100 text-yellow-800'
                                      }`}>
                                          {activity.status}
                                      </span>
                                  </TableCell>
                                  <TableCell className="text-right font-medium">{activity.calculatedCredits?.toFixed(2) ?? '-'}</TableCell>
                              </TableRow>
                          ))
                      ) : (
                          <TableRow>
                              <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                  You haven't logged any activities yet.
                              </TableCell>
                          </TableRow>
                      )}
                  </TableBody>
              </Table>
          </CardContent>
          <CardFooter className="flex justify-end items-center gap-2 font-semibold text-lg">
            Total Earned Credits: 
            <span className="text-primary font-bold">{totalEarnedCredits.toFixed(2)}</span>
          </CardFooter>
      </Card>

      <Card>
          <CardHeader>
              <CardTitle>Leaderboard</CardTitle>
              <CardDescription>Top users by carbon credits earned.</CardDescription>
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Farmer</TableHead>
                          <TableHead className="text-right">Credits</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {leaderboardData.length > 0 ? (
                          leaderboardData.map((u) => (
                              <TableRow key={u.id} className={u.userId === user?.uid ? 'bg-primary/10' : ''}>
                                  <TableCell className="font-medium">#{u.rank}</TableCell>
                                  <TableCell>{u.fullName} {u.userId === user?.uid && '(You)'}</TableCell>
                                  <TableCell className="text-right font-medium">{u.totalCarbonCredits?.toFixed(2) || '0.00'}</TableCell>
                              </TableRow>
                          ))
                      ) : (
                          <TableRow>
                              <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                  No users on the leaderboard yet.
                              </TableCell>
                          </TableRow>
                      )}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>

       {analysisResult && (
        <AlertDialog open={isResultOpen} onOpenChange={setIsResultOpen}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-2xl">
                <CheckCircle className="text-green-500"/> 
                Activity Verified!
              </AlertDialogTitle>
              <AlertDialogDescription>
                {analysisResult.verificationDetails}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-4 text-sm max-h-[60vh] overflow-y-auto pr-2">
                <div className="flex justify-between items-center bg-primary/10 p-3 rounded-lg">
                    <span className="font-semibold text-primary flex items-center gap-2"><Award /> Carbon Credits Earned</span>
                    <span className="font-bold text-lg text-primary">{analysisResult.estimatedCO2SavedKg.toFixed(2)} kg CO₂e</span>
                </div>
                 <div>
                    <h4 className="font-semibold mb-1 flex items-center gap-2"><Sparkles className="w-4 h-4 text-accent" /> AI-Powered General Advice</h4>
                    <p className="text-muted-foreground bg-muted p-3 rounded-md">{analysisResult.reductionAdvice}</p>
                 </div>
                 <div>
                    <h4 className="font-semibold mb-1 flex items-center gap-2"><TestTube className="w-4 h-4 text-blue-500"/> Pesticide Analysis</h4>
                    <p className="text-muted-foreground bg-muted p-3 rounded-md">{analysisResult.pesticideAnalysis}</p>
                 </div>
                  <div>
                    <h4 className="font-semibold mb-1 flex items-center gap-2"><Leaf className="w-4 h-4 text-green-500"/> Proper Use Advice</h4>
                    <p className="text-muted-foreground bg-muted p-3 rounded-md">{analysisResult.properUseAdvice}</p>
                 </div>
                 <div>
                    <h4 className="font-semibold mb-1">Climate Impact Analysis</h4>
                    <p className="text-muted-foreground">{analysisResult.climateImpactAnalysis}</p>
                 </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setIsResultOpen(false)}>Close</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

const StatCard = ({ title, value, description, icon: Icon, isLoading }: { title: string, value: string, description?: string, icon: React.ElementType, isLoading: boolean }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? <Skeleton className="h-8 w-24" /> : (
        <>
          <div className="text-2xl font-bold">{value}</div>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </>
      )}
    </CardContent>
  </Card>
);

const ActivityFormFields = ({ control, isSubmitting, practices }: { control: any, isSubmitting: boolean, practices: CarbonPractice[] }) => {
    const {formState: { errors }, register} = useFormContext();
    return (
        <>
            <div className="space-y-2">
                <Label htmlFor="activityType">Climate-Smart Practice</Label>
                <Controller
                    name="activityType"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                            <SelectTrigger id="activityType">
                                <SelectValue placeholder="Select a practice" />
                            </SelectTrigger>
                            <SelectContent>
                                {practices.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                />
                {errors.activityType && <p className="text-sm text-destructive">{errors.activityType.message?.toString()}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="area">Area (Acres)</Label>
                    <Input id="area" type="number" placeholder="e.g., 10" {...register('area')} disabled={isSubmitting} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="pesticideAmount">Pesticide Amount (L)</Label>
                    <Input id="pesticideAmount" type="number" placeholder="e.g., 2.5" {...register('pesticideAmount')} disabled={isSubmitting} />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="pesticideUsed">Pesticide Used (optional)</Label>
                <Input id="pesticideUsed" placeholder="e.g., Neem Oil" {...register('pesticideUsed')} disabled={isSubmitting} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea id="notes" placeholder="Add any relevant notes about the activity..." {...register('notes')} disabled={isSubmitting} />
            </div>
            
            <FileUploadField name="activityPhoto" label="Activity Photo (Proof)" control={control} disabled={isSubmitting} />
            <FileUploadField name="cropPhoto" label="Crop Photo" control={control} disabled={isSubmitting} />
            <FileUploadField name="pesticidePhoto" label="Pesticide/Receipt Photo" control={control} disabled={isSubmitting} />
        </>
    )
};


const FileUploadField = ({ name, label, control, disabled }: { name: string, label: string, control: any, disabled: boolean }) => {
  const { formState: { errors }, register } = useFormContext();
  const [fileName, setFileName] = useState('');

  return (
    <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
             <Controller
                name={name}
                control={control}
                render={({ field }) => (
                    <Input
                        id={name}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                            field.onChange(e.target.files);
                            setFileName(e.target.files?.[0]?.name || '');
                        }}
                        disabled={disabled}
                    />
                )}
            />
            <Button asChild variant="outline" size="sm" disabled={disabled}>
                <label htmlFor={name} className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                </label>
            </Button>
            {fileName && <span className="text-sm text-muted-foreground truncate">{fileName}</span>}
        </div>
        {errors[name] && <p className="text-sm text-destructive">{errors[name]?.message?.toString()}</p>}
    </div>
  );
};
