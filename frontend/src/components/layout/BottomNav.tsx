'use client';

import { useRouter } from 'next/navigation';
import { Home, LayoutGrid, Plus, Bell, User } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useI18nStore, I18nState } from '../../store/i18nStore';
import { motion } from 'framer-motion';

export default function BottomNav() {
  const router = useRouter();
  const { activeTab, setActiveTab, openAddModal } = useUIStore();
  const t = useI18nStore((state: I18nState) => state.t);

  const navItems = [
    { id: 'home', label: t('home'), icon: Home, route: '/dashboard' },
    { id: 'categories', label: t('categories'), icon: LayoutGrid, route: '/categories' },
    { id: 'add', label: '', icon: Plus, isButton: true },
    { id: 'reminders', label: t('reminders'), icon: Bell, route: '/reminders' },
    { id: 'profile', label: t('profile'), icon: User, route: '/profile' }
  ];

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.isButton) {
      openAddModal();
    } else {
      setActiveTab(item.id as any);
      router.push(item.route || '/dashboard');
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800 shadow-[0_-4px_10px_rgba(0,0,0,0.03)] px-2 py-1.5 grid grid-cols-5 items-center justify-items-center z-40 pb-5">
      {navItems.map((item, idx) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        if (item.isButton) {
          return (
            <button
              key={idx}
              onClick={() => handleNavClick(item)}
              className="relative -top-5 bg-primary hover:bg-primary-light text-white w-14 h-14 rounded-full flex-shrink-0 flex justify-center items-center shadow-lg shadow-green-500/20 active:scale-95 transition-all duration-150 border-4 border-white dark:border-zinc-900 z-50 cursor-pointer"
              style={{ borderRadius: '50%', minWidth: '56px', minHeight: '56px' }}
            >
              <Plus className="w-8 h-8" />
            </button>
          );
        }

        return (
          <button
            key={idx}
            onClick={() => handleNavClick(item)}
            className="flex flex-col items-center justify-center py-1 px-3 text-slate-400 dark:text-zinc-500 select-none cursor-pointer"
          >
            <div className="relative">
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute -inset-1.5 bg-primary-bg dark:bg-green-950/40 rounded-xl -z-10"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon 
                className={`w-6 h-6 transition-colors duration-150 ${
                  isActive ? 'text-primary dark:text-green-400' : 'text-slate-400 dark:text-zinc-500'
                }`} 
              />
            </div>
            <span 
              className={`text-[10px] mt-1 font-medium transition-colors duration-150 ${
                isActive ? 'text-primary dark:text-green-400' : 'text-slate-400 dark:text-zinc-500'
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
