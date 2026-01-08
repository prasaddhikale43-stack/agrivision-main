
import type { User, Auth } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';

export type UserProfile = {
  id: string;
  userId: string;
  fullName: string;
  farmName: string;
  location: string;
  district: string;
  phone: string;
  farmSize: number;
  unitSystem: 'metric' | 'imperial';
  smsNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
  lastUpdated?: string;
  totalCarbonCredits?: number;
  rank?: number;
};

export type LeaderboardEntry = {
    userId: string;
    fullName: string;
    totalCarbonCredits: number;
    rank: number;
};

export type ExpertProfile = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  experience: number;
  fieldOfExpertise: string;
  bio: string;
  isVerified: boolean;
  rating: number;
};

export type ScanHistory = {
  id: string;
  userId: string;
  timestamp: Timestamp;
  scanType: 'crop' | 'soil';
  imageThumbnail: string;
  results: AnalyzeCropImageAndProvideAdviceOutput | AnalyzeSandImageAndProvideAdviceOutput;
};

export type AnalyzeCropImageAndProvideAdviceOutput = {
  cropName: string;
  diagnosis: string;
  healthScore: number;
  advice: string;
  climatePrediction: string;
  climateAffect: string;
  pesticidesInIndia: string;
  pesticideUses: string;
  summary: string;
};

export type AnalyzeSandImageAndProvideAdviceOutput = {
  capacityToGrow: string;
  pesticidesForGrowth: string;
  waterNeeded: string;
  waterPercentage: number;
  nutrientLevel: number;
};

export type Crop = {
  id: string;
  userId: string;
  name: string;
  plantingDate: string; // ISO String
  areaPlanted: number;
  status: 'Planted' | 'Growing' | 'Flowering' | 'Harvesting' | 'Fallow';
  expectedYield?: number;
};

export type ActivityLog = {
    id: string;
    userId: string;
    activityType: string;
    area?: number;
    pesticideUsed?: string;
    pesticideAmount?: number;
    notes?: string;
    createdAt: Timestamp;
    status: 'Pending' | 'Approved' | 'Rejected';
    calculatedCredits?: number;
    photoUrls: string[];
    advice?: string;
    climateImpactAnalysis?: string;
};

export type PesticideLog = {
    id: string;
    userId: string;
    cropId: string;
    cropName: string;
    pesticideName: string;
    pesticideType: 'Organic' | 'Inorganic';
    amount: number;
    unit: string;
    applicationDate: Timestamp;
    notes?: string;
};

export type Suggestion = {
    id: string;
    userId: string;
    relatedActivityId: string;
    suggestionText: string;
    createdAt: Timestamp;
    isRead: boolean;
};

export type CalculateCarbonCreditsOutput = {
    estimatedCO2SavedKg: number;
    rewardPoints: number;
    reductionAdvice: string;
    climateImpactAnalysis: string;
    isApproved: boolean;
    verificationDetails: string;
    pesticideAnalysis: string;
    properUseAdvice: string;
};

export type CarbonPractice = {
    id: string;
    name: string;
    baseFactor: number;
    unit: string;
};

export type ViewType = 'home' | 'dashboard' | 'scan' | 'profile' | 'weather' | 'crops' | 'registerExpert' | 'experts' | 'carbon' | 'leaderboard' | 'admin' | 'pesticide';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  appId: string;
  auth: Auth | null;
}

export type WeatherData = {
    temperature: string;
    condition: string;
    humidity: string;
    wind: string;
};
  
export type NewsArticle = {
    id: string;
    title: string;
    summary: string;
    source: string;
    publishedDate: string; // ISO 8601 format
    category: 'Climate News' | 'Crop Disease Alerts' | 'Government Policy';
    imageUrl: string;
    imageDescription: string;
};
  
export type AgriNewsAndWeatherOutput = {
    weather: WeatherData;
    news: NewsArticle[];
};

export type DiseaseRisk = {
    diseaseName: string;
    riskLevel: 'Low' | 'Medium' | 'High';
    primaryCropsAffected: string[];
    preventiveMeasures: string;
};

export type HeatmapZone = {
    zone: string;
    riskFactor: number;
};

export type ClimateDiseaseRiskOutput = {
    overallRiskSummary: string;
    heatmapZones: HeatmapZone[];
    highRiskDiseases: DiseaseRisk[];
};

export type PesticideInsight = {
    cropName: string;
    organic: number;
    chemical: number;
};

export type GetPesticideInsightsOutput = {
    insights: PesticideInsight[];
    overallAdvice: string;
};

export type SuggestOrganicAlternativeOutput = {
    alternativeName: string;
    reasoning: string;
    applicationMethod: string;
};


export type ContentPart = 
  | { text: string; }
  | { media: { url: string; contentType?: string } };

export type ChatMessage = {
  role: 'user' | 'model';
  content: ContentPart[];
};
