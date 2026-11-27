import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Phone, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');

    setSubmitting(true);
    try {
      await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create your account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = 'w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-11 pr-4 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100';

  return (
    <main className="min-h-[75vh] bg-[#f7f7f5] px-5 py-12 sm:py-16">
      <div className="mx-auto max-w-2xl rounded-3xl bg-white p-7 shadow-xl shadow-gray-200/70 sm:p-10 lg:p-12">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">Join Digital Heroes</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">Create your account</h1>
          <p className="mt-2 text-sm text-gray-500">Get started with smarter, simpler print ordering.</p>
        </div>

        {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-gray-700 sm:col-span-2">Full name
            <span className="relative mt-2 block"><UserRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><input required minLength={2} name="name" autoComplete="name" value={form.name} onChange={update} placeholder="Your full name" className={fieldClass} /></span>
          </label>
          <label className="block text-sm font-semibold text-gray-700">Email address
            <span className="relative mt-2 block"><Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><input required type="email" name="email" autoComplete="email" value={form.email} onChange={update} placeholder="you@example.com" className={fieldClass} /></span>
          </label>
          <label className="block text-sm font-semibold text-gray-700">Phone number <span className="font-normal text-gray-400">(optional)</span>
            <span className="relative mt-2 block"><Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><input type="tel" name="phone" autoComplete="tel" value={form.phone} onChange={update} placeholder="Your phone number" className={fieldClass} /></span>
          </label>
          <label className="block text-sm font-semibold text-gray-700">Password
            <span className="relative mt-2 block"><LockKeyhole size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><input required minLength={6} type={showPassword ? 'text' : 'password'} name="password" autoComplete="new-password" value={form.password} onChange={update} placeholder="At least 6 characters" className={fieldClass} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span>
          </label>
          <label className="block text-sm font-semibold text-gray-700">Confirm password
            <span className="relative mt-2 block"><LockKeyhole size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><input required minLength={6} type={showPassword ? 'text' : 'password'} name="confirmPassword" autoComplete="new-password" value={form.confirmPassword} onChange={update} placeholder="Re-enter password" className={fieldClass} /></span>
          </label>
          <button disabled={submitting} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3.5 font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2">
            {submitting ? 'Creating account...' : 'Create account'} {!submitting && <ArrowRight size={18} />}
          </button>
        </form>
        <p className="mt-7 text-center text-sm text-gray-500">Already have an account? <Link to="/login" className="font-bold text-orange-600 hover:text-orange-700">Log in</Link></p>
      </div>
    </main>
  );
}
