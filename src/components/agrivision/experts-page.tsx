"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import type { ExpertProfile } from "@/types";
import { collection } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Star, Mail, Phone, MapPin, User, CheckCircle, MessageSquare, Bot } from "lucide-react";
import { Skeleton } from "../ui/skeleton";

interface ExpertsPageProps {
  onChatNow: () => void;
}

export function ExpertsPage({ onChatNow }: ExpertsPageProps) {
    const firestore = useFirestore();
    const expertsRef = useMemoFirebase(() => firestore ? collection(firestore, 'experts') : null, [firestore]);
    const { data: experts, isLoading } = useCollection<ExpertProfile>(expertsRef);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold tracking-tight">Find an Agricultural Expert</h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                    Connect with experienced professionals or chat with our AI expert to get advice and improve your farming practices.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* AI Expert Card */}
                <Card className="flex flex-col bg-primary/5 border-2 border-primary/20">
                    <CardHeader className="flex flex-row items-start gap-4">
                        <Avatar className="w-16 h-16 border-2 border-primary">
                            <AvatarFallback className="text-2xl bg-primary text-primary-foreground"><Bot /></AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <CardTitle className="text-xl flex items-center gap-2">
                                AgriBot AI
                                <Badge variant="default" className="bg-accent text-accent-foreground">Free</Badge>
                            </CardTitle>
                            <CardDescription>AI-Powered Agri-Assistant</CardDescription>
                            <div className="flex items-center gap-1 mt-2">
                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                <span className="text-sm font-bold">5.0</span>
                                <span className="text-xs text-muted-foreground">(Always Learning)</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <p className="text-sm text-muted-foreground mb-4">
                            Your instant, free AI expert for questions on crop health, soil, sustainable practices, and using the AgriVision platform. Available 24/7.
                        </p>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span>Infinite Experience</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span>Available Everywhere</span>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={onChatNow}>
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Chat Now
                        </Button>
                    </CardFooter>
                </Card>

                {isLoading && (
                    <>
                        <ExpertCardSkeleton />
                        <ExpertCardSkeleton />
                    </>
                )}
                
                {!isLoading && experts && experts.map(expert => (
                    <ExpertCard key={expert.id} expert={expert} />
                ))}
            </div>

            {!isLoading && (!experts || experts.length === 0) && (
                 <div className="col-span-3 text-center text-muted-foreground py-8">
                    <h2 className="text-xl font-semibold">No Human Experts Found</h2>
                    <p className="mt-2">Check back later as our community grows, or chat with our AgriBot AI now!</p>
                </div>
            )}
        </div>
    );
}

function ExpertCard({ expert }: { expert: ExpertProfile }) {
    const fallback = expert.fullName.charAt(0).toUpperCase();
    return (
        <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-start gap-4">
                <Avatar className="w-16 h-16 border-2 border-primary">
                    <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${expert.fullName}`} />
                    <AvatarFallback className="text-2xl">{fallback}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <CardTitle className="text-xl flex items-center gap-2">
                        {expert.fullName}
                        {expert.isVerified && <CheckCircle className="w-5 h-5 text-green-500" />}
                    </CardTitle>
                    <CardDescription>{expert.fieldOfExpertise}</CardDescription>
                    <div className="flex items-center gap-1 mt-2">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm font-bold">{expert.rating.toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">({Math.floor(Math.random() * 50) + 5} reviews)</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{expert.bio}</p>
                 <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>{expert.experience} years of experience</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{expert.location}</span>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Badge variant={expert.isVerified ? "default" : "secondary"}>
                    {expert.isVerified ? 'Verified' : 'Not Verified'}
                </Badge>
                <div className="flex gap-2">
                    <a href={`mailto:${expert.email}`}>
                        <Button variant="outline" size="icon"><Mail className="w-4 h-4" /><span className="sr-only">Email</span></Button>
                    </a>
                    <a href={`tel:${expert.phone}`}>
                        <Button size="icon"><Phone className="w-4 h-4" /><span className="sr-only">Call</span></Button>
                    </a>
                </div>
            </CardFooter>
        </Card>
    );
}

function ExpertCardSkeleton() {
    return (
        <Card>
            <CardHeader className="flex flex-row items-start gap-4">
                <Skeleton className="w-16 h-16 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
                 <div className="space-y-3 mt-4">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-5 w-1/2" />
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Skeleton className="h-6 w-20" />
                <div className="flex gap-2">
                    <Skeleton className="w-10 h-10" />
                    <Skeleton className="w-10 h-10" />
                </div>
            </CardFooter>
        </Card>
    )
}
