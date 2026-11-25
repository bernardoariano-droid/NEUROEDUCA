/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Filtro Suspenso Profissional Agrupado por Funcionalidades
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface FunctionalDropdownOption {
  value: string;
  label: string;
  description?: string;
  group: string;
  badge?: string;
  badgeTone?: 'blue' | 'emerald' | 'amber' | 'purple' | 'slate' | 'rose';
}

interface FunctionalDropdownFilterProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: FunctionalDropdownOption[];
  icon?: React.ReactNode;
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  align?: 'left' | 'right';
  className?: string;
}

const BADGE_TONE_CLASSES: Record<NonNullable<FunctionalDropdownOption['badgeTone']>, string> = {
  blue: 'bg-sky-50 text-[#0073b7] border-sky-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200'
};

export const FunctionalDropdownFilter: React.FC<FunctionalDropdownFilterProps> = ({
  label,
  value,
  onChange,
  options,
  icon,
  placeholder = 'Seleccionar opção...',
  searchable = false,
  disabled = false,
  align = 'left',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  useEffect(() => {
    if (isOpen && searchable) {
      setTimeout(() => searchInputRef.current?.focus(), 30);
    } else if (!isOpen) {
      setSearch('');
    }
  }, [isOpen, searchable]);

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );

  const groupedOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? options.filter(
          (o) =>
            o.label.toLowerCase().includes(q) ||
            (o.description && o.description.toLowerCase().includes(q)) ||
            o.group.toLowerCase().includes(q) ||
            (o.badge && o.badge.toLowerCase().includes(q))
        )
      : options;

    const groups = new Map<string, FunctionalDropdownOption[]>();
    filtered.forEach((opt) => {
      const list = groups.get(opt.group) || [];
      list.push(opt);
      groups.set(opt.group, list);
    });
    return Array.from(groups.entries());
  }, [options, search]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 block mb-1">
          {label}
        </span>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full min-h-[42px] flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-left text-xs transition ${
          disabled
            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
            : isOpen
            ? 'bg-white border-[#067836] ring-2 ring-[#16a34a]/20 text-slate-900 shadow-xs cursor-pointer'
            : 'bg-[#f3f7f4]/70 hover:bg-white border-[#cde6d5] text-slate-800 cursor-pointer'
        }`}
        aria-expanded={isOpen}
      >
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {icon && <span className="shrink-0 text-[#067836]">{icon}</span>}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-semibold text-slate-800 truncate">
                {selectedOption?.label || placeholder}
              </span>
              {selectedOption?.badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                    BADGE_TONE_CLASSES[selectedOption.badgeTone || 'slate']
                  }`}
                >
                  {selectedOption.badge}
                </span>
              )}
            </div>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform ${
            isOpen ? 'rotate-180 text-[#067836]' : 'text-slate-400'
          }`}
        />
      </button>

      {isOpen && !disabled && (
        <div
          className={`absolute top-full mt-1.5 w-full min-w-[260px] bg-white rounded-xl border border-slate-200 shadow-2xl z-50 overflow-hidden ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {(searchable || options.length > 6) && (
            <div className="p-2 border-b border-slate-100 bg-slate-50/80 flex items-center space-x-2">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar opção..."
                className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none py-1"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <div className="max-h-72 overflow-y-auto py-1.5">
            {groupedOptions.length === 0 ? (
              <div className="py-6 px-3 text-center text-xs text-slate-400">
                Nenhuma opção encontrada.
              </div>
            ) : (
              groupedOptions.map(([groupName, groupItems]) => (
                <div key={groupName} className="mb-1 last:mb-0">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/70 border-y border-slate-100 first:border-t-0 flex items-center justify-between">
                    <span>{groupName}</span>
                    <span className="font-mono text-[9px] text-slate-400">{groupItems.length}</span>
                  </div>
                  <div className="p-1 space-y-0.5">
                    {groupItems.map((opt) => {
                      const isSelected = opt.value === value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            onChange(opt.value);
                            setIsOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between gap-2 transition cursor-pointer ${
                            isSelected
                              ? 'bg-[#eaf6ee] text-[#067836] border border-[#cde6d5]'
                              : 'hover:bg-[#f3f7f4] text-slate-700 border border-transparent'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`truncate ${
                                  isSelected ? 'font-bold text-[#067836]' : 'font-semibold text-slate-800'
                                }`}
                              >
                                {opt.label}
                              </span>
                              {opt.badge && (
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                                    BADGE_TONE_CLASSES[opt.badgeTone || 'slate']
                                  }`}
                                >
                                  {opt.badge}
                                </span>
                              )}
                            </div>
                            {opt.description && (
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {opt.description}
                              </p>
                            )}
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-[#067836] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
