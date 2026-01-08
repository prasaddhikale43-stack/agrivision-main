"use client";

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { AgriVisionLogo } from './icons';
import { cn } from '@/lib/utils';
import type { ViewType } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { getAuth, signOut } from 'firebase/auth';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import { User as UserIcon, LogOut, Languages, Wheat, Sun, Moon, Briefcase, Shield, TestTube2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ThemeToggle } from './theme-toggle';
import { useTheme } from 'next-themes';

const ADMIN_UID = "ADMIN_UID_HERE"; // IMPORTANT: Replace this with your actual Admin User ID

interface HeaderProps {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  onSignInClick: () => void;
}

export function Header({ activeView, setActiveView, onSignInClick }: HeaderProps) {
  const { user, auth } = useAuth();
  const { t, i18n } = useTranslation();
  const { setTheme } = useTheme();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };
  
  const navItems: { name: string; view: ViewType }[] = [
    { name: t('nav.home'), view: 'home' },
    { name: t('nav.dashboard'), view: 'dashboard' },
    { name: t('nav.scan'), view: 'scan' },
    { name: t('nav.experts'), view: 'experts' },
    { name: t('nav.weather'), view: 'weather' },
    { name: t('nav.carbonFootprint'), view: 'carbon' },
  ];

  const handleSignOut = () => {
    if (auth) {
      signOut(auth);
      setActiveView('home');
    }
  };
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex items-center">
          <button onClick={() => setActiveView('home')} className="flex items-center gap-2">
            <AgriVisionLogo className="h-8 w-auto text-primary" />
            <span className="hidden font-bold sm:inline-block text-lg text-primary">
              AgriVision
            </span>
          </button>
        </div>
        <nav className="flex-1 items-center space-x-6 text-sm font-medium hidden md:flex">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveView(item.view)}
              className={cn(
                'transition-colors hover:text-primary',
                activeView === item.view ? 'text-primary font-semibold' : 'text-muted-foreground'
              )}
            >
              {item.name}
            </button>
          ))}
           {user && user.uid === ADMIN_UID && (
              <button
                onClick={() => setActiveView('admin')}
                className={cn(
                  'transition-colors hover:text-primary',
                  activeView === 'admin' ? 'text-primary font-semibold' : 'text-muted-foreground'
                )}
              >
                {t('nav.admin')}
              </button>
            )}
        </nav>
        <div className="flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? "User"} />
                      <AvatarFallback>{user.email?.charAt(0).toUpperCase() ?? 'U'}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.displayName ?? 'Agri-User'}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setActiveView('profile')}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>{t('profile.title')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveView('crops')}>
                    <Wheat className="mr-2 h-4 w-4" />
                    <span>{t('profile.myCrops')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveView('pesticide')}>
                    <TestTube2 className="mr-2 h-4 w-4" />
                    <span>Pesticide Log</span>
                  </DropdownMenuItem>
                   <DropdownMenuItem onClick={() => setActiveView('registerExpert')}>
                    <Briefcase className="mr-2 h-4 w-4" />
                    <span>{t('profile.registerAsExpert')}</span>
                  </DropdownMenuItem>
                  {user.uid === ADMIN_UID && (
                    <DropdownMenuItem onClick={() => setActiveView('admin')}>
                        <Shield className="mr-2 h-4 w-4" />
                        <span>{t('nav.admin')}</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                   <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Languages className="mr-2 h-4 w-4" />
                      <span>Language</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => changeLanguage('en')}>English</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => changeLanguage('mr')}>मराठी</DropdownMenuItem>
                      <DropdownMenuItem>हिन्दी</DropdownMenuItem>
                      <DropdownMenuItem>தமிழ்</DropdownMenuItem>
                      <DropdownMenuItem>ગુજરાતી</DropdownMenuItem>
                      <DropdownMenuItem>മലയാളം</DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Sun className="mr-2 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                      <Moon className="absolute mr-2 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                      <span>Theme</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('auth.logout')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
             <>
                <ThemeToggle />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Languages className="h-[1.2rem] w-[1.2rem]" />
                      <span className="sr-only">Change language</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => changeLanguage('en')}>English</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeLanguage('mr')}>मराठी</DropdownMenuItem>
                    <DropdownMenuItem>हिन्दी</DropdownMenuItem>
                    <DropdownMenuItem>தமிழ்</DropdownMenuItem>
                    <DropdownMenuItem>ગુજરાતી</DropdownMenuItem>
                    <DropdownMenuItem>മലയാളം</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button onClick={onSignInClick}>
                    {t('auth.signIn')}
                </Button>
             </>
            )}
        </div>
      </div>
    </header>
  );
}
