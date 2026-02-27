import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import {
  Home, Search, User, Coins, LayoutDashboard, Shield,
  LogOut, Menu, X, Building2, ChevronDown, Users,
  FileCheck, Receipt, Calendar, Plus, BadgeCheck
} from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { useState } from 'react';

export function Layout({ children }) {
  const { user, logout, isAuthenticated, isAdmin, isAgent } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };
  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
  const getInitials = (name) => { if (!name) return 'U'; return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2); };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Desktop Header ─────────────────────────────── */}
      <header className="hidden md:block sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-border/50 shadow-sm">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight text-foreground">LAUTECH Rentals</span>
            </Link>

            {/* Nav */}
            <nav className="flex items-center gap-1">
              <Link to="/">
                <Button variant={isActive('/') && location.pathname === '/' ? 'default' : 'ghost'} size="sm" className="gap-2 font-medium" data-testid="nav-home">
                  <Home className="w-4 h-4" /> Home
                </Button>
              </Link>
              <Link to="/browse">
                <Button variant={isActive('/browse') ? 'default' : 'ghost'} size="sm" className="gap-2 font-medium" data-testid="nav-browse">
                  <Search className="w-4 h-4" /> Browse
                </Button>
              </Link>

              {isAuthenticated && (
                <>
                  <Link to="/profile">
                    <Button variant={isActive('/profile') ? 'default' : 'ghost'} size="sm" className="gap-2 font-medium" data-testid="nav-profile">
                      <User className="w-4 h-4" /> Profile
                    </Button>
                  </Link>
                  <Link to="/buy-tokens">
                    <Button variant={isActive('/buy-tokens') ? 'default' : 'ghost'} size="sm" className="gap-2 font-medium" data-testid="nav-tokens">
                      <Coins className="w-4 h-4" /> Tokens
                    </Button>
                  </Link>
                </>
              )}

              {isAgent && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant={isActive('/agent') ? 'default' : 'ghost'} size="sm" className="gap-2 font-medium" data-testid="nav-agent">
                      <Building2 className="w-4 h-4" /> Agent <ChevronDown className="w-3 h-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="flex items-center gap-2"><BadgeCheck className="w-4 h-4 text-secondary" />Agent Panel</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/agent')} className="cursor-pointer"><LayoutDashboard className="w-4 h-4 mr-2" />Dashboard</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/agent')} className="cursor-pointer"><Building2 className="w-4 h-4 mr-2" />My Properties</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/agent')} className="cursor-pointer"><Calendar className="w-4 h-4 mr-2" />Inspections</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/agent')} className="cursor-pointer text-primary font-medium"><Plus className="w-4 h-4 mr-2" />Add New Property</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant={isActive('/admin') ? 'default' : 'ghost'} size="sm" className="gap-2 font-medium" data-testid="nav-admin">
                      <Shield className="w-4 h-4" /> Admin <ChevronDown className="w-3 h-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="flex items-center gap-2"><Shield className="w-4 h-4 text-destructive" />Admin Panel</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer"><LayoutDashboard className="w-4 h-4 mr-2" />Overview</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/admin?tab=users')} className="cursor-pointer"><Users className="w-4 h-4 mr-2" />User Management</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/admin?tab=verification')} className="cursor-pointer"><FileCheck className="w-4 h-4 mr-2" />Agent Verification</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/admin?tab=properties')} className="cursor-pointer"><Building2 className="w-4 h-4 mr-2" />Properties</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/admin?tab=transactions')} className="cursor-pointer"><Receipt className="w-4 h-4 mr-2" />Transactions</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* User Avatar Dropdown */}
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 ml-2" data-testid="user-menu">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary text-white text-xs font-bold">
                          {getInitials(user?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden lg:inline font-medium text-sm max-w-[100px] truncate">{user?.full_name}</span>
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <p className="font-semibold text-foreground truncate">{user?.full_name}</p>
                      <p className="text-xs text-foreground/50 font-normal truncate">{user?.email}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {user?.token_balance !== undefined && (
                      <div className="px-2 py-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground/60">Token Balance</span>
                          <span className="font-bold text-primary">{user.token_balance}</span>
                        </div>
                      </div>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer"><User className="w-4 h-4 mr-2" />My Profile</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/buy-tokens')} className="cursor-pointer"><Coins className="w-4 h-4 mr-2" />Buy Tokens</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive font-medium"><LogOut className="w-4 h-4 mr-2" />Logout</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2 ml-2">
                  <Link to="/login"><Button variant="ghost" size="sm" className="font-medium">Login</Button></Link>
                  <Link to="/register"><Button size="sm" className="font-medium shadow-sm">Register</Button></Link>
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* ── Mobile Header ──────────────────────────────── */}
      <header className="md:hidden sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-border/50 shadow-sm">
        <div className="flex items-center justify-between h-14 px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base text-foreground">LAUTECH Rentals</span>
          </Link>
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary text-white text-xs font-bold">{getInitials(user?.full_name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="font-semibold text-foreground truncate">{user?.full_name}</p>
                  <p className="text-xs text-foreground/50 font-normal">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer"><Shield className="w-4 h-4 mr-2" />Admin Dashboard</DropdownMenuItem>}
                {isAgent && <DropdownMenuItem onClick={() => navigate('/agent')} className="cursor-pointer"><Building2 className="w-4 h-4 mr-2" />Agent Dashboard</DropdownMenuItem>}
                <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer"><User className="w-4 h-4 mr-2" />My Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/buy-tokens')} className="cursor-pointer"><Coins className="w-4 h-4 mr-2" />Buy Tokens</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive font-medium"><LogOut className="w-4 h-4 mr-2" />Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login"><Button variant="ghost" size="sm" className="font-medium">Login</Button></Link>
              <Link to="/register"><Button size="sm" className="font-medium">Register</Button></Link>
            </div>
          )}
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────── */}
      <main className="pb-20 md:pb-8">{children}</main>

      {/* ── Mobile Bottom Nav ──────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t border-border/50 shadow-lg">
        <div className="flex items-center justify-around h-16 px-2">
          <Link to="/" className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg transition-all ${isActive('/') && location.pathname === '/' ? 'text-primary' : 'text-foreground/45'}`} data-testid="mobile-nav-home">
            <Home className={`w-5 h-5 ${isActive('/') && location.pathname === '/' ? 'scale-110' : ''} transition-transform`} />
            <span className="text-[10px] font-semibold">Home</span>
          </Link>
          <Link to="/browse" className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg transition-all ${isActive('/browse') ? 'text-primary' : 'text-foreground/45'}`} data-testid="mobile-nav-browse">
            <Search className={`w-5 h-5 ${isActive('/browse') ? 'scale-110' : ''} transition-transform`} />
            <span className="text-[10px] font-semibold">Browse</span>
          </Link>

          {isAuthenticated ? (
            <>
              <Link to="/profile" className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg transition-all ${isActive('/profile') ? 'text-primary' : 'text-foreground/45'}`} data-testid="mobile-nav-profile">
                <User className={`w-5 h-5 ${isActive('/profile') ? 'scale-110' : ''} transition-transform`} />
                <span className="text-[10px] font-semibold">Profile</span>
              </Link>
              {isAgent && (
                <Link to="/agent" className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg transition-all ${isActive('/agent') ? 'text-secondary' : 'text-foreground/45'}`} data-testid="mobile-nav-agent">
                  <Building2 className={`w-5 h-5 ${isActive('/agent') ? 'scale-110' : ''} transition-transform`} />
                  <span className="text-[10px] font-semibold">Agent</span>
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin" className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg transition-all ${isActive('/admin') ? 'text-destructive' : 'text-foreground/45'}`} data-testid="mobile-nav-admin">
                  <Shield className={`w-5 h-5 ${isActive('/admin') ? 'scale-110' : ''} transition-transform`} />
                  <span className="text-[10px] font-semibold">Admin</span>
                </Link>
              )}
              <Link to="/buy-tokens" className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg transition-all ${isActive('/buy-tokens') ? 'text-primary' : 'text-foreground/45'}`} data-testid="mobile-nav-tokens">
                <Coins className={`w-5 h-5 ${isActive('/buy-tokens') ? 'scale-110' : ''} transition-transform`} />
                <span className="text-[10px] font-semibold">Tokens</span>
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg text-foreground/45" data-testid="mobile-nav-login">
                <User className="w-5 h-5" />
                <span className="text-[10px] font-semibold">Login</span>
              </Link>
              <Link to="/register" className="flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg text-primary" data-testid="mobile-nav-register">
                <Plus className="w-5 h-5" />
                <span className="text-[10px] font-semibold">Register</span>
              </Link>
            </>
          )}
        </div>
      </nav>
    </div>
  );
}

export default Layout;
