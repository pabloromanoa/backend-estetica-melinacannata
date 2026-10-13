import { Category } from '../domain/catalog';

export interface ProviderSummaryView {
  id: string;
  displayName: string;
  specialty: string | null;
  avatarUrl: string | null;
}

export interface ServiceView {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  durationMinutes: number;
  price: number;
  depositAmount: number;
  prepMinutes: number;
  cleanupMinutes: number;
  isActive: boolean;
  recommendationTags: string[];
  specificDates: string[];
  categories: Category[];
  providers: ProviderSummaryView[];
}

export interface TreatmentView {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  recommendationTags: string[];
  services: ServiceView[];
}
