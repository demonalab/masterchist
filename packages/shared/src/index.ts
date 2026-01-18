export const Cities = {
  ROSTOV_NA_DONU: 'ROSTOV_NA_DONU',
  BATAYSK: 'BATAYSK',
  STAVROPOL: 'STAVROPOL',
} as const;

export type City = (typeof Cities)[keyof typeof Cities];

export const ServiceCodes = {
  SELF_CLEANING: 'self_cleaning',
  PRO_CLEANING: 'pro_cleaning',
  CLEANING: 'cleaning',
} as const;

export type ServiceCode = (typeof ServiceCodes)[keyof typeof ServiceCodes];

export const BookingStatuses = {
  NEW: 'new',
  AWAITING_PREPAYMENT: 'awaiting_prepayment',
  PREPAID: 'prepaid',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
} as const;

export type BookingStatus = (typeof BookingStatuses)[keyof typeof BookingStatuses];
