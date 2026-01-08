"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Map, Thermometer, ShieldAlert, Zap, AlertTriangle, Wind, Leaf } from 'lucide-react';
import type { ClimateDiseaseRiskOutput } from '@/types';
import { getClimateDiseaseRisk } from '@/ai/flows/get-climate-disease-risk';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';


const formSchema = z.object({
  location: z.string().min(2, { message: 'Location must be at least 2 characters.' }),
});
type FormValues = z.infer<typeof formSchema>;

const getRiskColor = (riskFactor: number) => {
    if (riskFactor > 0.75) return 'bg-red-500';
    if (riskFactor > 0.5) return 'bg-orange-500';
    if (riskFactor > 0.25) return 'bg-yellow-400';
    return 'bg-green-500';
};

export function ClimateHeatmap() {
    const [analysisResult, setAnalysisResult] = useState<ClimateDiseaseRiskOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            location: 'Central Maharashtra',
        },
    });

    const handleAnalyze = async (data: FormValues) => {
        setIsLoading(true);
        setAnalysisResult(null);
        try {
            const result = await getClimateDiseaseRisk({ location: data.location });
            setAnalysisResult(result);
            toast({ title: 'Risk Analysis Complete', description: `Showing climate-based disease forecast for ${data.location}.` });
        } catch (error) {
            console.error("Climate analysis error:", error);
            toast({ variant: 'destructive', title: 'Analysis Failed', description: 'Could not fetch climate risk data.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="mt-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                    <Map /> Climate-Based Disease Risk
                </CardTitle>
                <CardDescription>Enter a location to get a 2-week forecast of potential crop disease risks based on predicted climate conditions.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit(handleAnalyze)} className="flex items-end gap-4 mb-6">
                    <div className="flex-grow space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input id="location" placeholder="e.g., Punjab, Vidarbha" {...form.register('location')} />
                        {form.formState.errors.location && <p className="text-sm text-destructive">{form.formState.errors.location.message}</p>}
                    </div>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Analyzing...' : 'Analyze Risk'}
                    </Button>
                </form>

                {isLoading && <AnalysisSkeleton />}

                {analysisResult && (
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-semibold mb-2">Risk Heatmap for {form.getValues('location')}</h3>
                            <TooltipProvider>
                                <div className="grid grid-cols-2 grid-rows-2 gap-1 w-full aspect-square max-w-sm mx-auto border rounded-lg p-1">
                                    {analysisResult.heatmapZones.map(zone => (
                                        <Tooltip key={zone.zone}>
                                            <TooltipTrigger>
                                                <div className={cn("rounded flex items-center justify-center text-white font-bold text-sm aspect-square", getRiskColor(zone.riskFactor))}>
                                                    {zone.zone}
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Risk Factor: {zone.riskFactor.toFixed(2)}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    ))}
                                </div>
                            </TooltipProvider>
                            <p className="text-sm text-muted-foreground mt-4">{analysisResult.overallRiskSummary}</p>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2 flex items-center gap-2"><ShieldAlert /> High-Risk Disease Threats</h3>
                             <div className="space-y-4">
                                {analysisResult.highRiskDiseases.map(disease => (
                                    <div key={disease.diseaseName} className="border p-3 rounded-lg bg-muted/30">
                                        <div className='flex justify-between items-center'>
                                             <p className="font-semibold text-primary">{disease.diseaseName}</p>
                                             <span className={cn("text-xs font-bold px-2 py-1 rounded-full", {
                                                 "bg-red-100 text-red-800": disease.riskLevel === 'High',
                                                 "bg-orange-100 text-orange-800": disease.riskLevel === 'Medium',
                                                 "bg-yellow-100 text-yellow-800": disease.riskLevel === 'Low',
                                             })}>
                                                {disease.riskLevel} Risk
                                             </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            <span className='font-medium text-foreground'>Primary crops affected:</span> {disease.primaryCropsAffected.join(', ')}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-2">
                                            <span className='font-medium text-foreground'>Prevention:</span> {disease.preventiveMeasures}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

const AnalysisSkeleton = () => (
    <div className="grid md:grid-cols-2 gap-6">
        <div>
            <Skeleton className="h-6 w-3/4 mb-4" />
            <Skeleton className="w-full aspect-square max-w-sm mx-auto" />
            <Skeleton className="h-16 w-full mt-4" />
        </div>
        <div>
            <Skeleton className="h-6 w-1/2 mb-4" />
            <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        </div>
    </div>
);
