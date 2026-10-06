import { PlatformSettings } from '../types/rental';

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  commissionRate: 0.15, // 15% platform commission
  gstRate: 0.18, // 18% GST
  dailyKmAllowance: 300, // 300 km included per day
  excessKmRate: 15, // ₹15 per excess kilometer
  cancellationFreeHours: 24, // Free cancellation up to 24h prior
  cancellationPenaltyPct: 0.20, // 20% fee if cancelled late
};
