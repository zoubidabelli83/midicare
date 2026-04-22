// types/provider.ts

export interface ProviderProfile {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'PROVIDER';
  isVerified: boolean;
  status: 'PENDING' | 'ACTIVE' | 'BANNED';
  avatarUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
  // Provider-specific fields
  hourlyRate?: number | null;
  yearsExperience?: number | null;
  specialties?: string | null;
  availability?: string | null; // JSON string
  certifications?: string | null;
  bio?: string | null;
  serviceRadius?: number | null;
  createdAt: string;
}

export interface ProviderDemand {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  seeker: {
    id: string;
    name: string;
    phone: string;
    avatarUrl?: string | null;
    lat: number | null;
    lng: number | null;
  };
  _count?: {
    applications: number;
  };
  distance?: number; // km from provider
}

export interface ProviderApplication {
  id: string;
  message: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  demand: {
    id: string;
    title: string;
    description: string;
    lat: number;
    lng: number;
    status: 'OPEN' | 'CLOSED';
    seeker: {
      id: string;
      name: string;
      phone: string;
    };
  };
}

export interface Availability {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
}