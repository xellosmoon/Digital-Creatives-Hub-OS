import { useState } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isBefore, startOfDay,
  addMonths, subMonths, parseISO,
} from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerPopoverProps {
  /** Selected date as 'yyyy-MM-dd', or '' for none picked yet. */
  value: string;
  onChange: (date: string) => void;
  /** Earliest selectable date, 'yyyy-MM-dd'. Dates before this are disabled. */
  min?: string;
  label?: string;
  placeholder?: string;
}

/** A colorful calendar-grid popup, replacing the browser's own bland
 *  native date input (tiny numbers, inconsistent look across devices).
 *  Self-contained — owns its own open/closed state and month being
 *  viewed, so each instance works independently when more than one is
 *  rendered on the same page (e.g. ProposeEvent's multi-date list). */
export default function DatePickerPopover({ value, onChange, min, label, placeholder = 'Select a date' }: DatePickerPopoverProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const selected = value ? parseISO(value) : null;
  const [viewMonth, setViewMonth] = useState(selected ?? new Date());

  const minDate = min ? startOfDay(parseISO(min)) : null;

  const openPicker = (): void => {
    setViewMonth(selected ?? (minDate ?? new Date()));
    setOpen(true);
  };

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewMonth)),
    end: endOfWeek(endOfMonth(viewMonth)),
  });

  const isDisabled = (day: Date): boolean => !!minDate && isBefore(day, minDate);

  const pick = (day: Date): void => {
    if (isDisabled(day)) return;
    onChange(format(day, 'yyyy-MM-dd'));
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        className="w-full rounded-2xl border-2 border-gray-200/80 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 flex items-center gap-3 hover:border-amber-300 dark:hover:border-amber-500 focus-within:border-amber-500 transition-all duration-300 text-left"
      >
        <div className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm flex-shrink-0">
          <Calendar className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          {label && <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>}
          {selected ? (
            <>
              <p className="text-base font-bold text-gray-900 dark:text-white truncate">{format(selected, 'MMMM d, yyyy')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{format(selected, 'EEEE')}</p>
            </>
          ) : (
            <p className="text-base font-medium text-gray-400 dark:text-slate-500">{placeholder}</p>
          )}
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white px-5 py-4 flex items-center justify-between">
              <button type="button" onClick={() => setViewMonth(m => subMonths(m, 1))} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <p className="font-extrabold text-lg">{format(viewMonth, 'MMMM yyyy')}</p>
              <button type="button" onClick={() => setViewMonth(m => addMonths(m, 1))} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={i} className="text-center text-xs font-bold text-gray-400 dark:text-gray-500 py-1">{d}</div>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, i) => {
                  const inMonth = isSameMonth(day, viewMonth);
                  const isSelected = selected && isSameDay(day, selected);
                  const isToday = isSameDay(day, new Date());
                  const disabled = isDisabled(day);

                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={disabled}
                      onClick={() => pick(day)}
                      className={`
                        aspect-square rounded-xl text-sm font-semibold transition-all duration-150
                        ${!inMonth ? 'text-gray-300 dark:text-slate-700' : ''}
                        ${disabled ? 'text-gray-200 dark:text-slate-700 cursor-not-allowed' : 'cursor-pointer'}
                        ${isSelected
                          ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md scale-105'
                          : !disabled && inMonth
                            ? 'text-gray-700 dark:text-gray-200 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:scale-105'
                            : ''
                        }
                        ${isToday && !isSelected ? 'ring-2 ring-amber-400 ring-inset' : ''}
                      `}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
