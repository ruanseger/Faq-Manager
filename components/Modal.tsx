import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, headerAction, children }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-[95vw] h-[90vh] md:h-[85vh] flex flex-col overflow-hidden transition-colors border border-gray-200 dark:border-slate-800">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 shrink-0">
          <div className="flex items-center gap-4 flex-1 overflow-hidden mr-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight truncate">{title}</h2>
            {headerAction && (
              <div className="ml-2 border-l border-gray-200 dark:border-slate-700 pl-4">
                {headerAction}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-white shrink-0"
            title="Fechar (Esc)"
          >
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar dark:text-gray-200 bg-white dark:bg-slate-900/50 p-6 md:p-8">
          {children}
        </div>
      </div>
    </div>
  );
};