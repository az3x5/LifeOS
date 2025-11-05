import React, { useState } from 'react';
import { supabase } from '../services/supabase';

interface AuthProps {
    onAuthSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage(null);

        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        if (!isLogin && password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            if (isLogin) {
                // Login
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) throw error;

                if (data.user) {
                    setMessage('Login successful!');
                    setTimeout(() => onAuthSuccess(), 500);
                }
            } else {
                // Sign up
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                });

                if (error) throw error;

                if (data.user) {
                    setMessage('Account created! Please check your email to confirm your account.');
                    // Note: Depending on your Supabase settings, you may need email confirmation
                    // If email confirmation is disabled, you can call onAuthSuccess() here
                }
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        setError(null);
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                },
            });

            if (error) throw error;
        } catch (err: any) {
            setError(err.message || 'Failed to sign in with Google');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary via-secondary to-tertiary flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Logo/Brand */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-accent mb-2">LifeOS</h1>
                    <p className="text-text-secondary">Your Personal Life Operating System</p>
                </div>

                {/* Auth Card */}
                <div className="bg-secondary rounded-2xl shadow-2xl border border-tertiary p-8">
                    {/* Tab Switcher */}
                    <div className="flex gap-2 mb-6 bg-primary rounded-lg p-1">
                        <button
                            onClick={() => {
                                setIsLogin(true);
                                setError(null);
                                setMessage(null);
                            }}
                            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                                isLogin
                                    ? 'bg-accent text-white'
                                    : 'text-text-secondary hover:text-text-primary'
                            }`}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => {
                                setIsLogin(false);
                                setError(null);
                                setMessage(null);
                            }}
                            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                                !isLogin
                                    ? 'bg-accent text-white'
                                    : 'text-text-secondary hover:text-text-primary'
                            }`}
                        >
                            Sign Up
                        </button>
                    </div>

                    {/* Error/Success Messages */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200 text-sm">
                            {message}
                        </div>
                    )}

                    {/* Email/Password Form */}
                    <form onSubmit={handleEmailAuth} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-primary border border-tertiary rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                                placeholder="your@email.com"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-primary border border-tertiary rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                                placeholder="••••••••"
                                disabled={loading}
                            />
                        </div>

                        {!isLogin && (
                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary mb-2">
                                    Confirm Password
                                </label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-primary border border-tertiary rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                                    placeholder="••••••••"
                                    disabled={loading}
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-accent hover:bg-accent/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Please wait...' : isLogin ? 'Login' : 'Create Account'}
                        </button>
                    </form>

                    {/* Google Sign In - Disabled */}
                    {/* Google OAuth is not configured. To enable:
                        1. Set up OAuth credentials in Google Cloud Console
                        2. Enable Google provider in Supabase
                        3. Uncomment the button below
                    */}

                    {/* Footer */}
                    {isLogin && (
                        <div className="mt-6 text-center">
                            <button
                                onClick={() => {
                                    // TODO: Implement password reset
                                    alert('Password reset functionality coming soon!');
                                }}
                                className="text-sm text-accent hover:text-accent/80 transition-colors"
                            >
                                Forgot your password?
                            </button>
                        </div>
                    )}
                </div>

                {/* Additional Info */}
                <div className="mt-6 text-center text-sm text-text-muted">
                    <p>
                        {isLogin ? "Don't have an account? " : 'Already have an account? '}
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-accent hover:text-accent/80 transition-colors font-medium"
                        >
                            {isLogin ? 'Sign up' : 'Login'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Auth;

