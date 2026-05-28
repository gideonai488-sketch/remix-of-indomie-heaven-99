export type ServiceType = 'errand' | 'parcel' | 'package' | 'pharmacy';

export type ServiceStatus =
  | 'searching'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface ServiceRequest {
  id: string;
  user_id: string;
  service_type: ServiceType;
  status: ServiceStatus;
  pickup_address: string;
  delivery_address: string;
  customer_name: string;
  customer_phone: string;
  payment_method: 'momo' | 'cash';
  momo_phone?: string | null;
  service_fee: number;
  details: Record<string, any>;
  notes?: string | null;
  rider_id?: string | null;
  rider_name?: string | null;
  rider_phone?: string | null;
  rider_vehicle?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceDef {
  type: ServiceType;
  label: string;
  tagline: string;
  icon: string;
  color: string;
  accent: string;
}

export const SERVICE_DEFS: ServiceDef[] = [
  {
    type: 'errand',
    label: 'Errands',
    tagline: 'We run it for you',
    icon: '🏃',
    color: 'bg-orange-500/20',
    accent: 'text-orange-400',
  },
  {
    type: 'parcel',
    label: 'Parcel',
    tagline: 'Send anything, fast',
    icon: '📦',
    color: 'bg-blue-500/20',
    accent: 'text-blue-400',
  },
  {
    type: 'package',
    label: 'Package',
    tagline: 'Big or small, we carry',
    icon: '📫',
    color: 'bg-purple-500/20',
    accent: 'text-purple-400',
  },
  {
    type: 'pharmacy',
    label: 'Pharmacy',
    tagline: 'Meds at your door',
    icon: '💊',
    color: 'bg-green-500/20',
    accent: 'text-green-400',
  },
];
