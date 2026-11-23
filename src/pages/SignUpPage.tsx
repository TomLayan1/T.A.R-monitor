import { UserPlus } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/layout/AuthShell';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { useSharedData } from '../hooks/useSharedData';
import { SIGN_IN_PATH } from '../routes/paths';
import { listRegions } from '../services/regionService';
import { registerUser } from '../services/userService';
import { STAKEHOLDER_DEPARTMENTS, fullName, type AccountType, type Role } from '../types/user';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormState {
  firstName: string;
  surname: string;
  email: string;
  accountType: AccountType | '';
  department: Exclude<Role, 'RMA'> | '';
  bmId: string;
  region: string;
  stationIds: string[];
  password: string;
  confirmPassword: string;
}
type Errors = Partial<Record<keyof FormState, string>>;

const initial: FormState = {
  firstName: '', surname: '', email: '', accountType: '', department: '', bmId: '', region: '', stationIds: [], password: '', confirmPassword: '',
};

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!f.firstName.trim()) e.firstName = 'First name is required.';
  if (!f.surname.trim()) e.surname = 'Surname is required.';
  if (!f.email.trim()) e.email = 'Email is required.';
  else if (!EMAIL_RE.test(f.email.trim())) e.email = 'Enter a valid email address.';
  if (!f.accountType) e.accountType = 'Select an account type.';
  if (f.accountType === 'RMA') {
    if (!f.bmId) e.bmId = 'Select your Branch Manager.';
    if (!f.region) e.region = 'Select your region.';
  }
  if (f.accountType === 'Stakeholder' && !f.department) e.department = 'Select your department.';
  if (!f.password) e.password = 'Password is required.';
  else if (f.password.length < 8) e.password = 'Password must be at least 8 characters.';
  else if (!/[a-z]/.test(f.password) || !/[A-Z]/.test(f.password) || !/\d/.test(f.password))
    e.password = 'Password must include an uppercase letter, a lowercase letter and a number.';
  if (!f.confirmPassword) e.confirmPassword = 'Confirm your password.';
  else if (f.confirmPassword !== f.password) e.confirmPassword = 'Passwords do not match.';
  return e;
}

/** The single sign-up for every account type (RMA or Stakeholder). */
export function SignUpPage() {
  const navigate = useNavigate();
  const { users, stations } = useSharedData(); // shared store: BMs and stations are never hardcoded
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const bms = useMemo(() => users.filter((u) => u.role === 'BM'), [users]);
  const regions = useMemo(() => listRegions(), [stations]); // eslint-disable-line react-hooks/exhaustive-deps
  const regionStations = useMemo(() => (form.region ? stations.filter((s) => s.region === form.region) : []), [stations, form.region]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((p) => ({ ...p, [key]: value }));
  const toggleStation = (id: string) =>
    setForm((p) => ({ ...p, stationIds: p.stationIds.includes(id) ? p.stationIds.filter((x) => x !== id) : [...p.stationIds, id] }));
  const ownerName = (rmaId: string | null) => {
    const u = users.find((x) => x.id === rmaId);
    return u ? fullName(u) : 'another RMA';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length > 0 || form.accountType === '') return;

    setLoading(true);
    try {
      const user = await registerUser({
        firstName: form.firstName,
        surname: form.surname,
        email: form.email,
        accountType: form.accountType,
        department: form.accountType === 'Stakeholder' && form.department !== '' ? form.department : null,
        bmId: form.accountType === 'RMA' ? form.bmId : null,
        region: form.accountType === 'RMA' ? form.region : null,
        stationIds: form.accountType === 'RMA' ? form.stationIds : [],
        password: form.password,
      });
      navigate(SIGN_IN_PATH, { replace: true, state: { registeredEmail: user.email } });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create the account.');
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Create an account" subtitle="One sign-up for RMAs and stakeholders.">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="First Name" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} error={errors.firstName} required autoComplete="given-name" />
          <Input label="Surname" value={form.surname} onChange={(e) => set('surname', e.target.value)} error={errors.surname} required autoComplete="family-name" />
        </div>
        <Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} error={errors.email} required autoComplete="email" />

        <Select
          label="Account Type"
          value={form.accountType}
          onChange={(e) => setForm((p) => ({ ...p, accountType: e.target.value as AccountType | '', department: '', bmId: '', region: '', stationIds: [] }))}
          error={errors.accountType}
          required
        >
          <option value="">Select account type</option>
          <option value="RMA">RMA</option>
          <option value="Stakeholder">Stakeholder</option>
        </Select>

        {form.accountType === 'RMA' && (
          <div className="space-y-4 rounded-xl border border-brand/20 bg-brand-light/50 p-4">
            <Select label="Branch Manager (BM)" value={form.bmId} onChange={(e) => set('bmId', e.target.value)} error={errors.bmId} required>
              <option value="">{bms.length === 0 ? 'No registered BMs yet' : 'Select your BM'}</option>
              {bms.map((b) => (
                <option key={b.id} value={b.id}>{fullName(b)}</option>
              ))}
            </Select>
            <Select
              label="Region"
              value={form.region}
              onChange={(e) => setForm((p) => ({ ...p, region: e.target.value, stationIds: [] }))}
              error={errors.region}
              required
            >
              <option value="">Select your region</option>
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>

            <fieldset disabled={!form.region}>
              <legend className="mb-1.5 text-sm font-medium text-slate-700">Station(s)</legend>
              {!form.region ? (
                <p className="text-sm text-slate-500">Select a region first to see its stations.</p>
              ) : regionStations.length === 0 ? (
                <p className="text-sm text-slate-500">There are no stations in this region yet.</p>
              ) : (
                <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
                  {regionStations.map((s) => {
                    const taken = s.rmaId !== null;
                    return (
                      <li key={s.id}>
                        <label className={`flex items-center gap-3 rounded-md px-2 py-1.5 text-sm ${taken ? 'text-slate-400' : 'cursor-pointer hover:bg-slate-50'}`}>
                          <input
                            type="checkbox"
                            disabled={taken}
                            checked={form.stationIds.includes(s.id)}
                            onChange={() => toggleStation(s.id)}
                            className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {s.stationName} <span className="text-slate-400">({s.stationCode ?? 'code pending'})</span>
                          </span>
                          {taken && <span className="shrink-0 text-xs">Assigned to {ownerName(s.rmaId)}</span>}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="mt-1 text-xs text-slate-500">Only stations not yet assigned to an RMA can be taken on here. Select as many as apply.</p>
            </fieldset>
          </div>
        )}

        {form.accountType === 'Stakeholder' && (
          <Select label="Department" value={form.department} onChange={(e) => set('department', e.target.value as FormState['department'])} error={errors.department} required>
            <option value="">Select department</option>
            {STAKEHOLDER_DEPARTMENTS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </Select>
        )}

        <Input
          label="Password"
          type="password"
          value={form.password}
          onChange={(e) => set('password', e.target.value)}
          error={errors.password}
          hint="At least 8 characters with upper-case, lower-case and a number."
          required
          autoComplete="new-password"
        />
        <Input label="Confirm Password" type="password" value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} error={errors.confirmPassword} required autoComplete="new-password" />

        {formError && (
          <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {formError}
          </p>
        )}
        <Button type="submit" loading={loading} className="w-full" icon={<UserPlus className="h-4 w-4" />}>
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already registered?{' '}
        <Link to={SIGN_IN_PATH} className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
