"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AgriVisionLogo } from './icons';
import { useAuth } from '@/hooks/use-auth';
import { 
  initiateEmailSignUp, 
  initiateEmailSignIn 
} from '@/firebase/non-blocking-login';
import { Auth, getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

const authSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type AuthFormValues = z.infer<typeof authSchema>;

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginSuccess?: () => void;
}

export function AuthDialog({ open, onOpenChange, onLoginSuccess }: AuthDialogProps) {
  const [isLoginView, setIsLoginView] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { auth } = useAuth();

  const { register, handleSubmit, formState: { errors }, reset } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
  });

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      reset();
      setIsLoginView(true);
    }
    onOpenChange(isOpen);
  };

  const onSubmit = async (data: AuthFormValues) => {
    setIsLoading(true);
    if (!auth) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'Firebase Auth is not initialized.',
      });
      setIsLoading(false);
      return;
    }

    try {
      if (isLoginView) {
        await signInWithEmailAndPassword(auth, data.email, data.password);
      } else {
        await createUserWithEmailAndPassword(auth, data.email, data.password);
      }
      // The onAuthStateChanged listener in providers.tsx will handle the success case.
      // We can optimistically call onLoginSuccess here.
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (error: any) {
        let description = "An unexpected error occurred.";
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            description = 'Invalid email or password. Please try again.';
        } else if (error.code === 'auth/email-already-in-use') {
            description = 'An account with this email already exists.';
        }
      toast({
        variant: "destructive",
        title: "Authentication Failed",
        description: description,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="items-center text-center">
          <AgriVisionLogo className="h-10 w-auto text-primary" />
          <DialogTitle className="text-2xl font-bold">{isLoginView ? 'Welcome Back' : 'Create an Account'}</DialogTitle>
          <DialogDescription>
            Enter your credentials to {isLoginView ? 'log in to' : 'create'} your account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="name@example.com" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Processing...' : (isLoginView ? 'Log In' : 'Sign Up')}
          </Button>
        </form>
        <div className="text-center text-sm">
          {isLoginView ? "Don't have an account? " : "Already have an account? "}
          <Button variant="link" className="p-0 h-auto" onClick={() => setIsLoginView(!isLoginView)}>
            {isLoginView ? 'Sign Up' : 'Log In'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
