import { Context, SessionFlavor } from 'grammy';
import { ConversationFlavor } from '@grammyjs/conversations';

export interface BookingDraft {
  city?: string;
  scheduledDate?: string;
  timeSlotId?: string;
  timeSlotLabel?: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
}

export interface SessionData {
  draft: BookingDraft;
  pendingBookingId?: string;
  awaitingAdminId?: boolean;
}

export type BotContext = Context & SessionFlavor<SessionData> & ConversationFlavor;
