import { ArrowLeft, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useSharedData } from '../../hooks/useSharedData';
import { listRegions } from '../../services/regionService';
import { onboardStation } from '../../services/stationOnboarding.service';
import { wait } from '../../services/storage';
import type { Station } from '../../types/station';
import { fullName } from '../../types/user';
import { delayVar } from '../../components/public/Reveal';

interface FormState {
  stationName: string;
  address: string;
  region: string;
  rmaId: string;
  bmId: string;
}
type Errors = Partial<Record<keyof FormState, string>>;
const initial: FormState = { stationName: '', address: '', region: '', rmaId: '', bmId: '' };

const control =
  'block h-12 w-full rounded-xl border bg-white px-4 text-base text-pub-ink placeholder:text-pub-ink/40 focus:border-pub-forest focus:outline-none focus:ring-4 focus:ring-pub-lime/40';

function Field({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-pub-forest">
        {label} <span className="text-red-600">*</span>
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function validate(f: FormState, regions: string[]): Errors {
  const e: Errors = {};
  if (!f.stationName.trim()) e.stationName = 'Station name is required.';
  if (!f.address.trim()) e.address = 'Address is required.';
  if (!f.region) e.region = 'Select a region.';
  else if (!regions.includes(f.region)) e.region = 'Select a valid region.';
  if (!f.rmaId) e.rmaId = 'Select the assigned RMA.';
  if (!f.bmId) e.bmId = 'Select the BM.';
  return e;
}

export function StationOnboardingPage() {
  const { users, stations } = useSharedData(); // shared store: refreshes when RMAs/BMs register
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Station | null>(null);

  const rmas = useMemo(() => users.filter((u) => u.role === 'RMA'), [users]);
  const bms = useMemo(() => users.filter((u) => u.role === 'BM').map((u) => ({ id: u.id, name: fullName(u) })), [users]);
  const regions = useMemo(() => listRegions(), [stations]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((p) => ({ ...p, [key]: value }));
  const borderFor = (k: keyof FormState) => (errors[k] ? 'border-red-400' : 'border-pub-ink/20');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validate(form, regions);
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    try {
      await wait(450);
      const { station } = onboardStation(form);
      setCreated(station);
      setForm(initial);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not onboard the station.');
    } finally {
      setBusy(false);
    }
  };

  const assignedRma = created ? rmas.find((u) => u.id === created.rmaId) : undefined;
  const assignedBm = created ? bms.find((b) => b.id === created.bmId) : undefined;

  return (
    <section className="relative isolate overflow-hidden bg-pub-forest">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="pub-grid absolute inset-0" />
        <div className="pub-drift absolute -right-20 top-0 h-96 w-96 rounded-full bg-pub-lime/30 blur-[110px]" />
        <div className="pub-drift absolute -left-24 bottom-0 h-96 w-96 rounded-full bg-pub-yellow/20 blur-[120px]" style={delayVar(5000)} />
      </div>

      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-5 lg:gap-16 lg:px-8">
        <div className="lg:col-span-2">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back
          </Link>
          <h1 className="pub-rise mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Onboard a station</h1>
          <p className="pub-rise mt-4 text-lg leading-relaxed text-white/75" style={delayVar(120)}>
            Register a station so it can be monitored, reported on weekly and overseen by management.
          </p>
          <ul className="pub-rise mt-8 space-y-3 text-white/80" style={delayVar(240)}>
            {[
              'The station is linked to the RMA and BM you choose.',
              'It appears at once in that RMA\u2019s Stations tab, ready for its first weekly report.',
              'Management can see it straight away in the Management portal.',
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-pub-lime" aria-hidden /> {t}
              </li>
            ))}
          </ul>
          <p className="pub-rise mt-8 flex gap-3 rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-white/70" style={delayVar(340)}>
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-pub-yellow" aria-hidden />
            Station code and credit limit come from S4HANA. They stay unavailable until that source supplies them.
          </p>
        </div>

        <div className="lg:col-span-3">
          {created ? (
            <div className="pub-pop rounded-3xl bg-white p-8 text-pub-ink shadow-2xl sm:p-10" role="status">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-pub-lime/30 text-pub-forest">
                <CheckCircle2 className="h-8 w-8" aria-hidden />
              </span>
              <h2 className="mt-5 text-2xl font-extrabold text-pub-forest">Station onboarded successfully</h2>
              <p className="mt-2 text-pub-ink/75">
                {created.stationName} is now on the platform. {assignedRma ? `${fullName(assignedRma)} can` : 'The assigned RMA can'} see it in their Stations tab and submit its first weekly report.
              </p>
              <dl className="mt-6 grid gap-4 rounded-2xl bg-pub-forest/[0.04] p-5 sm:grid-cols-2">
                {[
                  ['Station name', created.stationName],
                  ['Address', created.address ?? ''],
                  ['Region', created.region ?? ''],
                  ['Assigned RMA', assignedRma ? fullName(assignedRma) : created.rmaId],
                  ['BM', assignedBm?.name ?? created.bmId ?? ''],
                  ['Status', 'Onboarded'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-pub-ink/55">{k}</dt>
                    <dd className="mt-0.5 font-semibold text-pub-forest">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-8 flex flex-wrap gap-3">
                <button type="button" onClick={() => setCreated(null)} className="rounded-full bg-pub-forest px-6 py-3 font-bold text-white transition hover:bg-pub-ink">
                  Onboard another station
                </button>
                <Link to="/" className="rounded-full border border-pub-ink/20 px-6 py-3 font-semibold text-pub-forest transition hover:bg-pub-forest/5">
                  Back to home
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="pub-pop space-y-5 rounded-3xl bg-white p-8 shadow-2xl sm:p-10" style={delayVar(150)}>
              <Field label="Station Name" htmlFor="ob-name" error={errors.stationName}>
                <input id="ob-name" className={`${control} ${borderFor('stationName')}`} value={form.stationName} onChange={(e) => set('stationName', e.target.value)} placeholder="e.g. Ikota Station" autoComplete="off" />
              </Field>
              <Field label="Address" htmlFor="ob-address" error={errors.address}>
                <input id="ob-address" className={`${control} ${borderFor('address')}`} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Street address of the station" autoComplete="off" />
              </Field>
              <Field label="Region" htmlFor="ob-region" error={errors.region}>
                <select id="ob-region" className={`${control} ${borderFor('region')}`} value={form.region} onChange={(e) => set('region', e.target.value)}>
                  <option value="">Select region</option>
                  {regions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Assigned RMA" htmlFor="ob-rma" error={errors.rmaId}>
                  <select id="ob-rma" className={`${control} ${borderFor('rmaId')}`} value={form.rmaId} onChange={(e) => set('rmaId', e.target.value)}>
                    <option value="">{rmas.length === 0 ? 'No registered RMAs' : 'Select RMA'}</option>
                    {rmas.map((u) => (
                      <option key={u.id} value={u.id}>{fullName(u)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="BM" htmlFor="ob-bm" error={errors.bmId}>
                  <select id="ob-bm" className={`${control} ${borderFor('bmId')}`} value={form.bmId} onChange={(e) => set('bmId', e.target.value)}>
                    <option value="">{bms.length === 0 ? 'No registered BMs' : 'Select BM'}</option>
                    {bms.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </Field>
              </div>

              {(rmas.length === 0 || bms.length === 0) && (
                <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  {rmas.length === 0 ? 'No RMA is registered yet, so a station cannot be assigned. ' : ''}
                  {bms.length === 0 ? 'No BM is available yet.' : ''}
                </p>
              )}
              {formError && (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-pub-yellow px-7 py-4 text-base font-bold text-pub-forest shadow-lg shadow-pub-yellow/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {busy && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
                {busy ? 'Onboarding...' : 'Onboard station'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
