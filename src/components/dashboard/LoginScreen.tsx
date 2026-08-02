import React, { useState } from 'react';
import { ShoppingBag, KeyRound, User, Loader2, Sparkles, Building } from 'lucide-react';

interface LoginScreenProps {
  onSuccess: (session: { user: { id: string; username: string; name: string | null }; shops: any[] }) => void;
}

export default function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [shopName, setShopName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Please fill in all credentials fields.');
      return;
    }

    if (isRegistering) {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (!shopName) {
        setError('Please name your initial shop workspace.');
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
      const body = isRegistering 
        ? { username, password, name: name || username, shopName }
        : { username, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      onSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 mb-4">
          <ShoppingBag className="w-6 h-6 animate-pulse" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          {isRegistering ? 'Setup your DukaanDost Workspace' : 'Welcome to DukaanDost AI'}
        </h2>
        <p className="mt-2 text-sm text-zinc-400 max-w">
          {isRegistering 
            ? 'Create an account and initialize your digital retail shop' 
            : 'Autonomous operations ledger & tax compliances for retail'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#121215] py-8 px-4 border border-zinc-800/80 rounded-2xl shadow-2xl sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-950/40 border border-red-500/20 rounded-lg text-xs font-medium text-red-400">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Username / Mobile
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  placeholder="e.g. aman_retail"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 bg-zinc-950 border border-zinc-800 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30 rounded-lg text-sm text-white placeholder-zinc-600 transition-colors"
                />
              </div>
            </div>

            {isRegistering && (
              <div>
                <label htmlFor="name" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Your Full Name (Optional)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="e.g. Aman Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 bg-zinc-950 border border-zinc-800 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30 rounded-lg text-sm text-white placeholder-zinc-600 transition-colors"
                  />
                </div>
              </div>
            )}

            {isRegistering && (
              <div>
                <label htmlFor="shopName" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Dukaan / Shop Name
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <Building className="h-4 w-4" />
                  </div>
                  <input
                    id="shopName"
                    name="shopName"
                    type="text"
                    required
                    placeholder="e.g. Raj General Store"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 bg-zinc-950 border border-zinc-800 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30 rounded-lg text-sm text-white placeholder-zinc-600 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 bg-zinc-950 border border-zinc-800 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30 rounded-lg text-sm text-white placeholder-zinc-600 transition-colors"
                />
              </div>
            </div>

            {isRegistering && (
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 bg-zinc-950 border border-zinc-800 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30 rounded-lg text-sm text-white placeholder-zinc-600 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 focus:ring-emerald-500 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {isRegistering ? 'Generate Shop Workspace' : 'Sign In'}
              </button>
            </div>
          </form>

          <div className="mt-6 flex justify-center text-xs">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              className="text-emerald-400 hover:text-emerald-300 font-medium underline transition-colors cursor-pointer"
            >
              {isRegistering ? 'Already have an account? Sign In' : 'Create new shop account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
