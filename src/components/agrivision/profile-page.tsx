"use client";

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { UserProfile as UserProfileType } from '@/types';

const profileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  farmName: z.string().min(1, 'Farm name is required'),
  location: z.string().min(1, 'Location is required'),
  district: z.string().min(1, 'District is required for leaderboard ranking.'),
  phone: z.string().min(1, 'Phone number is required'),
  farmSize: z.coerce.number().positive('Farm size must be a positive number'),
  unitSystem: z.enum(['metric', 'imperial']),
  smsNotificationsEnabled: z.boolean(),
  emailNotificationsEnabled: z.boolean(),
  pushNotificationsEnabled: z.boolean(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfilePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfileType>(userProfileRef);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '',
      farmName: '',
      location: '',
      district: '',
      phone: '',
      farmSize: 0,
      unitSystem: 'metric',
      smsNotificationsEnabled: false,
      emailNotificationsEnabled: true,
      pushNotificationsEnabled: true,
    },
  });

  const { register, handleSubmit, reset, control, formState: { isDirty, isSubmitting, errors } } = form;

  useEffect(() => {
    if (userProfile) {
      reset({
        ...userProfile,
        fullName: userProfile.fullName ?? user?.displayName ?? '',
      });
    } else if (user) {
        reset({
            fullName: user.displayName ?? '',
            email: user.email ?? '',
        } as any);
    }
  }, [userProfile, user, reset]);

  const onSubmit = async (data: ProfileFormValues) => {
    if (!userProfileRef || !user) return;
    
    setDocumentNonBlocking(userProfileRef, {
        ...data,
        userId: user.uid,
        id: userProfile?.id ?? user.uid,
        email: user.email,
        displayName: data.fullName,
    }, { merge: true });

    toast({ title: 'Success', description: 'Your profile has been updated.' });
    reset(data); // Resets the dirty state
  };

  if (isProfileLoading) {
    return <div className="container mx-auto px-4 py-8">Loading profile...</div>;
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto px-4 py-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details here.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" {...register('fullName')} />
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="farmName">Farm Name</Label>
                <Input id="farmName" {...register('farmName')} />
                {errors.farmName && <p className="text-sm text-destructive">{errors.farmName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user?.email ?? ''} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" {...register('phone')} />
                {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" {...register('location')} placeholder="e.g., Anytown, State" />
                 {errors.location && <p className="text-sm text-destructive">{errors.location.message}</p>}
              </div>
               <div className="space-y-2">
                <Label htmlFor="district">District</Label>
                <Input id="district" {...register('district')} placeholder="e.g., Pune" />
                {errors.district && <p className="text-sm text-destructive">{errors.district.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="farmSize">Farm Size (Acres)</Label>
                <Input id="farmSize" type="number" {...register('farmSize')} />
                {errors.farmSize && <p className="text-sm text-destructive">{errors.farmSize.message}</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Adjust your application settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="unitSystem" className="flex items-center gap-2">
                  Unit System
                  <Tooltip>
                    <TooltipTrigger asChild><Info className="w-4 h-4 text-muted-foreground"/></TooltipTrigger>
                    <TooltipContent>
                      <p>Affects how data like temperature and farm size are displayed.</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                 <Controller
                    control={control}
                    name="unitSystem"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select system" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="metric">Metric</SelectItem>
                          <SelectItem value="imperial">Imperial</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
              </div>
              <div className="space-y-4">
                  <Label>Notification Settings</Label>
                  <div className="flex items-center justify-between p-3 rounded-md border">
                    <Label htmlFor="sms-notifications">SMS Notifications</Label>
                    <Controller control={control} name="smsNotificationsEnabled" render={({ field }) => (
                        <Switch id="sms-notifications" checked={field.value} onCheckedChange={field.onChange} />
                    )} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-md border">
                    <Label htmlFor="email-notifications">Email Notifications</Label>                     <Controller control={control} name="emailNotificationsEnabled" render={({ field }) => (
                        <Switch id="email-notifications" checked={field.value} onCheckedChange={field.onChange} />
                    )} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-md border">
                    <Label htmlFor="push-notifications">Push Notifications</Label>
                     <Controller control={control} name="pushNotificationsEnabled" render={({ field }) => (
                        <Switch id="push-notifications" checked={field.value} onCheckedChange={field.onChange} />
                    )} />
                  </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button type="submit" disabled={!isDirty || isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </TooltipProvider>
  );
}

    