'use client';

import { useState, useEffect } from 'react';
import { useBookingStore } from '@/lib/booking-store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CaretLeft, ChartBar, ClipboardText, Clock, Check, X, Phone,
  SpinnerGap, User, MapPin, Package, Warning, Export, Trash, UserPlus, Users
} from '@phosphor-icons/react';
import { api } from '@/lib/api';
import { useHaptic } from '@/lib/haptic';

interface AdminBooking {
  id: string;
  status: string;
  scheduledDate: string | null;
  createdAt: string;
  kitNumber: number | null;
  timeSlot: string | null;
  service: string | null;
  user: { telegramId: string; firstName: string } | null;
  address: { addressLine: string; contactName: string; contactPhone: string } | null;
}

interface AdminStats {
  totalBookings: number;
  newBookings: number;
  awaitingPrepaymentBookings: number;
  prepaidBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
}

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  AWAITING_PREPAYMENT: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  PREPAID: 'bg-green-500/20 text-green-400 border-green-500/30',
  CONFIRMED: 'bg-accent-green/20 text-accent-green border-accent-green/30',
  IN_PROGRESS: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  COMPLETED: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Новый',
  AWAITING_PREPAYMENT: 'Ожидает оплаты',
  PREPAID: 'Предоплачен',
  CONFIRMED: 'Подтверждён',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Завершён',
  CANCELLED: 'Отменён',
};

type Tab = 'stats' | 'orders' | 'admins';
type StatusFilter = 'all' | 'NEW' | 'AWAITING_PREPAYMENT' | 'PREPAID' | 'CONFIRMED';

interface Admin {
  id: string;
  telegramId: string;
  role: string;
}

export function AdminStep() {
  const { setStep } = useBookingStore();
  const haptic = useHaptic();
  const [tab, setTab] = useState<Tab>('stats');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [newAdminId, setNewAdminId] = useState('');
  const [showAddAdmin, setShowAddAdmin] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (tab === 'orders') {
      loadBookings();
    } else if (tab === 'admins' && role === 'super_admin') {
      loadAdmins();
    }
  }, [tab, statusFilter, role]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [roleRes, statsRes] = await Promise.all([
        api.getAdminRole(),
        api.getAdminStats(),
      ]);
      
      if (!roleRes.ok) {
        setError('Нет доступа к админ-панели');
        setLoading(false);
        return;
      }
      
      setRole(roleRes.data.role);
      if (statsRes.ok) setStats(statsRes.data);
    } catch (err) {
      setError('Ошибка загрузки');
    }
    setLoading(false);
  };

  const loadBookings = async () => {
    try {
      const res = await api.getAdminBookings(statusFilter === 'all' ? undefined : statusFilter);
      if (res.ok) setBookings(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAdmins = async () => {
    try {
      const res = await api.getAdmins();
      if (res.ok) setAdmins(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirm = async (bookingId: string) => {
    haptic.medium();
    setActionLoading(true);
    const res = await api.confirmBooking(bookingId);
    setActionLoading(false);
    if (res.ok) {
      haptic.success();
      setSelectedBooking(null);
      loadBookings();
      loadData();
    } else {
      haptic.error();
      alert(res.error);
    }
  };

  const handleReject = async (bookingId: string) => {
    haptic.medium();
    setActionLoading(true);
    const res = await api.rejectBooking(bookingId);
    setActionLoading(false);
    if (res.ok) {
      haptic.success();
      setSelectedBooking(null);
      loadBookings();
      loadData();
    } else {
      haptic.error();
      alert(res.error);
    }
  };

  const handleDelete = async (bookingId: string) => {
    if (!confirm('Удалить заказ?')) return;
    haptic.heavy();
    setActionLoading(true);
    const res = await api.deleteBooking(bookingId);
    setActionLoading(false);
    if (res.ok) {
      haptic.success();
      setSelectedBooking(null);
      loadBookings();
      loadData();
    } else {
      haptic.error();
      alert(res.error);
    }
  };

  const handleExport = async (period: string) => {
    haptic.light();
    const res = await api.exportBookings(period === 'all' ? undefined : period);
    if (res.ok) {
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders_${period}_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      haptic.success();
    } else {
      haptic.error();
      alert(res.error);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminId.trim()) return;
    haptic.medium();
    const res = await api.addAdmin(newAdminId.trim());
    if (res.ok) {
      haptic.success();
      setNewAdminId('');
      setShowAddAdmin(false);
      loadAdmins();
    } else {
      haptic.error();
      alert(res.error);
    }
  };

  const handleRemoveAdmin = async (telegramId: string) => {
    if (!confirm('Удалить админа?')) return;
    haptic.heavy();
    const res = await api.removeAdmin(telegramId);
    if (res.ok) {
      haptic.success();
      loadAdmins();
    } else {
      haptic.error();
      alert(res.error);
    }
  };

  const handleBack = () => setStep('service');

  if (loading) {
    return (
      <div className="screen items-center justify-center">
        <SpinnerGap weight="bold" className="w-8 h-8 text-accent-green animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="screen items-center justify-center text-center">
        <Warning weight="duotone" className="w-16 h-16 text-accent-red mb-4" />
        <p className="text-white/60">{error}</p>
        <button onClick={handleBack} className="btn-primary mt-6">
          Назад
        </button>
      </div>
    );
  }

  return (
    <div className="screen relative overflow-hidden">
      <div className="floating-glow bg-accent-purple top-40 -right-20 animate-glow-pulse" />

      {/* Back */}
      <motion.button 
        onClick={handleBack}
        className="btn-ghost flex items-center gap-2 -ml-4 mb-4"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        whileTap={{ scale: 0.95 }}
      >
        <CaretLeft weight="bold" className="w-4 h-4" />
        <span>Назад</span>
      </motion.button>

      {/* Hero */}
      <motion.div className="mb-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <p className="label-sm">{role === 'super_admin' ? 'Супер-админ' : 'Админ'}</p>
        <h1 className="text-hero">
          Админ <span className="text-hero-accent">панель</span>
        </h1>
      </motion.div>

      {/* Tabs */}
      <motion.div 
        className="flex gap-2 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <button
          onClick={() => { haptic.light(); setTab('stats'); }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
            tab === 'stats' 
              ? 'bg-accent-green text-black' 
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          <ChartBar weight="duotone" className="w-4 h-4" />
          Стат
        </button>
        <button
          onClick={() => { haptic.light(); setTab('orders'); }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
            tab === 'orders' 
              ? 'bg-accent-green text-black' 
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          <ClipboardText weight="duotone" className="w-4 h-4" />
          Заказы
        </button>
        {role === 'super_admin' && (
          <button
            onClick={() => { haptic.light(); setTab('admins'); }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
              tab === 'admins' 
                ? 'bg-accent-green text-black' 
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            <Users weight="duotone" className="w-4 h-4" />
            Админы
          </button>
        )}
      </motion.div>

      {/* Stats Tab */}
      {tab === 'stats' && stats && (
        <motion.div 
          className="space-y-3 flex-1 overflow-y-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="glass-card-static p-4">
            <p className="text-xs text-white/40 mb-1">Всего заказов</p>
            <p className="text-3xl font-bold text-white">{stats.totalBookings}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card-static p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <p className="text-xs text-white/40">Новые</p>
              </div>
              <p className="text-2xl font-bold text-white">{stats.newBookings}</p>
            </div>
            <div className="glass-card-static p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <p className="text-xs text-white/40">Ожидают оплаты</p>
              </div>
              <p className="text-2xl font-bold text-white">{stats.awaitingPrepaymentBookings}</p>
            </div>
            <div className="glass-card-static p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <p className="text-xs text-white/40">Предоплачено</p>
              </div>
              <p className="text-2xl font-bold text-white">{stats.prepaidBookings}</p>
            </div>
            <div className="glass-card-static p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-accent-green" />
                <p className="text-xs text-white/40">Подтверждено</p>
              </div>
              <p className="text-2xl font-bold text-white">{stats.confirmedBookings}</p>
            </div>
          </div>
          
          <div className="glass-card-static p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <p className="text-xs text-white/40">Отменено</p>
            </div>
            <p className="text-2xl font-bold text-white">{stats.cancelledBookings}</p>
          </div>

          {/* Export */}
          <div className="glass-card-static p-4">
            <p className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <Export weight="duotone" className="w-4 h-4" />
              Экспорт в Excel
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'day', label: 'День' },
                { key: 'week', label: 'Неделя' },
                { key: 'month', label: 'Месяц' },
                { key: 'all', label: 'Всё' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleExport(key)}
                  className="py-2 px-3 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-white/70 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Orders Tab */}
      {tab === 'orders' && (
        <motion.div 
          className="flex-1 flex flex-col overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Status Filter */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-3">
            {[
              { key: 'all', label: 'Все' },
              { key: 'NEW', label: 'Новые' },
              { key: 'AWAITING_PREPAYMENT', label: 'Ожидают' },
              { key: 'PREPAID', label: 'Оплачено' },
              { key: 'CONFIRMED', label: 'Подтв.' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key as StatusFilter)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === key
                    ? 'bg-accent-green text-black'
                    : 'bg-white/5 text-white/60'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Bookings List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {bookings.length === 0 ? (
              <div className="text-center text-white/40 py-8">
                Нет заказов
              </div>
            ) : (
              bookings.map((booking) => (
                <button
                  key={booking.id}
                  onClick={() => setSelectedBooking(booking)}
                  className="glass-card-static p-3 w-full text-left hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs text-white/40">#{booking.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-sm font-medium text-white">{booking.service || 'Услуга'}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs border ${STATUS_COLORS[booking.status] || 'bg-white/10 text-white/60'}`}>
                      {STATUS_LABELS[booking.status] || booking.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/50">
                    {booking.scheduledDate && (
                      <span className="flex items-center gap-1">
                        <Clock weight="duotone" className="w-3 h-3" />
                        {new Date(booking.scheduledDate).toLocaleDateString('ru-RU')}
                      </span>
                    )}
                    {booking.kitNumber && (
                      <span className="flex items-center gap-1">
                        <Package weight="duotone" className="w-3 h-3" />
                        Набор #{booking.kitNumber}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* Booking Detail Modal */}
      <AnimatePresence>
        {selectedBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-end"
            onClick={() => setSelectedBooking(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-[#1a1a2e] rounded-t-3xl p-5 w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />
              
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-white/40">#{selectedBooking.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-lg font-bold text-white">{selectedBooking.service}</p>
                </div>
                <span className={`px-3 py-1 rounded-lg text-sm border ${STATUS_COLORS[selectedBooking.status]}`}>
                  {STATUS_LABELS[selectedBooking.status]}
                </span>
              </div>

              <div className="space-y-3">
                {selectedBooking.scheduledDate && (
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                    <Clock weight="duotone" className="w-5 h-5 text-accent-green" />
                    <div>
                      <p className="text-xs text-white/40">Дата и время</p>
                      <p className="text-sm text-white">
                        {new Date(selectedBooking.scheduledDate).toLocaleDateString('ru-RU')}
                        {selectedBooking.timeSlot && `, ${selectedBooking.timeSlot}`}
                      </p>
                    </div>
                  </div>
                )}

                {selectedBooking.kitNumber && (
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                    <Package weight="duotone" className="w-5 h-5 text-accent-purple" />
                    <div>
                      <p className="text-xs text-white/40">Набор</p>
                      <p className="text-sm text-white">#{selectedBooking.kitNumber}</p>
                    </div>
                  </div>
                )}

                {selectedBooking.address && (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                      <MapPin weight="duotone" className="w-5 h-5 text-accent-blue" />
                      <div>
                        <p className="text-xs text-white/40">Адрес</p>
                        <p className="text-sm text-white">{selectedBooking.address.addressLine}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                      <User weight="duotone" className="w-5 h-5 text-yellow-400" />
                      <div className="flex-1">
                        <p className="text-xs text-white/40">Клиент</p>
                        <p className="text-sm text-white">{selectedBooking.address.contactName}</p>
                      </div>
                      <a 
                        href={`tel:${selectedBooking.address.contactPhone}`}
                        className="flex items-center gap-2 px-3 py-1.5 bg-accent-green/20 rounded-lg text-accent-green text-sm"
                      >
                        <Phone weight="duotone" className="w-4 h-4" />
                        {selectedBooking.address.contactPhone}
                      </a>
                    </div>
                  </>
                )}

                {selectedBooking.user && (
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <span className="text-sm">📱</span>
                    </div>
                    <div>
                      <p className="text-xs text-white/40">Telegram</p>
                      <p className="text-sm text-white">
                        {selectedBooking.user.firstName} (ID: {selectedBooking.user.telegramId})
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-5 space-y-2">
                {['NEW', 'AWAITING_PREPAYMENT', 'PREPAID'].includes(selectedBooking.status) && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleConfirm(selectedBooking.id)}
                      disabled={actionLoading}
                      className="py-3 px-4 bg-accent-green text-black font-medium rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <SpinnerGap className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Check weight="bold" className="w-5 h-5" />
                          Подтвердить
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleReject(selectedBooking.id)}
                      disabled={actionLoading}
                      className="py-3 px-4 bg-red-500/20 text-red-400 font-medium rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <X weight="bold" className="w-5 h-5" />
                      Отклонить
                    </button>
                  </div>
                )}

                {role === 'super_admin' && (
                  <button
                    onClick={() => handleDelete(selectedBooking.id)}
                    disabled={actionLoading}
                    className="w-full py-3 px-4 bg-red-500/10 border border-red-500/20 text-red-400 font-medium rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Trash weight="duotone" className="w-5 h-5" />
                    Удалить заказ
                  </button>
                )}

                <button
                  onClick={() => setSelectedBooking(null)}
                  className="w-full py-3 px-4 bg-white/5 text-white/60 font-medium rounded-xl"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admins Tab */}
      {tab === 'admins' && role === 'super_admin' && (
        <motion.div 
          className="flex-1 flex flex-col overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowAddAdmin(true)}
              className="flex-1 py-2.5 px-4 bg-accent-green text-black rounded-xl text-sm font-medium flex items-center justify-center gap-2"
            >
              <UserPlus weight="bold" className="w-4 h-4" />
              Добавить админа
            </button>
          </div>

          {/* Add Admin Modal */}
          {showAddAdmin && (
            <div className="glass-card-static p-4 mb-4">
              <p className="text-sm text-white/60 mb-3">Введите Telegram ID:</p>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={newAdminId}
                  onChange={(e) => setNewAdminId(e.target.value)}
                  placeholder="123456789"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-accent-green/50"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddAdmin}
                    className="flex-1 px-4 py-2.5 bg-accent-green text-black rounded-xl font-medium"
                  >
                    Добавить
                  </button>
                  <button
                    onClick={() => { setShowAddAdmin(false); setNewAdminId(''); }}
                    className="flex-1 px-4 py-2.5 bg-white/5 text-white/60 rounded-xl"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Admins List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {admins.length === 0 ? (
              <div className="text-center text-white/40 py-8">
                <p>Нет добавленных админов</p>
                <p className="text-xs mt-1">Вы — супер-админ (из настроек)</p>
              </div>
            ) : (
              admins.map((admin) => (
                <div
                  key={admin.id}
                  className="glass-card-static p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-white">ID: {admin.telegramId}</p>
                    <p className="text-xs text-white/40">{admin.role}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveAdmin(admin.telegramId)}
                    className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                  >
                    <Trash weight="duotone" className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
