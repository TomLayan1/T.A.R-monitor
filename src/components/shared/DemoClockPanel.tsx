import { Clock, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { isClockSimulated, resetClock, setSimulatedNow } from '../../services/clock.service';
import { resetDemoData } from '../../services/seed.service';
import { runScheduler } from '../../services/submission.service';
import { useSharedData } from '../../hooks/useSharedData';
import { REMINDER_HOURS_WAT, currentWeekEnding, deadlineFor, formatDateTime, fromWatInputValue, reminderSlotTime, toWatInputValue } from '../../utils/date';
import { Button } from '../ui/Button';

/** Demo/test tool: a controllable clock so the Monday deadline and reminders can be tested any day. */
export function DemoClockPanel() {
  const { now } = useSharedData();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const week = currentWeekEnding(now);
  const { pathname } = useLocation();
  // The demo clock belongs to the two portals only, not the public website.
  if (!pathname.startsWith('/rma') && !pathname.startsWith('/management')) return null;

  const jump = (d: Date) => {
    setSimulatedNow(d);
    runScheduler();
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {open && (
        <div className="mb-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-xl">
          <p className="font-semibold text-slate-900">Demo clock (WAT)</p>
          <p className="mt-1 text-slate-600">
            {formatDateTime(now.toISOString())} {isClockSimulated() ? '(simulated)' : '(real time)'}
          </p>
          <p className="mt-1 text-xs text-slate-500">Reporting week ending {week}; deadline {formatDateTime(deadlineFor(week).toISOString())}.</p>
          <div className="mt-3 flex gap-2">
            <input
              type="datetime-local"
              value={value || toWatInputValue(now)}
              onChange={(e) => setValue(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              aria-label="Simulated date and time in WAT"
            />
            <Button size="sm" onClick={() => value && jump(fromWatInputValue(value))}>
              Set
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button size="sm" variant="secondary" onClick={() => jump(reminderSlotTime(week, REMINDER_HOURS_WAT[0]))}>
              Monday 9:00 AM
            </Button>
            <Button size="sm" variant="secondary" onClick={() => jump(new Date(now.getTime() + 2 * 3600 * 1000))}>
              +2 hours
            </Button>
            <Button size="sm" variant="secondary" onClick={() => jump(new Date(deadlineFor(week).getTime() - 30 * 60 * 1000))}>
              Monday 11:29 PM
            </Button>
            <Button size="sm" variant="secondary" onClick={() => jump(new Date(deadlineFor(week).getTime() + 60 * 1000))}>
              Past deadline
            </Button>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => { resetClock(); runScheduler(); }} icon={<RotateCcw className="h-4 w-4" />}>
              Real time
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (window.confirm('Reset all demo data and sign out?')) {
                  resetDemoData();
                  window.location.assign('/');
                }
              }}
            >
              Reset demo data
            </Button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle demo clock"
        className="ml-auto flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-md hover:bg-slate-50"
      >
        <Clock className="h-4 w-4" aria-hidden />
        Demo clock
      </button>
    </div>
  );
}
