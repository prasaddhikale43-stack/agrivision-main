"use client";

import { useState } from 'react';
import { Header } from '@/components/agrivision/header';
import { HomePage } from '@/components/agrivision/home-page';
import { DashboardPage } from '@/components/agrivision/dashboard-page';
import { ScanCropPage } from '@/components/agrivision/scan-crop-page';
import { ProfilePage } from '@/components/agrivision/profile-page';
import { Footer } from '@/components/agrivision/footer';
import { AuthDialog } from '@/components/agrivision/auth-dialog';
import type { ViewType } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { WeatherNewsPage } from '@/components/agrivision/weather-news-page';
import { MyCropsPage } from '@/components/agrivision/my-crops-page';
import { RegisterExpertPage } from '@/components/agrivision/register-expert-page';
import { ExpertsPage } from '@/components/agrivision/experts-page';
import { CarbonFootprintPage } from '@/components/agrivision/carbon-footprint-page';
import { LeaderboardPage } from '@/components/agrivision/leaderboard-page';
import { AdminVerificationPage } from '@/components/agrivision/admin-verification-page';
import { PesticideLogPage } from '@/components/agrivision/pesticide-log-page';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import { Chatbot } from '@/components/agrivision/chatbot';


export default function Home() {
  const [activeView, setActiveView] = useState<ViewType>('home');
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const { user, loading } = useAuth();

  const handleNavigate = (view: ViewType) => {
    if ((view === 'profile' || view === 'dashboard' || view === 'crops' || view === 'registerExpert' || view === 'carbon' || view === 'leaderboard' || view === 'admin' || view === 'pesticide') && !user) {
        setIsAuthDialogOpen(true);
    } else {
        setActiveView(view);
    }
  };
  
  const handleLoginSuccess = () => {
    setIsAuthDialogOpen(false);
    setActiveView('dashboard');
  }

  const renderActiveView = () => {
    switch (activeView) {
      case 'home':
        return <HomePage setActiveView={handleNavigate} />;
      case 'dashboard':
        return <DashboardPage setActiveView={handleNavigate} />;
      case 'scan':
        return <ScanCropPage />;
      case 'profile':
        return user ? <ProfilePage /> : <HomePage setActiveView={handleNavigate} />;
      case 'weather':
        return <WeatherNewsPage />;
      case 'crops':
        return user ? <MyCropsPage /> : <HomePage setActiveView={handleNavigate} />;
      case 'pesticide':
        return user ? <PesticideLogPage /> : <HomePage setActiveView={handleNavigate} />;
      case 'registerExpert':
        return user ? <RegisterExpertPage setActiveView={setActiveView} /> : <HomePage setActiveView={handleNavigate} />;
      case 'experts':
        return <ExpertsPage onChatNow={() => setIsChatbotOpen(true)} />;
      case 'carbon':
        return user ? <CarbonFootprintPage setActiveView={setActiveView} /> : <HomePage setActiveView={handleNavigate} />;
      case 'leaderboard':
        return user ? <LeaderboardPage setActiveView={setActiveView} /> : <HomePage setActiveView={handleNavigate} />;
      case 'admin':
        return user ? <AdminVerificationPage setActiveView={setActiveView} /> : <HomePage setActiveView={handleNavigate} />;
      default:
        return <HomePage setActiveView={handleNavigate} />;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      <div className="flex flex-col min-h-screen bg-background">
        <Header activeView={activeView} setActiveView={handleNavigate} onSignInClick={() => setIsAuthDialogOpen(true)} />
        <main className="flex-grow">
          {renderActiveView()}
        </main>
        <Footer />
      </div>
      <Chatbot isOpen={isChatbotOpen} onOpenChange={setIsChatbotOpen} />
      <AuthDialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen} onLoginSuccess={handleLoginSuccess} />
    </I18nextProvider>
  );
}
