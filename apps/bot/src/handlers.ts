import { InputFile } from 'grammy';
import * as path from 'path';
import { BotContext } from './types';
import { mainMenuKeyboard, backToMainKeyboard, getMenuKeyboard, buildAllOrdersItemKeyboard } from './keyboards';
import { ApiClient } from './api-client';

export async function handleStart(ctx: BotContext) {
  ctx.session.draft = {};

  // Send persistent keyboard (with admin button for admins)
  await ctx.reply('👋 Добро пожаловать в МастерЧист!', {
    reply_markup: getMenuKeyboard(ctx.from?.id),
  });

  try {
    const animationPath = path.join(__dirname, '../assets/welcome.gif');
    await ctx.replyWithAnimation(new InputFile(animationPath), {
      caption: `<b>Сервис аренды наборов для химчистки.</b>

Выберите услугу в меню ниже 👇`,
      parse_mode: 'HTML',
    });
  } catch (err) {
    console.error('Failed to send welcome animation:', err);
    await ctx.reply(
      `<b>Сервис аренды наборов для химчистки.</b>

Выберите услугу в меню ниже 👇`,
      { parse_mode: 'HTML' }
    );
  }
}

export async function handleProCleaning(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    `👔 <b>Профессиональная химчистка</b>

Опишите загрязнения и отправьте фото.
Мастер свяжется с вами для оценки.`,
    { parse_mode: 'HTML', reply_markup: backToMainKeyboard }
  );
}

export async function handleCleaning(ctx: BotContext) {
  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery();
  }
  await ctx.reply(
    `🏠 <b>Клининг</b>

Услуга в разработке.`,
    { parse_mode: 'HTML', reply_markup: backToMainKeyboard }
  );
}

export async function handleBackToMain(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  ctx.session.draft = {};
  await ctx.reply('Выберите услугу:', { reply_markup: mainMenuKeyboard });
}

export async function handleCancel(ctx: BotContext) {
  await ctx.answerCallbackQuery('Отменено');
  ctx.session.draft = {};
  await ctx.reply('❌ Отменено.', { reply_markup: mainMenuKeyboard });
}

const STATUS_LABELS: Record<string, string> = {
  // Upper case (from constants)
  NEW: '🆕 Новый',
  AWAITING_PREPAYMENT: '⏳ Ожидает предоплаты',
  PREPAID: '💳 Предоплачен',
  CONFIRMED: '✅ Подтверждён',
  IN_PROGRESS: '🔄 В работе',
  COMPLETED: '✔️ Завершён',
  CANCELLED: '❌ Отменён',
  // Lower case (from API)
  new: '🆕 Новый',
  awaiting_prepayment: '⏳ Ожидает предоплаты',
  prepaid: '💳 Предоплачен',
  confirmed: '✅ Подтверждён',
  in_progress: '🔄 В работе',
  completed: '✔️ Завершён',
  cancelled: '❌ Отменён',
};

export async function handleMyOrders(ctx: BotContext) {
  const telegramId = ctx.from?.id;
  if (!telegramId) {
    await ctx.reply('❌ Не удалось определить пользователя.');
    return;
  }

  const api = new ApiClient(telegramId, ctx.from?.first_name, ctx.from?.username);
  const result = await api.getMyBookings();

  if (!result.ok) {
    await ctx.reply('❌ Ошибка при загрузке заказов. Попробуйте позже.');
    return;
  }

  const bookings = result.data;
  if (bookings.length === 0) {
    await ctx.reply('📋 У вас пока нет заказов.');
    return;
  }

  let message = '📋 <b>Ваши заказы:</b>\n\n';
  for (const b of bookings) {
    const status = STATUS_LABELS[b.status] ?? b.status;
    const date = b.scheduledDate ?? '—';
    const time = b.timeSlot ?? '';
    const kit = b.kitNumber ? `набор №${b.kitNumber}` : '';
    const service = b.service ?? '';
    
    message += `${status}\n`;
    message += `📅 ${date} ${time}\n`;
    if (kit) message += `🧹 ${kit}\n`;
    if (service) message += `📌 ${service}\n`;
    message += '\n';
  }

  await ctx.reply(message.trim(), { parse_mode: 'HTML' });
}

// Admin handlers
import { 
  adminMenuKeyboard, 
  superAdminMenuKeyboard, 
  buildAdminOrderKeyboard,
  exportPeriodKeyboard,
  adminManageKeyboard,
  buildAdminListKeyboard
} from './keyboards';
import { config } from './config';

// Cache for admin roles (to avoid API calls on every action)
const adminRoleCache: Map<number, { role: string; expires: number }> = new Map();

async function getAdminRole(ctx: BotContext): Promise<string | null> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return null;

  // Check cache first
  const cached = adminRoleCache.get(telegramId);
  if (cached && cached.expires > Date.now()) {
    return cached.role;
  }

  // Super admin from env always works (supports comma-separated list)
  const superAdminIds = config.ADMIN_TELEGRAM_ID?.split(',').map(id => id.trim()) || [];
  if (superAdminIds.includes(String(telegramId))) {
    adminRoleCache.set(telegramId, { role: 'super_admin', expires: Date.now() + 60000 });
    return 'super_admin';
  }

  // Check API for admin role
  const api = new ApiClient(telegramId, ctx.from?.first_name, ctx.from?.username);
  const result = await api.getAdminRole();
  
  if (result.ok) {
    adminRoleCache.set(telegramId, { role: result.data.role, expires: Date.now() + 60000 });
    return result.data.role;
  }

  return null;
}

function isSuperAdmin(role: string | null): boolean {
  return role === 'super_admin';
}

export async function handleAdminMenu(ctx: BotContext) {
  const role = await getAdminRole(ctx);
  if (!role) return;

  const keyboard = isSuperAdmin(role) ? superAdminMenuKeyboard : adminMenuKeyboard;
  const roleLabel = isSuperAdmin(role) ? '👑 Супер-админ' : '👨‍💼 Админ';

  await ctx.reply(
    `${roleLabel} <b>Админ-панель</b>

Выберите действие:`,
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
}

export async function handleAdminNewOrders(ctx: BotContext) {
  const role = await getAdminRole(ctx);
  if (!role) return;

  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const api = new ApiClient(telegramId, ctx.from?.first_name, ctx.from?.username);
  const result = await api.getAdminBookings();

  if (!result.ok) {
    await ctx.reply('❌ Ошибка при загрузке заказов.');
    return;
  }

  const pendingStatuses = ['new', 'awaiting_prepayment', 'prepaid'];
  const bookings = result.data.filter(b => pendingStatuses.includes(b.status));
  
  if (bookings.length === 0) {
    await ctx.reply('📋 Нет заказов, требующих внимания.');
    return;
  }

  await ctx.reply(`📋 <b>Заказы, требующие внимания (${bookings.length}):</b>`, { parse_mode: 'HTML' });

  for (const b of bookings.slice(0, 10)) {
    const status = STATUS_LABELS[b.status] ?? b.status;
    const date = b.scheduledDate ?? '—';
    const time = b.timeSlot ?? '';
    const kit = b.kitNumber ? `🧹 Набор №${b.kitNumber}` : '';
    const user = b.user ? `${b.user.firstName}` : '—';
    const addr = b.address ? `📍 ${b.address.addressLine}\n📞 ${b.address.contactPhone}\n👤 ${b.address.contactName}` : '';

    const message = `${status}

👤 Клиент: ${user}
📅 ${date} ${time}
${kit ? kit + '\n' : ''}${addr}`;

    await ctx.reply(message, { parse_mode: 'HTML', reply_markup: buildAdminOrderKeyboard(b.id, isSuperAdmin(role)) });
  }
}

export async function handleAdminAllOrders(ctx: BotContext) {
  const role = await getAdminRole(ctx);
  if (!role) return;

  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const api = new ApiClient(telegramId, ctx.from?.first_name, ctx.from?.username);
  const result = await api.getAdminBookings();

  if (!result.ok) {
    await ctx.reply('❌ Ошибка при загрузке заказов.');
    return;
  }

  const bookings = result.data;
  if (bookings.length === 0) {
    await ctx.reply('📋 Заказов нет.');
    return;
  }

  await ctx.reply(`📊 <b>Все заказы (${bookings.length}):</b>`, { parse_mode: 'HTML' });

  for (const b of bookings.slice(0, 10)) {
    const status = STATUS_LABELS[b.status] ?? b.status;
    const date = b.scheduledDate ?? '—';
    const user = b.user?.firstName ?? '—';
    const kit = b.kitNumber ? `№${b.kitNumber}` : '';
    const addr = b.address ? `📍 ${b.address.addressLine}` : '';
    
    const message = `${status} | ${date} ${kit} | ${user}\n${addr}`;
    
    const keyboard = buildAllOrdersItemKeyboard(b.id, isSuperAdmin(role));
    
    if (isSuperAdmin(role)) {
      await ctx.reply(message.trim(), { parse_mode: 'HTML', reply_markup: keyboard });
    } else {
      await ctx.reply(message.trim(), { parse_mode: 'HTML' });
    }
  }
  
  if (bookings.length > 10) {
    await ctx.reply(`<i>...и ещё ${bookings.length - 10} заказов</i>`, { parse_mode: 'HTML' });
  }
}

export async function handleAdminStats(ctx: BotContext) {
  const role = await getAdminRole(ctx);
  if (!role) return;

  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const api = new ApiClient(telegramId, ctx.from?.first_name, ctx.from?.username);
  const result = await api.getAdminStats();

  if (!result.ok) {
    await ctx.reply('❌ Ошибка при загрузке статистики.');
    return;
  }

  const stats = result.data;
  const message = `📈 <b>Статистика</b>

📊 Всего заказов: ${stats.totalBookings}
🆕 Новых: ${stats.newBookings}
⏳ Ожидают предоплаты: ${stats.awaitingPrepaymentBookings}
💳 Предоплачено: ${stats.prepaidBookings}
✅ Подтверждено: ${stats.confirmedBookings}
❌ Отменено: ${stats.cancelledBookings}`;

  await ctx.reply(message, { parse_mode: 'HTML' });
}

// Export handlers
export async function handleAdminExport(ctx: BotContext) {
  const role = await getAdminRole(ctx);
  if (!role) return;

  await ctx.reply('📥 <b>Экспорт заказов</b>\n\nВыберите период:', { 
    parse_mode: 'HTML', 
    reply_markup: exportPeriodKeyboard 
  });
}

export async function handleExportPeriod(ctx: BotContext, period: string) {
  const role = await getAdminRole(ctx);
  if (!role) return;

  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  await ctx.answerCallbackQuery('Формирую отчёт...');

  const api = new ApiClient(telegramId, ctx.from?.first_name, ctx.from?.username);
  const result = await api.exportBookings(period === 'all' ? undefined : period);

  if (!result.ok) {
    await ctx.reply('❌ Ошибка при экспорте.');
    return;
  }

  const buffer = result.data;
  
  if (buffer.length < 1000) {
    await ctx.reply('📋 Нет заказов за выбранный период.');
    return;
  }

  const periodLabels: Record<string, string> = {
    day: 'сегодня',
    week: 'неделя',
    month: 'месяц',
    all: 'всё_время'
  };

  const filename = `orders_${periodLabels[period] || 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`;

  await ctx.replyWithDocument(
    new InputFile(buffer, filename),
    { caption: `📊 Отчёт по заказам (${periodLabels[period] || 'всё время'})` }
  );
}

// Admin management handlers (super admin only)
export async function handleAdminManage(ctx: BotContext) {
  const role = await getAdminRole(ctx);
  if (!isSuperAdmin(role)) {
    await ctx.reply('❌ Только для супер-админа.');
    return;
  }

  await ctx.reply('👥 <b>Управление админами</b>', { 
    parse_mode: 'HTML', 
    reply_markup: adminManageKeyboard 
  });
}

export async function handleListAdmins(ctx: BotContext) {
  const role = await getAdminRole(ctx);
  if (!isSuperAdmin(role)) return;

  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  await ctx.answerCallbackQuery();

  const api = new ApiClient(telegramId, ctx.from?.first_name, ctx.from?.username);
  const result = await api.getAdmins();

  if (!result.ok) {
    await ctx.reply('❌ Ошибка при загрузке списка админов.');
    return;
  }

  const admins = result.data;
  
  if (admins.length === 0) {
    await ctx.reply('📋 Нет добавленных админов.\n\n<i>Вы — супер-админ (из настроек)</i>', { parse_mode: 'HTML' });
    return;
  }

  await ctx.reply(
    `📋 <b>Список админов (${admins.length}):</b>\n\nНажмите для удаления:`,
    { parse_mode: 'HTML', reply_markup: buildAdminListKeyboard(admins) }
  );
}

export async function handleAddAdminPrompt(ctx: BotContext) {
  const role = await getAdminRole(ctx);
  if (!isSuperAdmin(role)) return;

  await ctx.answerCallbackQuery();
  
  // Set session state to wait for admin ID
  ctx.session.awaitingAdminId = true;
  
  await ctx.reply(
    `➕ <b>Добавление админа</b>

Отправьте Telegram ID нового админа.

<i>Чтобы узнать ID, попросите человека отправить любое сообщение боту @userinfobot</i>`,
    { parse_mode: 'HTML' }
  );
}

export async function handleAddAdmin(ctx: BotContext, telegramIdStr: string) {
  const role = await getAdminRole(ctx);
  if (!isSuperAdmin(role)) return;

  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  ctx.session.awaitingAdminId = false;

  const api = new ApiClient(telegramId, ctx.from?.first_name, ctx.from?.username);
  const result = await api.addAdmin(telegramIdStr);

  if (!result.ok) {
    await ctx.reply(`❌ Ошибка: ${result.error}`);
    return;
  }

  await ctx.reply(`✅ Админ добавлен!\n\nID: <code>${result.data.telegramId}</code>`, { parse_mode: 'HTML' });
}

export async function handleRemoveAdmin(ctx: BotContext, adminTelegramId: string) {
  const role = await getAdminRole(ctx);
  if (!isSuperAdmin(role)) return;

  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  await ctx.answerCallbackQuery('Удаляю...');

  const api = new ApiClient(telegramId, ctx.from?.first_name, ctx.from?.username);
  const result = await api.removeAdmin(adminTelegramId);

  if (!result.ok) {
    await ctx.reply(`❌ Ошибка: ${result.error}`);
    return;
  }

  // Clear cache for removed admin
  adminRoleCache.delete(Number(adminTelegramId));

  await ctx.editMessageText(`✅ Админ <code>${adminTelegramId}</code> удалён.`, { parse_mode: 'HTML' });
}

// Delete booking (super admin only)
export async function handleDeleteBooking(ctx: BotContext, bookingId: string) {
  const role = await getAdminRole(ctx);
  if (!isSuperAdmin(role)) {
    await ctx.answerCallbackQuery('Только для супер-админа');
    return;
  }

  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  await ctx.answerCallbackQuery('Удаляю заказ...');

  const api = new ApiClient(telegramId, ctx.from?.first_name, ctx.from?.username);
  const result = await api.deleteBooking(bookingId);

  if (!result.ok) {
    await ctx.reply(`❌ Ошибка: ${result.error}`);
    return;
  }

  await ctx.editMessageText(`🗑 Заказ удалён.`);
}
