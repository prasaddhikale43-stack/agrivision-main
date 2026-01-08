"use client";

import { useState } from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, serverTimestamp } from 'firebase/firestore';
import type { Crop } from '@/types';
import { Calendar as CalendarIcon, PlusCircle, Wheat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const cropSchema = z.object({
  name: z.string().min(1, 'Crop name is required'),
  plantingDate: z.date({ required_error: 'Planting date is required' }),
  areaPlanted: z.coerce.number().positive('Area must be a positive number'),
  status: z.enum(['Planted', 'Growing', 'Flowering', 'Harvesting', 'Fallow']),
  expectedYield: z.coerce.number().optional(),
});

type CropFormValues = z.infer<typeof cropSchema>;

export function MyCropsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const firestore = useFirestore();

  const cropsRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'crops');
  }, [user, firestore]);

  const { data: crops, isLoading } = useCollection<Crop>(cropsRef);

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<CropFormValues>({
    resolver: zodResolver(cropSchema),
    defaultValues: {
      status: 'Planted',
    },
  });

  const onSubmit = async (data: CropFormValues) => {
    if (!cropsRef || !user) return;

    const newCropData = {
      ...data,
      userId: user.uid,
      plantingDate: data.plantingDate.toISOString(),
      createdAt: serverTimestamp(),
    };

    await addDocumentNonBlocking(cropsRef, newCropData);

    toast({ title: 'Success', description: `${data.name} has been added to your crops.` });
    reset();
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Crops</h1>
        {/* The add form is now inline, so a button to show it is not needed unless we hide it */}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><PlusCircle /> Add a New Crop</CardTitle>
              <CardDescription>Enter the details of a crop you are managing.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Crop Name</Label>
                  <Input id="name" {...register('name')} placeholder="e.g., Corn, Wheat" />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>
                
                <Controller
                  control={control}
                  name="plantingDate"
                  render={({ field }) => (
                    <div className="space-y-2">
                       <Label htmlFor="plantingDate">Planting Date</Label>
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
                      {errors.plantingDate && <p className="text-sm text-destructive">{errors.plantingDate.message}</p>}
                    </div>
                  )}
                />

                <div className="space-y-2">
                  <Label htmlFor="areaPlanted">Area Planted (acres)</Label>
                  <Input id="areaPlanted" type="number" {...register('areaPlanted')} placeholder="e.g., 50" />
                  {errors.areaPlanted && <p className="text-sm text-destructive">{errors.areaPlanted.message}</p>}
                </div>
                
                <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <div className="space-y-2">
                        <Label htmlFor="status">Current Status</Label>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Planted">Planted</SelectItem>
                            <SelectItem value="Growing">Growing</SelectItem>
                            <SelectItem value="Flowering">Flowering</SelectItem>
                            <SelectItem value="Harvesting">Harvesting</SelectItem>
                            <SelectItem value="Fallow">Fallow</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />

                <div className="space-y-2">
                  <Label htmlFor="expectedYield">Expected Yield (tons, optional)</Label>
                  <Input id="expectedYield" type="number" {...register('expectedYield')} placeholder="e.g., 100" />
                </div>

              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? 'Adding...' : 'Add Crop'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Your Crop Portfolio</CardTitle>
              <CardDescription>An overview of all the crops you're currently managing.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Crop Name</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Planting Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">Loading your crops...</TableCell>
                    </TableRow>
                  ) : crops && crops.length > 0 ? (
                    crops.map(crop => (
                      <TableRow key={crop.id}>
                        <TableCell className="font-medium flex items-center gap-2"><Wheat className="w-4 h-4 text-primary" />{crop.name}</TableCell>
                        <TableCell>{crop.areaPlanted} acres</TableCell>
                        <TableCell>{format(new Date(crop.plantingDate), 'PPP')}</TableCell>
                        <TableCell>{crop.status}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No crops added yet. Use the form to add your first crop.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

    