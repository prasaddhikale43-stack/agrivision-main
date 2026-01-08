'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Newspaper, Sun, Cloud, CloudRain, Wind, Droplets, AlertTriangle, BookOpen, Landmark } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fetchAgriNewsAndWeather } from '@/ai/flows/fetch-agri-news-and-weather';
import type { AgriNewsAndWeatherOutput, NewsArticle, WeatherData } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';


const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", 
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", 
  "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", 
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const WeatherIcon = ({ condition, className }: { condition: string, className?: string }) => {
    if (condition.toLowerCase().includes('rain')) return <CloudRain className={cn("w-8 h-8 text-blue-300", className)} />;
    if (condition.toLowerCase().includes('cloud')) return <Cloud className={cn("w-8 h-8 text-gray-300", className)} />;
    return <Sun className={cn("w-8 h-8 text-yellow-300", className)} />;
};


export function WeatherNewsPage() {
    const [selectedState, setSelectedState] = useState<string>('Maharashtra');
    const [data, setData] = useState<AgriNewsAndWeatherOutput | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [visibleCounts, setVisibleCounts] = useState({
        government: 1,
        disease: 1,
        climate: 1,
    });

    const loadData = async (state: string) => {
        setIsLoading(true);
        setData(null);
        setVisibleCounts({ government: 1, disease: 1, climate: 1 }); // Reset counts on new data load
        try {
            const result = await fetchAgriNewsAndWeather({ location: state });
            setData(result);
        } catch (error) {
            console.error("Failed to fetch news and weather:", error);
            // In a real app, you'd show a toast notification here
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData(selectedState);
    }, [selectedState]);

    const climateNews = data?.news.filter(article => article.category === 'Climate News') ?? [];
    const diseaseAlerts = data?.news.filter(article => article.category === 'Crop Disease Alerts') ?? [];
    const governmentNews = data?.news.filter(article => article.category === 'Government Policy') ?? [];

    const handleLoadMore = (category: 'government' | 'disease' | 'climate') => {
        const total = {
            government: governmentNews.length,
            disease: diseaseAlerts.length,
            climate: climateNews.length,
        };
        setVisibleCounts(prev => ({
            ...prev,
            [category]: total[category],
        }));
    };

    return (
        <div className="container mx-auto px-4 py-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                    <Newspaper className="w-8 h-8 text-primary" />
                    Weather & News
                </h1>
                <div className="flex items-center gap-2">
                    <label htmlFor="state-select" className="text-sm font-medium">Select State:</label>
                    <Select value={selectedState} onValueChange={setSelectedState}>
                        <SelectTrigger id="state-select" className="w-[200px]">
                            <SelectValue placeholder="Select a state" />
                        </SelectTrigger>
                        <SelectContent>
                            {indianStates.map(state => (
                                <SelectItem key={state} value={state}>{state}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Weather Section */}
                <div className="lg:col-span-1">
                    {isLoading ? <WeatherSkeleton /> : data && <WeatherDisplay weather={data.weather} location={selectedState} />}
                </div>

                {/* News Section */}
                <div className="lg:col-span-2 space-y-8">
                    {isLoading ? <NewsSkeleton /> : (
                        <>
                            <NewsSection 
                                title="Government Policy" 
                                icon={Landmark} 
                                articles={governmentNews} 
                                visibleCount={visibleCounts.government}
                                onLoadMore={() => handleLoadMore('government')}
                            />
                            <NewsSection 
                                title="Crop Disease Alerts" 
                                icon={AlertTriangle} 
                                articles={diseaseAlerts} 
                                visibleCount={visibleCounts.disease}
                                onLoadMore={() => handleLoadMore('disease')}
                            />
                            <NewsSection 
                                title="Climate News" 
                                icon={BookOpen} 
                                articles={climateNews} 
                                visibleCount={visibleCounts.climate}
                                onLoadMore={() => handleLoadMore('climate')}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

const WeatherDisplay = ({ weather, location }: { weather: WeatherData, location: string }) => (
    <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-primary text-primary-foreground shadow-lg">
        <div className="absolute inset-0 bg-black/20" />
         <WeatherIcon condition={weather.condition} className="absolute top-4 right-4 w-16 h-16 opacity-20" />
        <CardHeader className="relative z-10">
            <CardTitle className="text-white">Current Weather</CardTitle>
            <CardDescription className="text-blue-200">Weather in {location}</CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <WeatherIcon condition={weather.condition} className="w-12 h-12" />
                        <div>
                            <p className="text-5xl font-bold text-white">{weather.temperature}</p>
                            <p className="text-blue-100">{weather.condition}</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm text-blue-100">
                    <div className="flex items-center gap-2">
                        <Droplets className="w-4 h-4" />
                        <span>Humidity: {weather.humidity}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Wind className="w-4 h-4" />
                        <span>Wind: {weather.wind}</span>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
);

const NewsSection = ({ title, icon: Icon, articles, visibleCount, onLoadMore }: { title: string, icon: React.ElementType, articles: NewsArticle[], visibleCount: number, onLoadMore: () => void }) => (
    <div>
        <h2 className="text-2xl font-semibold flex items-center gap-3 mb-4">
            <Icon className="w-6 h-6 text-primary" /> {title}
        </h2>
        <div className="grid gap-6">
            {articles.length > 0 ? articles.slice(0, visibleCount).map(article => (
                <Card key={article.id} className="hover:shadow-md transition-shadow flex flex-col">
                    <div className="relative w-full h-40">
                         <Image 
                            src={article.imageUrl} 
                            alt={article.imageDescription}
                            fill
                            className="object-cover rounded-t-lg"
                        />
                    </div>
                    <CardHeader>
                        <CardTitle className="text-lg">{article.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <p className="text-sm text-muted-foreground">{article.summary}</p>
                    </CardContent>
                    <CardFooter className="text-xs text-muted-foreground flex justify-between">
                        <span>Source: {article.source}</span>
                        <span>{format(parseISO(article.publishedDate), 'MMM d, yyyy')}</span>
                    </CardFooter>
                </Card>
            )) : <p className="text-muted-foreground">No news available for this category.</p>}
        </div>
        {articles.length > visibleCount && (
            <div className="mt-4 text-center">
                <Button variant="secondary" onClick={onLoadMore}>
                    Load More {title}
                </Button>
            </div>
        )}
    </div>
);

const WeatherSkeleton = () => (
    <Card>
        <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-4 w-32" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
            </div>
        </CardContent>
    </Card>
);

const NewsSkeleton = () => (
    <div className="space-y-8">
        <div>
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="grid gap-6">
                {[...Array(1)].map((_, i) => (
                    <Card key={i}>
                        <Skeleton className="h-40 w-full rounded-t-lg" />
                        <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                        <CardContent><Skeleton className="h-10 w-full" /></CardContent>
                        <CardFooter><Skeleton className="h-4 w-1/2" /></CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    </div>
);
