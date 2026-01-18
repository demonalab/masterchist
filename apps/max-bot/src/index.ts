import { MaxApi, MaxUpdate } from './max-api';
import { getState } from './state';
import {
  handleStart,
  handleSelfCleaning,
  handleProCleaning,
  handleCleaning,
  handleHelp,
  handleMyOrders,
  handleCitySelection,
  handleDateSelection,
  handleSlotSelection,
  handleTextMessage,
  handleConfirm,
  handleCancel,
  handleBack,
} from './handlers';

const api = new MaxApi();

async function handleUpdate(update: MaxUpdate) {
  try {
    console.log('Processing update type:', update.update_type);
    
    if (update.update_type === 'message_created' && update.message) {
      const chatId = update.message.recipient.chat_id;
      const userId = update.message.sender.user_id;
      const text = update.message.body?.text || '';
      const lowerText = text.toLowerCase();
      console.log(`Message from chat ${chatId}, user ${userId}: "${text}"`);

      // Check if user is in a conversation
      const state = getState(userId);

      if (lowerText === '/start' || lowerText === 'start' || lowerText === 'начать') {
        await handleStart(chatId, userId);
      } else if (state.step !== 'idle') {
        // User is in conversation - process text input
        await handleTextMessage(chatId, userId, text);
      } else {
        // Unknown command, show menu
        await handleStart(chatId, userId);
      }
    }

    if (update.update_type === 'message_callback' && update.callback) {
      const userId = update.callback.user.user_id;
      // chatId is in update.message.recipient.chat_id (top level for callbacks)
      const msgChatId = (update as any).message?.recipient?.chat_id;
      const callbackMsgChatId = update.callback.message?.recipient?.chat_id;
      const chatId = msgChatId || callbackMsgChatId;
      
      console.log(`Callback: msgChatId=${msgChatId}, callbackMsgChatId=${callbackMsgChatId}, chatId=${chatId}`);
      
      if (!chatId) {
        console.log('No chat_id in callback');
        return;
      }

      await api.answerCallback(update.callback.callback_id);

      const payload = update.callback.payload;
      console.log(`Callback from user ${userId}, chatId ${chatId}: ${payload}`);

      // Handle main actions
      if (payload === 'main_menu') {
        await handleStart(chatId, userId);
      } else if (payload === 'service:self_cleaning') {
        await handleSelfCleaning(chatId, userId);
      } else if (payload === 'service:pro_cleaning') {
        await handleProCleaning(chatId, userId);
      } else if (payload === 'service:cleaning') {
        await handleCleaning(chatId);
      } else if (payload === 'help') {
        await handleHelp(chatId);
      } else if (payload === 'my_orders') {
        await handleMyOrders(chatId, userId);
      } else if (payload === 'confirm') {
        await handleConfirm(chatId, userId);
      } else if (payload === 'cancel') {
        await handleCancel(chatId, userId);
      } else if (payload.startsWith('back:')) {
        const target = payload.replace('back:', '');
        await handleBack(chatId, userId, target);
      } else if (payload.startsWith('city:')) {
        const city = payload.replace('city:', '');
        await handleCitySelection(chatId, userId, city);
      } else if (payload.startsWith('date:')) {
        const date = payload.replace('date:', '');
        await handleDateSelection(chatId, userId, date);
      } else if (payload.startsWith('slot:')) {
        const parts = payload.split(':');
        const slotId = parts[1];
        const timeDisplay = parts[2] || '';
        await handleSlotSelection(chatId, userId, slotId, timeDisplay);
      }
    }
  } catch (err) {
    console.error('Error handling update:', err);
  }
}

async function startPolling() {
  console.log('MAX Bot starting with long polling...');
  
  const me = await api.getMe();
  console.log(`Bot info: ${me.name} (@${me.username})`);

  let marker: number | undefined;

  while (true) {
    try {
      const result = await api.getUpdates(marker, 30);
      console.log(`Got ${result.updates?.length || 0} updates, marker: ${result.marker}`);
      
      if (result.updates && result.updates.length > 0) {
        for (const update of result.updates) {
          console.log('Update:', JSON.stringify(update));
          await handleUpdate(update);
        }
      }
      
      if (result.marker) {
        marker = result.marker;
      }
    } catch (err) {
      console.error('Polling error:', err);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

startPolling().catch(console.error);
