// State management for conversations (since MAX doesn't have grammyjs/conversations)

export type ConversationStep = 
  | 'idle'
  | 'self_cleaning:city'
  | 'self_cleaning:date'
  | 'self_cleaning:time'
  | 'self_cleaning:address'
  | 'self_cleaning:name'
  | 'self_cleaning:phone'
  | 'self_cleaning:confirm'
  | 'pro_cleaning:city'
  | 'pro_cleaning:address'
  | 'pro_cleaning:name'
  | 'pro_cleaning:phone'
  | 'pro_cleaning:description'
  | 'pro_cleaning:photo';

export interface UserState {
  step: ConversationStep;
  data: {
    serviceCode?: string;
    city?: string;
    cityName?: string;
    date?: string;
    displayDate?: string;
    timeSlotId?: string;
    timeSlotDisplay?: string;
    address?: string;
    street?: string;
    house?: string;
    apartment?: string;
    contactName?: string;
    contactPhone?: string;
    description?: string;
    weekOffset?: number;
  };
}

// In-memory state storage (in production, use Redis)
const userStates = new Map<number, UserState>();

export function getState(userId: number): UserState {
  return userStates.get(userId) || { step: 'idle', data: {} };
}

export function setState(userId: number, state: UserState): void {
  userStates.set(userId, state);
}

export function resetState(userId: number): void {
  userStates.set(userId, { step: 'idle', data: {} });
}

export function updateStateData(userId: number, data: Partial<UserState['data']>): void {
  const current = getState(userId);
  setState(userId, {
    ...current,
    data: { ...current.data, ...data },
  });
}

export function setStep(userId: number, step: ConversationStep): void {
  const current = getState(userId);
  setState(userId, { ...current, step });
}
