
"use client";

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import type { Crop, PesticideLog, SuggestOrganicAlternativeOutput } from '@/types';
import { Calendar as CalendarIcon, TestTube2, Sprout, Sparkles, AlertCircle, Info, Loader2, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { suggestOrganicAlternative } from '@/ai/flows/suggest-organic-alternative';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

const pesticideLogSchema = z.object({
  cropId: z.string().min(1, 'Please select a crop.'),
  pesticideName: z.string().min(1, 'Pesticide name is required.'),
  pesticideType: z.enum(['Organic', 'Inorganic'], { required_error: 'Pesticide type is required.' }),
  amount: z.coerce.number().positive('Amount must be a positive number.'),
  unit: z.string().min(1, 'Unit is required.'),
  applicationDate: z.date({ required_error: 'Application date is required.' }),
  notes: z.string().optional(),
});

type PesticideLogFormValues = z.infer<typeof pesticideLogSchema>;

export function PesticideLogPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const firestore = useFirestore();

  const [aiSuggestion, setAiSuggestion] = useState<SuggestOrganicAlternativeOutput | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const cropsRef = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/crops`) : null, [user, firestore]);
  const { data: crops, isLoading: areCropsLoading } = useCollection<Crop>(cropsRef);

  const pesticideLogRef = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/pesticideLogs`) : null, [user, firestore]);

  const { register, handleSubmit, control, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<PesticideLogFormValues>({
    resolver: zodResolver(pesticideLogSchema),
  });

  const selectedPesticideType = watch('pesticideType');
  const selectedPesticideName = watch('pesticideName');

  useEffect(() => {
    if (selectedPesticideType === 'Inorganic' && selectedPesticideName) {
      const handler = setTimeout(async () => {
        setIsAiLoading(true);
        setAiSuggestion(null);
        try {
          const result = await suggestOrganicAlternative({ pesticideName: selectedPesticideName });
          setAiSuggestion(result);
        } catch (e) {
          console.error("AI suggestion failed:", e);
          toast({ variant: 'destructive', title: "AI Suggestion Failed" });
        } finally {
          setIsAiLoading(false);
        }
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(handler);
    } else {
        setAiSuggestion(null);
    }
  }, [selectedPesticideType, selectedPesticideName, toast]);

  const onSubmit = async (data: PesticideLogFormValues) => {
    if (!pesticideLogRef || !user) return;

    const selectedCrop = crops?.find(c => c.id === data.cropId);
    if (!selectedCrop) return;

    const newLogData: Omit<PesticideLog, 'id'> = {
      ...data,
      userId: user.uid,
      cropName: selectedCrop.name,
      applicationDate: serverTimestamp() as any, // Let server set the timestamp
    };

    await addDocumentNonBlocking(pesticideLogRef, newLogData);

    toast({ title: 'Success', description: `Pesticide application for ${selectedCrop.name} has been logged.` });
    reset();
    setAiSuggestion(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl"><TestTube2 /> Log Pesticide Application</CardTitle>
          <CardDescription>Keep a record of your pesticide use to track insights on your dashboard.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <Controller
              name="cropId"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <Label>Select Crop</Label>
                  <Select onValueChange={field.onChange} value={field.value} disabled={areCropsLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder={areCropsLoading ? "Loading crops..." : "Select from your crops"} />
                    </SelectTrigger>
                    <SelectContent>
                      {crops && crops.length > 0 ? (
                        crops.map(crop => <SelectItem key={crop.id} value={crop.id}>{crop.name}</SelectItem>)
                      ) : (
                        <SelectItem value="no-crops" disabled>No crops found. Add one first.</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {errors.cropId && <p className="text-sm text-destructive">{errors.cropId.message}</p>}
                </div>
              )}
            />

            <div className="space-y-2">
              <Label htmlFor="pesticideName">Pesticide Name</Label>
              <Input id="pesticideName" {...register('pesticideName')} placeholder="e.g., Neem Oil, Cypermethrin" />
              {errors.pesticideName && <p className="text-sm text-destructive">{errors.pesticideName.message}</p>}
            </div>

            <Controller
              name="pesticideType"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <Label>Pesticide Type</Label>
                  <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Organic" id="organic" />
                      <Label htmlFor="organic" className="flex items-center gap-2"><Sprout className="text-green-500" /> Organic</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Inorganic" id="inorganic" />
                      <Label htmlFor="inorganic" className="flex items-center gap-2"><AlertCircle className="text-orange-500" /> Inorganic</Label>
                    </div>
                  </RadioGroup>
                  {errors.pesticideType && <p className="text-sm text-destructive">{errors.pesticideType.message}</p>}
                </div>
              )}
            />

            {isAiLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing... AI is looking for an organic alternative...</span>
                </div>
            )}

            {aiSuggestion && (
                <Alert>
                    <Bot className="h-4 w-4" />
                    <AlertTitle className="flex items-center gap-2">AI Suggestion: Organic Alternative</AlertTitle>
                    <AlertDescription className="space-y-2 mt-2">
                        <p>
                            For <span className="font-semibold">{selectedPesticideName}</span>, you could consider using <span className="font-semibold text-primary">{aiSuggestion.alternativeName}</span>.
                        </p>
                        <p><span className='font-semibold'>Reasoning:</span> {aiSuggestion.reasoning}</p>
                        <p><span className='font-semibold'>Application:</span> {aiSuggestion.applicationMethod}</p>
                        <div className="flex justify-end pt-2">
                            <Button type="button" size="sm" onClick={() => {
                                setValue('pesticideName', aiSuggestion.alternativeName);
                                setValue('pesticideType', 'Organic');
                                setAiSuggestion(null);
                            }}>Use this Suggestion</Button>
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" type="number" {...register('amount')} placeholder="e.g., 2.5" />
                {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                 <Controller
                    name="unit"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger id="unit">
                                <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="L">Liters (L)</SelectItem>
                                <SelectItem value="ml">Milliliters (ml)</SelectItem>
                                <SelectItem value="kg">Kilograms (kg)</SelectItem>
                                <SelectItem value="g">Grams (g)</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                />
                {errors.unit && <p className="text-sm text-destructive">{errors.unit.message}</p>}
              </div>
            </div>

             <Controller
                  control={control}
                  name="applicationDate"
                  render={({ field }) => (
                    <div className="space-y-2">
                       <Label htmlFor="applicationDate">Application Date</Label>
                       <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {errors.applicationDate && <p className="text-sm text-destructive">{errors.applicationDate.message}</p>}
                    </div>
                  )}
                />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Logging...' : 'Log Application'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
