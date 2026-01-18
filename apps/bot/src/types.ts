import { Context, SessionFlavor } from 'grammy';
import { ConversationFlavor } from '@grammyjs/conversations';

export type ConversationStep =
  | 'idle'
  | 'awaiting_city'
  | 'awaiting_date'
  | 'awaiting_slot'
  | 'awaiting_address'
  | 'awaiting_contact_name'
  | 'awaiting_contact_phone'
  | 'awaiting_confirmation'
  | 'awaiting_payment_proof';

export interface SessionData {
  step: ConversationStep;
}

export type BotContext = Context & SessionFlavor<SessionData> & ConversationFlavor;
