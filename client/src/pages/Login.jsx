import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(form);
      const destination = location.state?.from?.pathname;
      navigate(destination || (user.role === 'admin' ? '/admin' : '/dashboard'), { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to log in. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-[75vh] bg-[#f7f7f5] px-5 py-14 sm:py-20">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl shadow-gray-200/70 md:grid-cols-2">
        <section className="hidden flex-col justify-between bg-[#111827] p-10 text-white md:flex lg:p-14">
          <div className="text-xl font-black tracking-tight">DIGITAL<span className="text-orange-500">HEROES.</span></div>
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-orange-400">Your print workspace</p>
            <h1 className="text-4xl font-black leading-tight lg:text-5xl">Good to see you <span className="text-orange-400">again.</span></h1>
            <p className="mt-5 max-w-sm leading-7 text-gray-300">Sign in to manage your designs, approve proofs and keep every order moving.</p>
          </div>
          <p className="text-xs text-gray-400">MAKE IT. PRINT IT. OWN IT.</p>
        </section>

        <section className="p-7 sm:p-10 lg:p-14">
          <div className="mb-9">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">Welcome back</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-gray-900">Log in to your account</h2>
            <p className="mt-2 text-sm text-gray-500">Enter your details to continue.</p>
          </div>

          {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block text-sm font-semibold text-gray-700">Email address
              <span className="relative mt-2 block">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input required type="email" name="email" autoComplete="email" value={form.email} onChange={update} placeholder="you@example.com" className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-11 pr-4 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100" />
              </span>
            </label>
            <label className="block text-sm font-semibold text-gray-700">Password
              <span className="relative mt-2 block">
                <LockKeyhole size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input required type={showPassword ? 'text' : 'password'} name="password" autoComplete="current-password" value={form.password} onChange={update} placeholder="Enter your password" className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-11 pr-12 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </span>
            </label>
            <button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3.5 font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? 'Signing in...' : 'Sign in'} {!submitting && <ArrowRight size={18} />}
            </button>
          </form>
          <p className="mt-7 text-center text-sm text-gray-500">New to Digital Heroes? <Link to="/register" className="font-bold text-orange-600 hover:text-orange-700">Create an account</Link></p>
        </section>
      </div>
    </main>
  );
}
