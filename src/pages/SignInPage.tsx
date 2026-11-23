import { LogIn } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/layout/AuthShell';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { SIGN_UP_PATH, homePath } from '../routes/paths';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const demoAccounts = [
  { label: 'RMA', email: 'rma@demo.com' },
  { label: 'Branch Manager', email: 'olumide.adeyemi@demo.com' },
  { label: 'Head of Retail', email: 'headofretail@demo.com' },
  { label: 'Risk', email: 'risk@demo.com' },
  { label: 'Management', email: 'management@demo.com' },
];

/** The single sign-in for every account type. After sign-in the user lands on the dashboard for their stored role. */
export function SignInPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const registeredEmail = (location.state as { registeredEmail?: string } | null)?.registeredEmail;

  const [email, setEmail] = useState(registeredEmail ?? '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = 'Email is required.';
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Password is required.';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      const session = await login(email, password);
      navigate(homePath(session.role), { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not sign in.');
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Sign in" subtitle="Use your account to continue.">
      {registeredEmail && (
        <p className="mb-4 rounded-lg border border-brand/30 bg-brand-light p-3 text-sm text-brand-dark">Account created. Sign in to continue.</p>
      )}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required />
        <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} required />
        {formError && (
          <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {formError}
          </p>
        )}
        <Button type="submit" loading={loading} className="w-full" icon={<LogIn className="h-4 w-4" />}>
          Sign in
        </Button>
      </form>

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
        <p className="font-medium text-slate-800">Demo accounts (password Demo@1234)</p>
        <ul className="mt-3 space-y-2">
          {demoAccounts.map((a) => (
            <li key={a.email} className="flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block font-medium text-slate-800">{a.label}</span>
                <span className="block truncate text-slate-500">{a.email}</span>
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEmail(a.email);
                  setPassword('Demo@1234');
                  setErrors({});
                }}
              >
                Use
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 text-center text-sm text-slate-600">
        New here?{' '}
        <Link to={SIGN_UP_PATH} className="font-semibold text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
