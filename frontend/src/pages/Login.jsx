import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Building2, Mail, Lock, Eye, EyeOff, Ban, MessageSquare, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const [suspendedEmail, setSuspendedEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    setSuspended(false);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/browse');
    } catch (error) {
      const msg = error.message || '';
      if (msg.toLowerCase().includes('suspended')) {
        setSuspendedEmail(email);
        setSuspended(true);
      } else {
        toast.error(msg || 'Invalid credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) { toast.error('Please enter your email address first'); return; }
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      toast.success('Password reset email sent to ' + email);
    } catch (err) {
      toast.error(err.message || 'Failed to send reset email');
    } finally {
      setForgotLoading(false);
    }
  };

  if (suspended) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
            <Ban className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-red-700 mb-2">Account Suspended</h1>
          <p className="text-muted-foreground text-sm mb-1">
            The account <span className="font-medium text-foreground">{suspendedEmail}</span> has been suspended by the Rentora admin.
          </p>
          <p className="text-muted-foreground text-sm mb-6">
            You cannot log in until the suspension is removed. If you believe this is a mistake, please reach out.
          </p>
          <div className="space-y-3 mb-6">
            <a
              href={"mailto:support@rentora.com.ng?subject=" + encodeURIComponent('Account Suspension Appeal - ' + suspendedEmail) + "&body=" + encodeURIComponent('Hello Rentora Support,\n\nMy account (' + suspendedEmail + ') has been suspended and I would like to appeal.\n\nReason:\n[explain here]\n\nThank you.')}
              className="flex items-center justify-center gap-2.5 w-full px-4 py-3 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Email Support to Appeal
            </a>
            <Link to="/contact" className="flex items-center justify-center gap-2.5 w-full px-4 py-3 rounded-lg border border-border hover:bg-muted/40 transition-colors font-medium text-sm">
              <MessageSquare className="w-4 h-4" />
              Contact Us via Website
            </Link>
          </div>
          <button onClick={() => { setSuspended(false); setPassword(''); }}
            className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto">
            <ArrowLeft className="w-4 h-4" /> Try a different account
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4" data-testid="login-page">
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center justify-center mb-8">
          <img src="/rentora-logo.png" alt="Rentora" className="h-12 w-auto" />
        </div>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Welcome Back</h1>
          <p className="text-muted-foreground mt-2">Sign in to your Rentora account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com" className="pl-10 h-12" data-testid="login-email" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button type="button" onClick={handleForgotPassword} disabled={forgotLoading}
                className="text-xs text-primary hover:underline disabled:opacity-50">
                {forgotLoading ? 'Sending...' : 'Forgot password?'}
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input id="password" type={showPassword ? 'text' : 'password'} value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password" className="pl-10 pr-10 h-12" data-testid="login-password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full h-12 active:scale-[0.98] transition-transform" data-testid="login-submit">
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary font-medium hover:underline">Create account</Link>
        </p>
      </Card>
    </div>
  );
}

export default Login;
