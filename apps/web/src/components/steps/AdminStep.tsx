'use client';

import { useState, useEffect } from 'react';
import { useBookingStore } from '@/lib/booking-store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CaretLeft, ChartBar, ClipboardText, Clock, Check, X, Phone,
  SpinnerGap, User, MapPin, Package, Warning, Export, Trash, UserPlus, Users, Buildings
} from '@phosphor-icons/react';
import { api } from '@/lib/api';
import { useHaptic } from '@/lib/haptic';
import { ImageLightbox } from '@/components/ImageLightbox';
import { toast } from 'sonner';

interface AdminBooking {
  id: string;
  status: string;
  scheduledDate: string | null;
  createdAt: string;
  kitNumber: number | null;
  timeSlot: string | null;
  service: string | null;
  source?: string;
  paymentProofUrl?: string | null;
  proCleaningDetails?: string | null;
  proCleaningPhotoUrls?: string[];
  city?: string | null;
  district?: string | null;
  user: { telegramId: string; firstName: string } | null;
  address: { addressLine: string; contactName: string; contactPhone: string } | null;
}

const SOURCE_LABELS: Record<string, string> = {
  telegram_bot: '🤖 Telegram бот',
  telegram_miniapp: '📱 Mini App TG',
  max_bot: '💬 MAX бот',
};

interface AdminStats {
  totalBookings: number;
  newBookings: number;
  awaitingPrepaymentBookings: number;
  prepaidBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  totalUsers: number;
  telegramUsers: number;
  maxUsers: number;
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  awaiting_prepayment: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  prepaid: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  confirmed: 'bg-accent-green/20 text-accent-green border-accent-green/30',
  in_progress: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  completed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'Новый',
  awaiting_prepayment: 'Ожидает оплаты',
  prepaid: 'Предоплачен',
  confirmed: 'Подтверждён',
  in_progress: 'В работе',
  completed: 'Завершён',
  cancelled: 'Отменён',
};

type Tab = 'stats' | 'orders' | 'admins' | 'cities';
type StatusFilter = 'all' | 'new' | 'awaiting_prepayment' | 'prepaid' | 'confirmed';

interface Admin {
  id: string;
  telegramId: string;
  role: string;
  name: string | null;
  isActive: boolean;
  notifyTelegram: boolean;
  notifyMax: boolean;
  maxId: string | null;
  isEnvAdmin: boolean;
}

interface CitySettings {
  id: string;
  city: string;
  isActive: boolean;
  deliveryPriceRub: number;
  minOrderRub: number | null;
}

const CITY_LABELS: Record<string, string> = {
  ROSTOV_NA_DONU: 'Ростов-на-Дону',
  BATAYSK: 'Батайск',
  STAVROPOL: 'Ставрополь',
};

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
  const [cities, setCities] = useState<CitySettings[]>([]);
  const [editingCity, setEditingCity] = useState<CitySettings | null>(null);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'booking' | 'admin'; id: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (tab === 'orders') {
      loadBookings();
    } else if (tab === 'admins' && role === 'super_admin') {
      loadAdmins();
    } else if (tab === 'cities' && role === 'super_admin') {
      loadCities();
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

  const loadCities = async () => {
    try {
      const res = await api.getCities();
      if (res.ok) setCities(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateCity = async (city: string, data: Partial<CitySettings>) => {
    setActionLoading(true);
    const res = await api.updateCity(city, data);
    setActionLoading(false);
    if (res.ok) {
      haptic.success();
      loadCities();
      setEditingCity(null);
    } else {
      haptic.error();
      toast.error(res.error);
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
      toast.error(res.error);
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
      toast.error(res.error);
    }
  };

  const handleDelete = async (bookingId: string) => {
    haptic.heavy();
    setActionLoading(true);
    const res = await api.deleteBooking(bookingId);
    setActionLoading(false);
    setConfirmDelete(null);
    if (res.ok) {
      haptic.success();
      setSelectedBooking(null);
      loadBookings();
      loadData();
    } else {
      haptic.error();
      toast.error(res.error);
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
      toast.error(res.error);
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
      toast.error(res.error);
    }
  };

  const handleRemoveAdmin = async (telegramId: string) => {
    haptic.heavy();
    const res = await api.removeAdmin(telegramId);
    setConfirmDelete(null);
    if (res.ok) {
      haptic.success();
      loadAdmins();
    } else {
      haptic.error();
      toast.error(res.error);
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
          className={`relative flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
            tab === 'orders' 
              ? 'bg-accent-green text-black' 
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          <ClipboardText weight="duotone" className="w-4 h-4" />
          Заказы
          {stats && (stats.newBookings + stats.awaitingPrepaymentBookings + stats.prepaidBookings) > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full min-w-[18px] text-center">
              {stats.newBookings + stats.awaitingPrepaymentBookings + stats.prepaidBookings}
            </span>
          )}
        </button>
        {role === 'super_admin' && (
          <>
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
          <button
            onClick={() => { haptic.light(); setTab('cities'); }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
              tab === 'cities' 
                ? 'bg-accent-green text-black' 
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            <Buildings weight="duotone" className="w-4 h-4" />
            Города
          </button>
          </>
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
                <div className="w-2 h-2 rounded-full bg-orange-400" />
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

          {/* Users Stats */}
          <div className="glass-card-static p-4">
            <p className="text-xs text-white/40 mb-1">Всего пользователей</p>
            <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card-static p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <p className="text-xs text-white/40">Telegram</p>
              </div>
              <p className="text-2xl font-bold text-white">{stats.telegramUsers}</p>
            </div>
            <div className="glass-card-static p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-purple-400" />
                <p className="text-xs text-white/40">MAX</p>
              </div>
              <p className="text-2xl font-bold text-white">{stats.maxUsers}</p>
            </div>
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
              { key: 'new', label: 'Новые' },
              { key: 'awaiting_prepayment', label: 'Ожидают' },
              { key: 'prepaid', label: 'Оплачено' },
              { key: 'confirmed', label: 'Подтв.' },
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
                        <p className="text-sm text-white">
                          {selectedBooking.city && (
                            <span className="text-white/60">
                              {selectedBooking.city === 'ROSTOV_NA_DONU' ? 'Ростов-на-Дону' : 
                               selectedBooking.city === 'BATAYSK' ? 'Батайск' : 
                               selectedBooking.city === 'STAVROPOL' ? 'Ставрополь' : selectedBooking.city}
                              {selectedBooking.district && ` (${selectedBooking.district})`}
                              {' — '}
                            </span>
                          )}
                          {selectedBooking.address.addressLine}
                        </p>
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
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 bg-accent-green/20 rounded-lg text-accent-green text-sm"
                      >
                        <Phone weight="duotone" className="w-4 h-4" />
                        {selectedBooking.address.contactPhone}
                      </a>
                    </div>
                  </>
                )}

                {selectedBooking.source && (
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <span className="text-sm">📲</span>
                    </div>
                    <div>
                      <p className="text-xs text-white/40">Источник</p>
                      <p className="text-sm text-white">{SOURCE_LABELS[selectedBooking.source] || selectedBooking.source}</p>
                    </div>
                  </div>
                )}

                {/* Pro cleaning details */}
                {selectedBooking.proCleaningDetails && (
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-xs text-white/40 mb-1">📝 Описание</p>
                    <p className="text-sm text-white">{selectedBooking.proCleaningDetails}</p>
                  </div>
                )}

                {/* Pro cleaning photos */}
                {selectedBooking.proCleaningPhotoUrls && selectedBooking.proCleaningPhotoUrls.length > 0 && (
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-xs text-white/40 mb-2">📸 Фото от клиента ({selectedBooking.proCleaningPhotoUrls.length} шт.)</p>
                    <div className="flex gap-2 overflow-x-auto">
                      {selectedBooking.proCleaningPhotoUrls.map((url, i) => (
                        <img 
                          key={i}
                          src={`${process.env.NEXT_PUBLIC_API_URL || ''}${url}`}
                          alt={`Фото ${i + 1}`}
                          className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                          onClick={() => {
                            const allImages = [
                              ...(selectedBooking.proCleaningPhotoUrls || []).map(u => `${process.env.NEXT_PUBLIC_API_URL || ''}${u}`),
                              ...(selectedBooking.paymentProofUrl ? [selectedBooking.paymentProofUrl] : []),
                            ];
                            setLightboxImages(allImages);
                            setLightboxIndex(i);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {selectedBooking.paymentProofUrl && (
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-xs text-white/40 mb-2">💳 Фото чека</p>
                    <img 
                      src={selectedBooking.paymentProofUrl} 
                      alt="Чек оплаты" 
                      className="w-full max-h-48 object-contain rounded-lg bg-black/20 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => {
                        const allImages = [
                          ...(selectedBooking.proCleaningPhotoUrls || []).map(u => `${process.env.NEXT_PUBLIC_API_URL || ''}${u}`),
                          ...(selectedBooking.paymentProofUrl ? [selectedBooking.paymentProofUrl] : []),
                        ];
                        const paymentIndex = (selectedBooking.proCleaningPhotoUrls || []).length;
                        setLightboxImages(allImages);
                        setLightboxIndex(paymentIndex);
                      }}
                    />
                  </div>
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
                {['new', 'awaiting_prepayment', 'prepaid'].includes(selectedBooking.status) && (
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
                    onClick={() => setConfirmDelete({ type: 'booking', id: selectedBooking.id })}
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
                  className="glass-card-static p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {admin.name || 'Без имени'}
                      </p>
                      <p className="text-xs text-white/40">
                        {admin.role === 'super_admin' ? '👑 Супер-админ' : '👤 Админ'}
                        {admin.isEnvAdmin && ' (env)'}
                      </p>
                      <p className="text-xs text-blue-400/60">TG: {admin.telegramId}</p>
                      {admin.maxId && (
                        <p className="text-xs text-purple-400/60">MAX: {admin.maxId}</p>
                      )}
                    </div>
                    {!admin.isEnvAdmin && (
                      <button
                        onClick={() => setConfirmDelete({ type: 'admin', id: admin.telegramId })}
                        className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                      >
                        <Trash weight="duotone" className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {/* Notification toggles */}
                  <div className="flex gap-3 pt-3 border-t border-white/10">
                    <button
                      onClick={async () => {
                        const result = await api.updateAdminNotifications(admin.telegramId, { notifyTelegram: !admin.notifyTelegram });
                        if (result.ok) {
                          setAdmins(admins.map(a => a.telegramId === admin.telegramId ? { ...a, notifyTelegram: !admin.notifyTelegram } : a));
                          toast.success('Настройки обновлены');
                        }
                      }}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                        admin.notifyTelegram
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-white/5 text-white/40 border border-white/10'
                      }`}
                    >
                      📱 Telegram {admin.notifyTelegram ? '✓' : '✗'}
                    </button>
                    <button
                      onClick={async () => {
                        const result = await api.updateAdminNotifications(admin.telegramId, { notifyMax: !admin.notifyMax });
                        if (result.ok) {
                          setAdmins(admins.map(a => a.telegramId === admin.telegramId ? { ...a, notifyMax: !admin.notifyMax } : a));
                          toast.success('Настройки обновлены');
                        }
                      }}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                        admin.notifyMax
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : 'bg-white/5 text-white/40 border border-white/10'
                      }`}
                    >
                      💬 MAX {admin.notifyMax ? '✓' : '✗'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* Cities Tab */}
      {tab === 'cities' && role === 'super_admin' && (
        <motion.div 
          className="flex-1 flex flex-col overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm text-white/60 mb-4">Управление городами и ценами доставки</p>
          
          <div className="flex-1 overflow-y-auto space-y-3">
            {cities.length === 0 ? (
              <div className="text-center text-white/40 py-8">
                Загрузка городов...
              </div>
            ) : (
              cities.map((city) => (
                <div
                  key={city.id}
                  className="glass-card-static p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {CITY_LABELS[city.city] || city.city}
                      </p>
                      <p className="text-xs text-white/40">
                        Доставка: {city.deliveryPriceRub} ₽
                      </p>
                    </div>
                    <button
                      onClick={() => handleUpdateCity(city.city, { isActive: !city.isActive })}
                      disabled={actionLoading}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        city.isActive
                          ? 'bg-accent-green/20 text-accent-green'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {city.isActive ? 'Активен' : 'Выключен'}
                    </button>
                  </div>
                  
                  {editingCity?.city === city.city ? (
                    <div className="space-y-2 pt-3 border-t border-white/10">
                      <div>
                        <label className="text-xs text-white/40 block mb-1">Цена доставки (₽)</label>
                        <input
                          type="number"
                          value={editingCity.deliveryPriceRub}
                          onChange={(e) => setEditingCity({ ...editingCity, deliveryPriceRub: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-green/50"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateCity(city.city, { deliveryPriceRub: editingCity.deliveryPriceRub })}
                          disabled={actionLoading}
                          className="flex-1 py-2 bg-accent-green text-black rounded-lg text-sm font-medium"
                        >
                          Сохранить
                        </button>
                        <button
                          onClick={() => setEditingCity(null)}
                          className="flex-1 py-2 bg-white/5 text-white/60 rounded-lg text-sm"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingCity(city)}
                      className="w-full py-2 mt-2 bg-white/5 text-white/60 rounded-lg text-sm hover:bg-white/10 transition-colors"
                    >
                      Изменить цену
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      <ImageLightbox 
        images={lightboxImages}
        initialIndex={lightboxIndex}
        onClose={() => setLightboxImages([])} 
      />

      {/* Confirm Delete Dialog */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <Trash weight="duotone" className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {confirmDelete.type === 'booking' ? 'Удалить заказ?' : 'Удалить админа?'}
                </h3>
                <p className="text-sm text-white/50">
                  Это действие нельзя отменить
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-3 px-4 bg-white/5 text-white/60 font-medium rounded-xl"
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    if (confirmDelete.type === 'booking') {
                      handleDelete(confirmDelete.id);
                    } else {
                      handleRemoveAdmin(confirmDelete.id);
                    }
                  }}
                  disabled={actionLoading}
                  className="flex-1 py-3 px-4 bg-red-500 text-white font-medium rounded-xl disabled:opacity-50"
                >
                  {actionLoading ? <SpinnerGap className="w-5 h-5 animate-spin mx-auto" /> : 'Удалить'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
