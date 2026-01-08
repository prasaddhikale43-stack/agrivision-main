"use client";

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { analyzeCropImageAndProvideAdvice } from '@/ai/flows/analyze-crop-image-and-provide-advice';
import { analyzeSandImageAndProvideAdvice } from '@/ai/flows/analyze-sand-image-and-provide-advice';
import { storeAIScanResults } from '@/ai/flows/store-ai-scan-results';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Upload, List, Sparkles, AlertTriangle, Leaf, Info, Image as ImageIcon, Camera, VideoOff, Percent, Droplets, FlaskConical, TestTube2, Sprout } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { AnalyzeCropImageAndProvideAdviceOutput, AnalyzeSandImageAndProvideAdviceOutput, ScanHistory } from '@/types';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '../ui/progress';
import { ClimateHeatmap } from './climate-heatmap';


// Utility to resize image from a data URI
const resizeImageFromDataUri = (dataUri: string, maxSize: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > height) {
        if (width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Could not get canvas context'));
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg')); // Always use jpeg for consistency
    };
    img.onerror = reject;
    img.src = dataUri;
  });
};


export function ScanCropPage() {
  const [view, setView] = useState<'scan' | 'history'>('scan');
  const [preview, setPreview] = useState<string | null>(null);
  const [cropAnalysisResult, setCropAnalysisResult] = useState<AnalyzeCropImageAndProvideAdviceOutput | null>(null);
  const [sandAnalysisResult, setSandAnalysisResult] = useState<AnalyzeSandImageAndProvideAdviceOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'crop' | 'soil'>('crop');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const firestore = useFirestore();

  const scanHistoryRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, `users/${user.uid}/scans`);
  }, [user, firestore]);
  
  const scanHistoryQuery = useMemoFirebase(() => scanHistoryRef ? query(scanHistoryRef, orderBy('timestamp', 'desc')) : null, [scanHistoryRef]);

  const { data: scanHistory, isLoading: isHistoryLoading } = useCollection<ScanHistory>(scanHistoryQuery);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };
  
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setHasCameraPermission(true);
      if (videoRef.current) {
        setPreview(null);
        setCropAnalysisResult(null);
        setSandAnalysisResult(null);
        videoRef.current.srcObject = stream;
        setIsCameraOpen(true);
      }
    } catch (err) {
      console.error("Error accessing camera: ", err);
      setHasCameraPermission(false);
      setIsCameraOpen(false);
      toast({
        variant: "destructive",
        title: "Camera access denied",
        description: "Please enable camera permissions in your browser settings to use this feature.",
      });
    }
  };

  const handleTabChange = (value: string) => {
      setActiveTab(value as 'crop' | 'soil');
      setPreview(null);
      setCropAnalysisResult(null);
      setSandAnalysisResult(null);
      stopCamera();
  }
  
  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        toast({ variant: 'destructive', title: 'Camera not ready', description: 'Please wait for the stream.' });
        return;
      }
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUri = canvas.toDataURL('image/jpeg');
        setPreview(dataUri);
      }
      stopCamera();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      stopCamera();
      setPreview(null);
      setCropAnalysisResult(null);
      setSandAnalysisResult(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleAnalyze = async () => {
    if (!preview) {
      toast({ variant: 'destructive', title: 'No image selected', description: 'Please select an image to analyze.' });
      return;
    }
    
    setIsLoading(true);
    setCropAnalysisResult(null);
    setSandAnalysisResult(null);

    try {
        const resizedImage = await resizeImageFromDataUri(preview, 800);
        const thumbnail = await resizeImageFromDataUri(resizedImage, 200);

        if (activeTab === 'crop') {
            const result = await analyzeCropImageAndProvideAdvice({ photoDataUri: resizedImage });
            setCropAnalysisResult(result);
            toast({ title: 'Crop Analysis Complete', description: 'AI diagnosis and advice are ready.' });
      
            if(user && scanHistoryRef) {
              const scanData = await storeAIScanResults({
                userId: user.uid,
                scanType: 'crop',
                timestamp: new Date().toISOString(),
                imageThumbnail: thumbnail,
                results: result
              });

              addDocumentNonBlocking(scanHistoryRef, {
                ...scanData,
                timestamp: serverTimestamp(),
              });
            }
        } else {
            const result = await analyzeSandImageAndProvideAdvice({ photoDataUri: resizedImage });
            setSandAnalysisResult(result);
            toast({ title: 'Soil Analysis Complete', description: 'AI recommendations are ready.' });

             if(user && scanHistoryRef) {
              const scanData = await storeAIScanResults({
                userId: user.uid,
                scanType: 'soil',
                timestamp: new Date().toISOString(),
                imageThumbnail: thumbnail,
                results: result,
              });

              addDocumentNonBlocking(scanHistoryRef, {
                ...scanData,
                timestamp: serverTimestamp(),
              });
            }
        }

    } catch (error) {
      console.error("Analysis Error:", error);
      toast({ variant: 'destructive', title: 'Analysis Failed', description: 'An error occurred during analysis.' });
    } finally {
      setIsLoading(false);
    }
  };

  const AnalysisResultContent = () => (
    <div className="space-y-6 text-sm">
        {cropAnalysisResult && (
            <>
                <InfoBlock title="Scanned Crop" content={cropAnalysisResult.cropName} icon={Leaf} />
                <div className="space-y-2">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-primary">
                        <Percent className="w-5 h-5" /> Health Score
                    </h3>
                    <div className="flex items-center gap-4">
                        <Progress value={cropAnalysisResult.healthScore} className="w-full" />
                        <span className="font-bold text-lg">{cropAnalysisResult.healthScore}%</span>
                    </div>
                </div>
                <InfoBlock title="Diagnosis" content={cropAnalysisResult.diagnosis} icon={AlertTriangle} destructive />
                <InfoBlock title="AI-Powered Advice" content={cropAnalysisResult.advice} icon={Sparkles} />
                <InfoBlock title="Climate Prediction" content={cropAnalysisResult.climatePrediction} icon={Info} />
                <InfoBlock title="Climate Effect" content={cropAnalysisResult.climateAffect} icon={Info} />
                <InfoBlock title="Pesticides in India" content={cropAnalysisResult.pesticidesInIndia} icon={Info} />
                <InfoBlock title="Pesticide Uses" content={cropAnalysisResult.pesticideUses} icon={Info} />
                <InfoBlock title="Summary" content={cropAnalysisResult.summary} icon={Info} />
            </>
        )}
        {sandAnalysisResult && (
            <>
                <InfoBlock title="Capacity to Grow" content={sandAnalysisResult.capacityToGrow} icon={Sprout} />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <h3 className="font-semibold text-lg flex items-center gap-2 text-primary">
                          <Droplets className="w-5 h-5" /> Water Level
                      </h3>
                      <div className="flex items-center gap-2">
                          <Progress value={sandAnalysisResult.waterPercentage} className="w-full" />
                          <span className="font-bold">{sandAnalysisResult.waterPercentage}%</span>
                      </div>
                  </div>
                  <div className="space-y-2">
                      <h3 className="font-semibold text-lg flex items-center gap-2 text-primary">
                          <FlaskConical className="w-5 h-5" /> Nutrient Level
                      </h3>
                      <div className="flex items-center gap-2">
                          <Progress value={sandAnalysisResult.nutrientLevel} className="w-full" />
                           <span className="font-bold">{sandAnalysisResult.nutrientLevel}%</span>
                      </div>
                  </div>
                </div>
                <InfoPesticides title="Pesticides for Growth" content={sandAnalysisResult.pesticidesForGrowth} icon={Info} />
                <InfoBlock title="Water Needed" content={sandAnalysisResult.waterNeeded} icon={Info} />
            </>
        )}
    </div>
  );

  const InfoBlock = ({ title, content, icon: Icon, destructive = false }: { title: string, content?: string, icon: React.ElementType, destructive?: boolean }) => (
    <div>
        <h3 className={`font-semibold text-lg flex items-center gap-2 ${destructive ? 'text-destructive' : 'text-primary'}`}>
            <Icon className="w-5 h-5" /> {title}
        </h3>
        <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{content || 'N/A'}</p>
    </div>
  );
  
  const InfoPesticides = ({ title, content, icon: Icon }: { title: string, content?: string, icon: React.ElementType }) => (
    <div>
        <h3 className="font-semibold text-lg flex items-center gap-2 text-primary">
            <Icon className="w-5 h-5" /> {title}
        </h3>
        <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{content || 'N/A'}</p>
    </div>
    );

  const ScanView = () => (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="crop">Scan Crop</TabsTrigger>
            <TabsTrigger value="soil">Scan Soil</TabsTrigger>
        </TabsList>
        <TabsContent value="crop">
            <ScanInterface />
        </TabsContent>
        <TabsContent value="soil">
            <ScanInterface />
        </TabsContent>
    </Tabs>
  );

  const ScanInterface = () => (
    <div className="grid md:grid-cols-2 gap-8 mt-4">
    <Card>
      <CardHeader>
        <CardTitle>1. Provide Image</CardTitle>
        <CardDescription>Upload a photo or use your camera to scan a {activeTab}.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-4">
        <div className="w-full h-64 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/50 overflow-hidden relative">
          <video ref={videoRef} className={`w-full h-full object-cover ${isCameraOpen ? '' : 'hidden'}`} autoPlay muted playsInline />
          <canvas ref={canvasRef} className="hidden"></canvas>
          
          {preview && !isCameraOpen && (
            <Image src={preview} alt="Preview" width={256} height={256} className="max-h-full w-auto object-contain rounded-md" />
          )}

          {!preview && !isCameraOpen && (
             <div className="text-center text-muted-foreground p-4">
              <ImageIcon className="mx-auto h-12 w-12" />
              <p>Image preview will appear here.</p>
            </div>
          )}

          {isCameraOpen && !hasCameraPermission && (
             <Alert variant="destructive" className="m-4">
                <AlertTitle>Camera Access Denied</AlertTitle>
                <AlertDescription>Enable permissions in your browser.</AlertDescription>
              </Alert>
          )}
        </div>

        <Input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" id="file-upload" />
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" /> Upload
            </Button>
            {!isCameraOpen ? (
                <Button variant="outline" onClick={startCamera}>
                    <Camera className="mr-2 h-4 w-4" /> Use Camera
                </Button>
            ) : (
                <Button variant="destructive" onClick={stopCamera}>
                    <VideoOff className="mr-2 h-4 w-4" /> Close Camera
                </Button>
            )}
            {isCameraOpen && (
                <Button onClick={handleCapture}>
                    <Camera className="mr-2 h-4 w-4" /> Capture
                </Button>
            )}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleAnalyze} disabled={isLoading || !preview} className="w-full">
          {isLoading ? 'Analyzing...' : <><Sparkles className="mr-2 h-4 w-4" /> Analyze {activeTab === 'crop' ? 'Crop' : 'Soil'}</>}
        </Button>
      </CardFooter>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>2. Analysis Results</CardTitle>
        <CardDescription>AI-driven insights for your {activeTab} will appear here.</CardDescription>
      </CardHeader>
      <CardContent className="min-h-[400px] max-h-[500px] overflow-y-auto">
        {isLoading && (
          <div className="space-y-4 pt-4">
            <Skeleton className="h-8 w-[150px]" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-[120px]" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-4 w-[150px]" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}
        {!isLoading && (cropAnalysisResult || sandAnalysisResult) && <AnalysisResultContent />}
        {!isLoading && !cropAnalysisResult && !sandAnalysisResult && (
          <div className="text-center text-muted-foreground pt-16">Results will be displayed here.</div>
        )}
      </CardContent>
    </Card>
  </div>
  );
  
  const HistoryView = () => (
    <Card>
      <CardHeader>
        <CardTitle>Scan History</CardTitle>
        <CardDescription>A log of all your previous crop and soil scans.</CardDescription>
      </CardHeader>
      <CardContent>
        {isHistoryLoading ? (
            <p>Loading scan history...</p>
        ) : !user ? (
          <div className="text-center text-muted-foreground py-12">
            <p>Please sign in to view your scan history.</p>
          </div>
        ) : scanHistory && scanHistory.length > 0 ? (
          <ul className="space-y-4">
            {scanHistory.map(scan => {
              if (!scan.results) return null; // Defensive check

              const isCropScan = scan.scanType === 'crop';
              const results = scan.results as any;
              const title = isCropScan ? results.cropName : 'Soil Analysis';
              const description = isCropScan ? results.diagnosis : `Nutrient Level: ${results.nutrientLevel}%`;

              return (
                <li key={scan.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50">
                  {scan.imageThumbnail ? (
                     <Image src={scan.imageThumbnail} alt={title} width={64} height={64} className="rounded-md object-cover"/>
                  ) : (
                    <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center">
                        {isCropScan ? <Leaf className="w-8 h-8 text-muted-foreground" /> : <TestTube2 className="w-8 h-8 text-muted-foreground" />}
                    </div>
                  )}
                  <div className="flex-grow">
                    <p className="font-semibold">{title}</p>
                    <p className="text-sm text-muted-foreground truncate">{description}</p>
                  </div>
                  <div className="text-sm text-muted-foreground text-right">
                    {scan.timestamp ? formatDistanceToNow(new Date(scan.timestamp.seconds * 1000), { addSuffix: true }) : ''}
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="text-center text-muted-foreground py-12">
            <p>No scans found.</p>
            <p>Your saved scan history will appear here.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Agri-Scanner</h1>
        <Button variant="outline" onClick={() => setView(view === 'scan' ? 'history' : 'scan')}>
          {view === 'scan' ? <><List className="mr-2 h-4 w-4"/> View Scan History</> : <><Sparkles className="mr-2 h-4 w-4"/> New Scan</>}
        </Button>
      </div>
      
      {view === 'scan' ? <ScanView /> : <HistoryView />}

      {view === 'scan' && <ClimateHeatmap />}

    </div>
  );
}
