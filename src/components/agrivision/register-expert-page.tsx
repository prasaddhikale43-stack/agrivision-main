"use client";

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useDoc, setDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { ExpertProfile, ViewType } from '@/types';
import { Briefcase } from 'lucide-react';

const expertSchema = z.object({
  fullName: z.string().min(3, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'A valid phone number is required'),
  location: z.string().min(2, 'Location is required'),
  experience: z.coerce.number().min(0, 'Experience cannot be negative').positive('Experience must be a positive number'),
  fieldOfExpertise: z.string().min(3, 'Field of expertise is required'),
  bio: z.string().min(50, 'Bio must be at least 50 characters long').max(1000, 'Bio cannot exceed 1000 characters'),
});

type ExpertFormValues = z.infer<typeof expertSchema>;

interface RegisterExpertPageProps {
  setActiveView: (view: ViewType) => void;
}

export function RegisterExpertPage({ setActiveView }: RegisterExpertPageProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const firestore = useFirestore();

  const expertProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'experts', user.uid);
  }, [user, firestore]);

  const { data: expertProfile, isLoading: isProfileLoading } = useDoc<ExpertProfile>(expertProfileRef);

  const form = useForm<ExpertFormValues>({
    resolver: zodResolver(expertSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      experience: 0,
      fieldOfExpertise: '',
      bio: '',
    },
  });
  
  const { register, handleSubmit, reset, formState: { isDirty, isSubmitting, errors } } = form;

  useEffect(() => {
    if (expertProfile) {
      reset(expertProfile);
    } else if (user) {
        reset({
            fullName: user.displayName || '',
            email: user.email || '',
            phone: '',
            location: '',
            experience: 0,
            fieldOfExpertise: '',
            bio: '',
        });
    }
  }, [expertProfile, user, reset]);

  const onSubmit = async (data: ExpertFormValues) => {
    if (!expertProfileRef || !user) return;

    const profileData: ExpertProfile = {
      ...data,
      id: user.uid,
      userId: user.uid,
      isVerified: expertProfile?.isVerified ?? false, // Preserve verification status
      rating: expertProfile?.rating ?? 0, // Preserve rating
    };

    setDocumentNonBlocking(expertProfileRef, profileData, { merge: true });

    toast({ title: 'Success', description: 'Your expert profile has been saved.' });
    setActiveView('experts');
  };
  
  if (isProfileLoading) {
      return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl"><Briefcase /> Register as an Expert</CardTitle>
          <CardDescription>Share your expertise with the farming community. Complete your profile to get listed.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" {...register('fullName')} />
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Contact Email</Label>
                <Input id="email" type="email" {...register('email')} />
                 {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
            </div>
             <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="phone">Contact Phone</Label>
                    <Input id="phone" type="tel" {...register('phone')} />
                    {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" {...register('location')} placeholder="e.g., Pune, Maharashtra" />
                    {errors.location && <p className="text-sm text-destructive">{errors.location.message}</p>}
                </div>
            </div>
             <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="experience">Years of Experience</Label>
                    <Input id="experience" type="number" {...register('experience')} />
                    {errors.experience && <p className="text-sm text-destructive">{errors.experience.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="fieldOfExpertise">Field of Expertise</Label>
                    <Input id="fieldOfExpertise" {...register('fieldOfExpertise')} placeholder="e.g., Soil Science, Pest Control" />
                    {errors.fieldOfExpertise && <p className="text-sm text-destructive">{errors.fieldOfExpertise.message}</p>}
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="bio">Detailed Bio</Label>
                <Textarea id="bio" {...register('bio')} rows={6} placeholder="Describe your experience, skills, and how you can help farmers..." />
                {errors.bio && <p className="text-sm text-destructive">{errors.bio.message}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting || !isDirty} className="w-full md:w-auto">
              {isSubmitting ? 'Saving...' : 'Save Expert Profile'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
