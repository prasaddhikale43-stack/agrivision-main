
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  Droplets,
  Thermometer,
  Eye,
  Leaf,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  Download,
  Plus,
  Scan,
  Wheat,
  FlaskConical,
  Award,
  CheckCircle,
  Sparkles,
  TestTube,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useDoc, useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { doc, collection, serverTimestamp, query, where, addDoc } from 'firebase/firestore';
import type { UserProfile, Crop, PesticideInsight, ViewType, CarbonPractice, CalculateCarbonCreditsOutput, ActivityLog, PesticideLog } from '@/types';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import Image from 'next/image';
import { format } from 'date-fns';
import { getPesticideInsights } from '@/ai/flows/get-pesticide-insights';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { useForm, Controller, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import practicesData from '@/lib/carbon-practices.json';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Upload } from 'lucide-react';
import { calculateCarbonCredits } from '@/ai/flows/calculate-carbon-credits';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


// Define the props for DashboardPage to accept setActiveView
interface DashboardPageProps {
  setActiveView: (view: ViewType) => void;
}

const stats = [
    {
      title: 'Soil Moisture',
      value: '32%',
      change: '-2%',
      changeType: 'decrease' as const,
      icon: RefreshCw,
    },
    {
      title: 'Temperature',
      value: '28°C',
      change: '+1°C',
      changeType: 'increase' as const,
      icon: Thermometer,
    },
    {
      title: 'Humidity',
      value: '65%',
      change: '+5%',
      changeType: 'increase' as const,
      icon: Droplets,
    },
    {
      title: 'Predicted Yield',
      value: '2.4t',
      change: '+8%',
      changeType: 'increase' as const,
      icon: Leaf,
    },
  ];

const yieldPrediction = [
    { name: 'Jan', yield: 1.9 },
    { name: 'Feb', yield: 2.0 },
    { name: 'Mar', yield: 2.2 },
    { name: 'Apr', yield: 2.3 },
  ];

const DISTRIBUTION_COLORS = [
  '#2E7D32', // Dark Green
  '#4CAF50', // Green
  '#8BC34A', // Light Green
  '#CDDC39', // Lime
  '#FFEB3B', // Yellow
  '#FFC107', // Amber
  '#FF9800', // Orange
  '#795548', // Brown
];

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

export function DashboardPage({ setActiveView }: DashboardPageProps) {
  const { user, loading: isAuthLoading } = useAuth();
  const firestore = useFirestore();
  const [pesticideData, setPesticideData] = useState<{ insights: PesticideInsight[]; overallAdvice: string } | null>(null);
  const [isPesticideDataLoading, setIsPesticideDataLoading] = useState(false);
  const [isLogActivityOpen, setIsLogActivityOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<CalculateCarbonCreditsOutput | null>(null);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [activityDataToSubmit, setActivityDataToSubmit] = useState<ActivityFormValues | null>(null);

  const { toast } = useToast();
  const practices: CarbonPractice[] = practicesData.practices;

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const cropsRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, `users/${user.uid}/crops`);
  }, [user, firestore]);
  const { data: crops, isLoading: areCropsLoading } = useCollection<Crop>(cropsRef);

  const pesticideLogsRef = useMemoFirebase(() => {
      if (!user || !firestore) return null;
      return collection(firestore, `users/${user.uid}/pesticideLogs`);
  }, [user, firestore]);
  const { data: pesticideLogs, isLoading: arePesticideLogsLoading } = useCollection<PesticideLog>(pesticideLogsRef);
  
  const formMethods = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
  });

  const { handleSubmit, control, reset, formState: { isSubmitting } } = formMethods;

  useEffect(() => {
    if (pesticideLogs) {
        const fetchPesticideData = async () => {
            setIsPesticideDataLoading(true);
            try {
                // Aggregate data from pesticideLogs
                const insightsMap = new Map<string, { organic: number, chemical: number }>();
                pesticideLogs.forEach(log => {
                    const entry = insightsMap.get(log.cropName) ?? { organic: 0, chemical: 0 };
                    if (log.pesticideType === 'Organic') {
                        entry.organic += 1;
                    } else {
                        entry.chemical += 1;
                    }
                    insightsMap.set(log.cropName, entry);
                });

                const insights: PesticideInsight[] = Array.from(insightsMap.entries()).map(([cropName, counts]) => ({
                    cropName,
                    ...counts,
                }));
                
                // Get AI advice based on the aggregated data
                 const result = await getPesticideInsights({ cropNames: Array.from(insightsMap.keys()) });

                setPesticideData({ insights, overallAdvice: result.overallAdvice });
            } catch (error) {
                console.error("Failed to fetch pesticide insights:", error);
                setPesticideData(null);
            } finally {
                setIsPesticideDataLoading(false);
            }
        };

        if (pesticideLogs.length > 0) {
            fetchPesticideData();
        } else {
            setPesticideData(null);
        }
    }
  }, [pesticideLogs]);

  const cropDistributionData = useMemo(() => {
    if (!crops || crops.length === 0) return [];
    
    const areaByCrop = crops.reduce<Record<string, number>>((acc, crop) => {
        acc[crop.name] = (acc[crop.name] || 0) + crop.areaPlanted;
        return acc;
    }, {});

    return Object.entries(areaByCrop).map(([name, value]) => ({
        name,
        value,
    }));

  }, [crops]);

  const handleExportCSV = () => {
    if (!crops || crops.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data to Export",
        description: "Please add crops to your portfolio first.",
      });
      return;
    }

    const headers = ["Crop Name", "Planting Date", "Area Planted (acres)", "Status", "Expected Yield (tons)"];
    const csvRows = [
      headers.join(','),
      ...crops.map(crop => [
        `"${crop.name}"`,
        `"${format(new Date(crop.plantingDate), 'yyyy-MM-dd')}"`,
        crop.areaPlanted,
        `"${crop.status}"`,
        crop.expectedYield ?? 'N/A'
      ].join(','))
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `agrivision_crops_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: "Export Successful", description: "Your crop data has been downloaded." });
  };
  
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

  const onFormSubmit = (data: ActivityFormValues) => {
    setActivityDataToSubmit(data);
    setIsConfirming(true);
  };

  const handleConfirmSubmit = async () => {
    if (!activityDataToSubmit || !user || !firestore) {
      toast({ variant: 'destructive', title: 'Submission Error', description: 'Could not submit activity.' });
      return;
    }
    
    setIsConfirming(false); // Close confirmation dialog
    setIsLogActivityOpen(false); // Close form dialog

    try {
      // Step 1: Get image data URIs
      const [activityPhotoUrl, cropPhotoUrl, pesticidePhotoUrl] = await Promise.all([
        getFileAsDataUri(activityDataToSubmit.activityPhoto),
        getFileAsDataUri(activityDataToSubmit.cropPhoto),
        getFileAsDataUri(activityDataToSubmit.pesticidePhoto),
      ]);
  
      // Step 2: Call AI flow
      const aiResult = await calculateCarbonCredits({
        userId: user.uid,
        activityType: activityDataToSubmit.activityType,
        area: activityDataToSubmit.area,
        pesticideUsed: activityDataToSubmit.pesticideUsed,
        pesticideAmount: activityDataToSubmit.pesticideAmount,
        notes: activityDataToSubmit.notes,
        activityPhotoUrl,
        cropPhotoUrl,
        pesticidePhotoUrl,
      });

      // Step 3: Show AI results
      setAnalysisResult(aiResult);
      setIsResultOpen(true);
  
      // Step 4: Save the complete, verified activity to Firestore
      await addDoc(collection(firestore, 'activities'), {
        userId: user.uid,
        activityType: activityDataToSubmit.activityType,
        area: activityDataToSubmit.area || null,
        pesticideUsed: activityDataToSubmit.pesticideUsed || null,
        pesticideAmount: activityDataToSubmit.pesticideAmount || null,
        notes: activityDataToSubmit.notes || null,
        photoUrls: [activityPhotoUrl, cropPhotoUrl, pesticidePhotoUrl].filter(Boolean),
        status: 'Approved', 
        createdAt: serverTimestamp(),
        calculatedCredits: aiResult.estimatedCO2SavedKg,
        advice: aiResult.reductionAdvice,
        climateImpactAnalysis: aiResult.climateImpactAnalysis,
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
    } finally {
      setActivityDataToSubmit(null);
    }
  };


  const isLoading = isAuthLoading || isProfileLoading || areCropsLoading || arePesticideLogsLoading;
  
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const hasCrops = crops && crops.length > 0;
  const hasPesticideData = pesticideData && pesticideData.insights.length > 0;

  return (
    <div className="bg-muted/30 min-h-screen">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">
                Welcome, {userProfile?.fullName || 'Farmer'}. Monitor your crops, environment, and farming analytics.
                </p>
            </div>
            <div className='flex items-center gap-2'>
                <Select defaultValue='all-crops'>
                    <SelectTrigger className="w-[180px] bg-card">
                        <SelectValue placeholder="Select crops" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all-crops">All Crops</SelectItem>
                        {crops?.map(crop => (
                            <SelectItem key={crop.id} value={crop.name.toLowerCase()}>{crop.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select defaultValue='30-days'>
                    <SelectTrigger className="w-[180px] bg-card">
                        <SelectValue placeholder="Select time range" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7-days">Last 7 Days</SelectItem>
                        <SelectItem value="30-days">Last 30 Days</SelectItem>
                        <SelectItem value="90-days">Last 90 Days</SelectItem>
                    </SelectContent>
                </Select>
                <Button onClick={() => setActiveView('crops')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Crop
                </Button>
            </div>
        </header>

        {/* Stat Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p
                  className={`text-xs flex items-center ${
                    stat.changeType === 'increase'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {stat.changeType === 'increase' ? (
                    <ArrowUp className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowDown className="h-3 w-3 mr-1" />
                  )}
                  {stat.change} vs last week
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Yield Prediction */}
          <Card>
            <CardHeader>
              <CardTitle>Yield Prediction</CardTitle>
              <CardDescription>Predicted vs actual yield over time</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] w-full pr-6">
              {hasCrops ? (
                <ResponsiveContainer>
                  <AreaChart data={yieldPrediction}>
                    <defs>
                      <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="hsl(var(--foreground))" opacity={0.8} fontSize={12} axisLine={false} tickLine={false} />
                    <YAxis stroke="hsl(var(--foreground))" opacity={0.8} fontSize={12} axisLine={false} tickLine={false} unit="t" />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}/>
                    <Area type="monotone" dataKey="yield" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorYield)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  Add a crop to see yield predictions.
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Crop Distribution */}
          <Card>
              <CardHeader>
                  <CardTitle>Crop Distribution</CardTitle>
                  <CardDescription>Percentage by area</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] w-full flex items-center justify-center">
                  {areCropsLoading ? (
                    <Skeleton className="h-[200px] w-[200px] rounded-full" />
                  ) : hasCrops ? (
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie
                                data={cropDistributionData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                                {cropDistributionData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                              formatter={(value, name) => [`${value} acres`, name]}
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-card border border-border p-2 rounded-md shadow-lg">
                                      <p className="label">{`${payload[0].name} : ${payload[0].value} acres`}</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-center">Add a crop to see its distribution.</p>
                  )}
              </CardContent>
          </Card>

        </div>

        <div className="grid gap-6">
            {/* Active Crops */}
            <Card>
              <CardHeader className="flex flex-row justify-between items-center">
                <div>
                    <CardTitle>Active Crops</CardTitle>
                    <CardDescription>Monitor crop health and growth stages</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {areCropsLoading ? (
                    [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                  ) : hasCrops ? (
                    crops.map((crop) => (
                      <div key={crop.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50">
                          <div className="w-10 h-10 flex items-center justify-center bg-muted rounded-full">
                            <Wheat className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                              <p className="font-semibold">{crop.name}</p>
                              <p className="text-sm text-muted-foreground">{crop.status} - {crop.areaPlanted} acres</p>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-sm">
                                Planted on
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{format(new Date(crop.plantingDate), 'PP')}</p>
                          </div>
                      </div>
                    ))
                  ) : (
                     <div className="text-center text-muted-foreground py-12">
                        <p>No crops added yet.</p>
                        <Button variant="link" onClick={() => setActiveView('crops')}>Add your first crop</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
        </div>

        {/* Pesticide Applications */}
        <Card>
            <CardHeader>
            <CardTitle>Pesticide Applications & Insights</CardTitle>
            <CardDescription>Breakdown by crop and type this month, with AI-powered advice.</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px] w-full">
            {isPesticideDataLoading ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                    <p>Loading AI-powered insights...</p>
                </div>
            ) : hasPesticideData ? (
                <ResponsiveContainer>
                <BarChart data={pesticideData.insights} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <XAxis dataKey="cropName" stroke="hsl(var(--foreground))" opacity={0.8} fontSize={12} axisLine={false} tickLine={false} />
                    <YAxis stroke="hsl(var(--foreground))" opacity={0.8} fontSize={12} axisLine={false} tickLine={false}/>
                    <Tooltip cursor={{fill: 'hsl(var(--muted))'}} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}/>
                    <Legend />
                    <Bar dataKey="organic" stackId="a" fill="hsl(var(--chart-1))" name="Organic" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="chemical" stackId="a" fill="hsl(var(--chart-2))" name="Chemical" radius={[4, 4, 0, 0]} />
                </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                <p>No pesticide data available. Log an application to see insights.</p>
                </div>
            )}
            </CardContent>
            {pesticideData && (
                <CardFooter className="text-sm text-muted-foreground border-t pt-4">
                  <p><span className="font-semibold text-foreground">AI-Powered Advice:</span> {pesticideData.overallAdvice}</p>
                </CardFooter>
              )}
        </Card>
        
        {/* Quick Actions */}
        <Card>
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className='grid md:grid-cols-3 gap-4'>
                <Button size="lg" onClick={() => setActiveView('scan')}>
                    <Scan className="mr-2"/>
                    Scan Crop
                </Button>
                <Button size="lg" variant="outline" onClick={() => { setIsLogActivityOpen(true)}}>
                    <Plus className="mr-2"/>
                    Log a New Activity
                </Button>
                <Button size="lg" variant="outline" onClick={handleExportCSV}>
                    <Download className="mr-2"/>
                    Export CSV
                </Button>
            </CardContent>
        </Card>

      </div>
      <Dialog open={isLogActivityOpen} onOpenChange={setIsLogActivityOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log a New Activity</DialogTitle>
            <DialogDescription>
              Submit a climate-smart activity to earn carbon credits.
            </DialogDescription>
          </DialogHeader>
          <FormProvider {...formMethods}>
            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
              <ActivityFormFields control={control} isSubmitting={isSubmitting} practices={practices} />
              <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setIsLogActivityOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Submitting...' : 'Log Activity'}
                  </Button>
              </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm Activity</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure you want to log this activity and add it to your carbon footprint?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmSubmit}>Yes, Log Activity</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

function DashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
        <header className="flex justify-between items-center">
            <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
            </div>
            <div className='flex items-center gap-2'>
                <Skeleton className="h-10 w-[180px]" />
                <Skeleton className="h-10 w-[180px]" />
                <Skeleton className="h-10 w-28" />
            </div>
        </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
            <Card key={i}>
                <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
                <CardContent><Skeleton className="h-8 w-20" /></CardContent>
            </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
          <CardContent className="h-[300px] w-full">
            <Skeleton className="h-full w-full" />
          </CardContent>
        </Card>
        <Card>
            <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
            <CardContent className="h-[300px] w-full">
                <Skeleton className="h-full w-full" />
            </CardContent>
        </Card>
      </div>
      <div className="grid gap-6">
        <Card>
            <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
        <CardContent className='grid md:grid-cols-3 gap-4'>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}


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
