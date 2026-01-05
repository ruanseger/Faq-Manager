import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden transition-colors border border-gray-200 dark:border-slate-800">
        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-white"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar dark:text-gray-200 bg-gray-50 dark:bg-slate-900/50">
          {children}
        </div>
      </div>
    </div>
  );
};
