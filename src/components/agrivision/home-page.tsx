"use client";

import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Users, BarChart2, ShieldCheck, Leaf, Cpu, Droplets, Sun, Scan, FlaskConical, Briefcase, Newspaper, Thermometer } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { ViewType } from '@/types';

interface HomePageProps {
  setActiveView: (view: ViewType) => void;
}

const heroImage = PlaceHolderImages.find(p => p.id === "homeHero");

const metrics = [
  { value: "10K+", label: "home.metrics.farmers", icon: Users },
  { value: "98%", label: "home.metrics.productivity", icon: BarChart2 },
  { value: "5M+", label: "home.metrics.acres", icon: ShieldCheck },
];

const objectives = [
  { icon: Leaf, title: "home.objectives.enhance.title", description: "home.objectives.enhance.description" },
  { icon: Cpu, title: "home.objectives.optimize.title", description: "home.objectives.optimize.description" },
  { icon: ShieldCheck, title: "home.objectives.sustainability.title", description: "home.objectives.sustainability.description" },
];

const solutions = [
    { icon: Cpu, title: "home.solutions.diagnostics.title", description: "home.solutions.diagnostics.description" },
    { icon: Droplets, title: "home.solutions.irrigation.title", description: "home.solutions.irrigation.description" },
    { icon: Sun, title: "home.solutions.forecasting.title", description: "home.solutions.forecasting.description" },
];

const features = [
    { icon: Thermometer, title: "home.features.weather.title", description: "home.features.weather.description", view: "weather" as ViewType },
    { icon: Scan, title: "home.features.cropScan.title", description: "home.features.cropScan.description", view: "scan" as ViewType },
    { icon: FlaskConical, title: "home.features.sandScan.title", description: "home.features.sandScan.description", view: "scan" as ViewType },
    { icon: Briefcase, title: "home.features.expert.title", description: "home.features.expert.description", view: "experts" as ViewType },
    { icon: Newspaper, title: "home.features.alerts.title", description: "home.features.alerts.description", view: "weather" as ViewType },
];

export function HomePage({ setActiveView }: HomePageProps) {
  const { t } = useTranslation();

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[70vh] flex items-center justify-center text-center text-white">
        {heroImage && (
             <Image
                src={heroImage.imageUrl}
                alt={heroImage.description}
                fill
                className="object-cover"
                priority
                data-ai-hint={heroImage.imageHint}
            />
        )}
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 p-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            {t('home.hero.title')}
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-neutral-200">
            {t('home.hero.subtitle')}
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button size="lg" onClick={() => setActiveView('dashboard')}>
              {t('home.hero.ctaDashboard')}
            </Button>
            <Button size="lg" variant="secondary" onClick={() => setActiveView('scan')}>
              {t('home.hero.ctaScan')}
            </Button>
          </div>
        </div>
      </section>

      {/* Metrics Section */}
      <section className="-mt-16 relative z-20 container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {metrics.map((metric) => (
                <Card key={metric.label} className="shadow-lg">
                    <CardContent className="p-6 flex flex-col items-center text-center">
                        <metric.icon className="h-10 w-10 text-primary mb-3" />
                        <span className="text-3xl font-bold">{metric.value}</span>
                        <p className="text-muted-foreground mt-1">{t(metric.label)}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
      </section>

      {/* Core Objectives Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold">{t('home.objectives.title')}</h2>
          <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">{t('home.objectives.subtitle')}</p>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {objectives.map((obj) => (
                <div key={obj.title} className="flex gap-4 items-start">
                    <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <obj.icon className="w-6 h-6 text-primary" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">{t(obj.title)}</h3>
                        <p className="mt-1 text-muted-foreground">{t(obj.description)}</p>
                    </div>
                </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrated Solution Section */}
      <section className="py-16 md:py-24 bg-white dark:bg-card">
        <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="order-2 md:order-1">
                    <h2 className="text-3xl font-bold">{t('home.solutions.title')}</h2>
                    <p className="mt-4 text-muted-foreground">{t('home.solutions.subtitle')}</p>
                    <ul className="mt-8 space-y-6">
                        {solutions.map((sol) => (
                             <li key={sol.title} className="flex items-start">
                                <sol.icon className="h-6 w-6 text-primary mr-4 mt-1 flex-shrink-0" />
                                <div>
                                    <h4 className="font-semibold">{t(sol.title)}</h4>
                                    <p className="text-muted-foreground text-sm">{t(sol.description)}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="order-1 md:order-2">
                  {PlaceHolderImages.find(p => p.id === "integratedSolution") && (
                    <Image
                        src={PlaceHolderImages.find(p => p.id === "integratedSolution")!.imageUrl}
                        alt={PlaceHolderImages.find(p => p.id === "integratedSolution")!.description}
                        width={600}
                        height={400}
                        className="rounded-lg shadow-xl"
                        data-ai-hint={PlaceHolderImages.find(p => p.id === "integratedSolution")!.imageHint}
                    />
                  )}
                </div>
            </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold">{t('home.features.title')}</h2>
          <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">{t('home.features.subtitle')}</p>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <Card key={feature.title} className="text-left hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveView(feature.view)}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">{t(feature.title)}</h3>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">{t(feature.description)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
