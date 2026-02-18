'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { PaperPlaneRight, SpinnerGap, ChatCircle, ArrowLeft } from '@phosphor-icons/react';
import { api } from '@/lib/api';

interface Message {
  id: string;
  sender: 'client' | 'admin' | 'system';
  senderName: string | null;
  text: string;
  isRead: boolean;
  createdAt: string;
}

interface BookingChatProps {
  bookingId: string;
  shortId: string;
  onBack: () => void;
  isAdmin?: boolean;
}

export function BookingChat({ bookingId, shortId, onBack, isAdmin = false }: BookingChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = async () => {
    const result = await api.getMessages(bookingId);
    if (result.ok) {
      setMessages(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [bookingId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || sending) return;

    setSending(true);
    setNewMessage('');

    const result = await api.sendMessage(bookingId, text);
    if (result.ok) {
      await fetchMessages();
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ru', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  // Группировка сообщений по датам
  let lastDate = '';

  return (
    <div className="screen !p-0 flex flex-col">
      {/* Шапка */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10 bg-black/20 backdrop-blur-sm" style={{
        paddingTop: 'calc(var(--tg-safe-area-inset-top, env(safe-area-inset-top, 0px)) + var(--tg-content-safe-area-inset-top, 0px) + 12px)',
      }}>
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
          <ArrowLeft weight="bold" className="w-4 h-4 text-white/60" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-white truncate">Чат по заказу {shortId}</h2>
          <p className="text-xs text-white/40">{messages.length} сообщений</p>
        </div>
        <ChatCircle weight="duotone" className="w-5 h-5 text-accent-green shrink-0" />
      </div>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <SpinnerGap weight="bold" className="w-6 h-6 text-accent-green animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <ChatCircle weight="duotone" className="w-12 h-12 text-white/10 mb-3" />
            <p className="text-white/30 text-sm">Нет сообщений</p>
            <p className="text-white/20 text-xs mt-1">Напишите первое сообщение</p>
          </div>
        ) : (
          messages.map((msg) => {
            const msgDate = formatDate(msg.createdAt);
            const showDate = msgDate !== lastDate;
            lastDate = msgDate;

            const isMine = (isAdmin && msg.sender === 'admin') || (!isAdmin && msg.sender === 'client');

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="text-center my-3">
                    <span className="text-[10px] text-white/30 bg-white/5 px-3 py-1 rounded-full">{msgDate}</span>
                  </div>
                )}
                <motion.div
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                    isMine
                      ? 'bg-accent-green/20 border border-accent-green/30 rounded-br-md'
                      : msg.sender === 'system'
                        ? 'bg-white/5 border border-white/10'
                        : 'bg-white/10 border border-white/15 rounded-bl-md'
                  }`}>
                    {!isMine && msg.senderName && (
                      <p className={`text-[10px] font-medium mb-1 ${
                        msg.sender === 'admin' ? 'text-accent-purple' : 'text-accent-blue'
                      }`}>
                        {msg.senderName}
                      </p>
                    )}
                    <p className="text-sm text-white/90 whitespace-pre-wrap break-words">{msg.text}</p>
                    <p className={`text-[10px] mt-1 ${isMine ? 'text-accent-green/50 text-right' : 'text-white/25'}`}>
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </motion.div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Поле ввода */}
      <div className="px-4 py-3 border-t border-white/10 bg-black/20 backdrop-blur-sm" style={{
        paddingBottom: 'calc(var(--tg-safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + var(--tg-content-safe-area-inset-bottom, 0px) + 12px)',
      }}>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Написать сообщение..."
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="w-11 h-11 rounded-2xl bg-accent-green flex items-center justify-center shrink-0 disabled:opacity-30 transition-opacity active:scale-95"
          >
            {sending ? (
              <SpinnerGap weight="bold" className="w-5 h-5 text-black animate-spin" />
            ) : (
              <PaperPlaneRight weight="fill" className="w-5 h-5 text-black" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
