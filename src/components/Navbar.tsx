import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  LogOut, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  Car, 
  DollarSign, 
  CreditCard,
  Clock,
  Wrench,
  ShieldCheck,
  Sun,
  Moon,
  Menu,
  X,
  User,
  Building2
} from 'lucide-react';
import { UserProfile } from '../types/auth';

export type NavigationTab = 
  | 'fleet' 
  | 'bookings' 
  | 'earnings' 
  | 'payouts' 
  | 'audit' 
  | 'maintenance' 
  | 'user_access';

interface NavbarProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  currentUser: UserProfile;
  allUsers: UserProfile[];
  onOpenNewBooking: () => void;
  onOpenNewVehicle: () => void;
  onLogout: () => void;
  onToggleNormalUserMode: () => void;
  auditCount: number;
  onDeleteUser?: (userId: string) => Promise<void>;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  children?: React.ReactNode;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  allUsers,
  onOpenNewBooking,
  onOpenNewVehicle,
  onLogout,
  onToggleNormalUserMode,
  auditCount,
  theme,
  onToggleTheme,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  children,
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState<boolean>(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    try {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } catch {
      // Safe fallback
    }
  }, []);

  const animClass = mounted && !prefersReducedMotion ? 'transition-all duration-300 ease-in-out' : 'transition-none';

  const isAdmin = currentUser.role === 'admin';
  const isOwner = currentUser.role === 'vehicle_owner';
  const isCustomerOnly = currentUser.role === 'renter';
  const isNormalUserMode = isCustomerOnly || currentUser.activeViewMode === 'renter';

  // Requirement 4: Close profile dropdown on Outside Click or Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  // Handle Collapsing Sidebar with localStorage
  const toggleSidebar = () => {
    const nextState = !isSidebarCollapsed;
    setIsSidebarCollapsed(nextState);
    try {
      localStorage.setItem('vahaanflow_sidebar_collapsed', String(nextState));
    } catch (e) {
      console.warn('localStorage error:', e);
    }
  };

  // Navigation Items configuration based on role
  const navItems = [
    {
      id: 'fleet' as NavigationTab,
      label: isOwner ? 'My Cars' : (isNormalUserMode ? 'Rent a Car' : 'All Cars'),
      icon: Car,
      show: true,
    },
    {
      id: 'bookings' as NavigationTab,
      label: isOwner ? 'Car Bookings' : (isNormalUserMode ? 'My Trips' : 'All Bookings'),
      icon: Clock,
      show: true,
    },
    {
      id: 'earnings' as NavigationTab,
      label: 'Earnings & Payouts',
      icon: DollarSign,
      show: isOwner && !isNormalUserMode,
    },
    {
      id: 'payouts' as NavigationTab,
      label: 'Owner Payouts & Complaints',
      icon: CreditCard,
      show: isAdmin && !isNormalUserMode,
    },
    {
      id: 'audit' as NavigationTab,
      label: 'Activity History',
      icon: Clock,
      badge: auditCount,
      show: isAdmin && !isNormalUserMode,
    },
    {
      id: 'maintenance' as NavigationTab,
      label: 'Car Servicing & Fitness',
      icon: Wrench,
      show: isAdmin && !isNormalUserMode,
    },
    {
      id: 'user_access' as NavigationTab,
      label: 'User Access Control',
      icon: ShieldCheck,
      show: isAdmin && !isNormalUserMode,
    },
  ].filter(item => item.show);

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* TOP HEADER BAR */}
      {/* ------------------------------------------------------------- */}
      <header className={`fixed top-0 left-0 right-0 z-30 h-16 border-b backdrop-blur-md transition-colors duration-300 ${
        theme === 'dark' 
          ? 'border-neutral-800 bg-neutral-950/90 text-neutral-100' 
          : 'border-slate-200 bg-white/90 text-slate-900 shadow-sm'
      }`}>
        <div className="h-full px-4 sm:px-6 flex items-center justify-between">
          
          {/* Brand Logo & Mobile Toggle */}
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-xl border cursor-pointer ${
                theme === 'dark' ? 'border-neutral-800 bg-neutral-900 text-neutral-200' : 'border-slate-200 bg-slate-100 text-slate-700'
              }`}
              aria-label="Toggle navigation drawer"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Brand Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-extrabold text-lg shrink-0">
                G
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-base font-extrabold tracking-tight block leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    GoDrive
                  </span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                    isAdmin ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' :
                    isOwner ? 'text-teal-500 bg-teal-500/10 border-teal-500/20' :
                    'text-blue-500 bg-blue-500/10 border-blue-500/20'
                  }`}>
                    {isAdmin ? 'ADMIN' : (isOwner ? 'CAR OWNER' : 'CUSTOMER')}
                  </span>
                </div>
                <span className={`text-[10px] font-mono hidden sm:block ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>
                  {isCustomerOnly ? 'Customer Portal' : (isNormalUserMode ? 'Renting as Customer' : (isAdmin ? 'Admin Dashboard' : 'Fleet Owner Portal'))}
                </span>
              </div>
            </div>
          </div>

          {/* Top Right Action Controls */}
          <div className="flex items-center gap-2.5">
            
            {/* Rent a Car / Admin Switcher CTA */}
            {(!isCustomerOnly && (isAdmin || isOwner)) && (
              <button
                type="button"
                onClick={onToggleNormalUserMode}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                  isNormalUserMode
                    ? (theme === 'dark' ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' : 'border-amber-300 bg-amber-50 text-amber-800')
                    : (theme === 'dark' ? 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800' : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200')
                }`}
              >
                <span>{isNormalUserMode ? '⚡ Return to Portal' : '🚗 Browse as Customer'}</span>
              </button>
            )}

            {/* Action CTA: Add Car / Booking */}
            {(!isNormalUserMode && (isOwner || isAdmin)) ? (
              <button
                onClick={onOpenNewVehicle}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-500 text-neutral-950 hover:bg-emerald-400 transition-colors shadow-sm shadow-emerald-500/20 whitespace-nowrap cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">Add Car</span>
              </button>
            ) : (
              isNormalUserMode && (
                <button
                  onClick={onOpenNewBooking}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-500 text-neutral-950 hover:bg-emerald-400 transition-colors shadow-sm shadow-emerald-500/20 whitespace-nowrap cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span className="hidden sm:inline">New Booking</span>
                </button>
              )
            )}

            {/* Requirement 5: Theme Toggle ICON ONLY */}
            <button
              type="button"
              onClick={onToggleTheme}
              className={`h-9 w-9 rounded-xl border flex items-center justify-center transition-all shrink-0 shadow-sm cursor-pointer ${
                theme === 'dark'
                  ? 'bg-neutral-900 border-neutral-800 text-amber-400 hover:bg-neutral-800 hover:border-neutral-700'
                  : 'bg-slate-100 border-slate-300 text-indigo-600 hover:bg-slate-200 hover:border-slate-400'
              }`}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 stroke-[2.5]" />
              ) : (
                <Moon className="h-4 w-4 stroke-[2.5]" />
              )}
            </button>

            {/* User Profile Menu Button */}
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={`flex items-center gap-2 pl-2 pr-2.5 py-1 text-xs rounded-xl border transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'border-neutral-800 bg-neutral-900/90 hover:border-neutral-700'
                    : 'border-slate-200 bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="h-6 w-6 rounded-lg bg-emerald-500/20 text-emerald-500 font-bold flex items-center justify-center text-[10px] border border-emerald-500/30">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left leading-tight">
                  <span className={`text-xs font-semibold block max-w-[110px] truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {currentUser.name}
                  </span>
                  <span className={`text-[10px] block font-mono ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>
                    {isAdmin ? 'Admin' : (isOwner ? 'Car Owner' : 'Customer')}
                  </span>
                </div>
                
                {/* Requirement 4: Animated Chevron rotates 180 degrees when dropdown is open */}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  userMenuOpen ? 'rotate-180' : ''
                } ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`} />
              </button>

              {/* Profile Dropdown */}
              {userMenuOpen && (
                <div className={`absolute right-0 mt-2 w-72 rounded-2xl border p-2 shadow-2xl z-50 space-y-2 transition-all ${
                  theme === 'dark'
                    ? 'border-neutral-800 bg-neutral-900 text-neutral-100'
                    : 'border-slate-200 bg-white text-slate-900'
                }`}>
                  <div className={`p-3 border-b ${theme === 'dark' ? 'border-neutral-800' : 'border-slate-100'}`}>
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span className="truncate">{currentUser.name}</span>
                      <span className={`font-mono text-[9px] px-1.5 py-0.2 rounded border shrink-0 ${
                        isAdmin ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' :
                        isOwner ? 'text-teal-500 bg-teal-500/10 border-teal-500/20' :
                        'text-blue-500 bg-blue-500/10 border-blue-500/20'
                      }`}>
                        {isAdmin ? 'Admin' : (isOwner ? 'Car Owner' : 'Customer')}
                      </span>
                    </div>
                    <div className={`text-[11px] truncate mt-1 ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>{currentUser.email}</div>
                    {currentUser.phone && (
                      <div className={`text-[10px] font-mono mt-0.5 ${theme === 'dark' ? 'text-neutral-500' : 'text-slate-400'}`}>
                        Phone: {currentUser.phone}
                      </div>
                    )}
                  </div>

                  {/* Account Logout CTA */}
                  <div className="p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Log Out of Platform</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* SIDEBAR & MAIN CONTENT LAYOUT WRAPPER */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-1 pt-16 min-h-0 min-w-0 relative">
        
        {/* LEFT SIDEBAR NAVIGATION */}
        <aside 
          className={`
            fixed top-16 bottom-0 left-0 z-40 flex flex-col justify-between shrink-0 overflow-x-hidden border-r
            md:sticky md:top-16 md:h-[calc(100vh-64px)] md:z-20
            ${theme === 'dark'
              ? 'border-neutral-800 bg-neutral-950/95 text-neutral-100'
              : 'border-slate-200 bg-white/95 text-slate-900 shadow-sm'
            }
            ${isSidebarCollapsed ? 'md:w-[72px]' : 'md:w-[240px]'}
            ${mobileMenuOpen ? 'w-60 translate-x-0' : '-translate-x-full md:translate-x-0'}
            ${animClass}
          `}
        >
          {/* Top Header of Sidebar containing Toggle Chevron */}
          <div className={`h-14 border-b flex items-center shrink-0 px-4 relative transition-colors duration-300 ease-in-out ${
            theme === 'dark' ? 'border-neutral-800' : 'border-slate-200'
          }`}>
            <span className={`absolute left-4 text-[10px] font-mono font-bold uppercase tracking-wider transition-all duration-300 ease-in-out ${
              isSidebarCollapsed ? 'opacity-0 -translate-x-3 pointer-events-none' : 'opacity-100 translate-x-0'
            } ${
              theme === 'dark' ? 'text-neutral-500' : 'text-slate-400'
            }`}>
              Navigation
            </span>
            
            <button
              type="button"
              onClick={toggleSidebar}
              className={`hidden md:flex h-8 w-8 items-center justify-center rounded-xl border absolute transition-all duration-300 ease-in-out cursor-pointer ${
                isSidebarCollapsed ? 'left-[20px]' : 'left-[192px]'
              } ${
                theme === 'dark'
                  ? 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white hover:border-neutral-700'
                  : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 hover:border-slate-300'
              }`}
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${
                isSidebarCollapsed ? 'rotate-180' : ''
              }`} />
            </button>
          </div>

          {/* Navigation Items List */}
          <div className="p-3 space-y-1.5 flex-1 overflow-y-auto">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  title={isSidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer relative ${
                    isActive
                      ? (theme === 'dark'
                          ? 'bg-emerald-500/15 text-emerald-400 font-bold border-r-2 border-emerald-500'
                          : 'bg-slate-200 text-slate-900 font-extrabold border-r-2 border-emerald-600 shadow-sm')
                      : (theme === 'dark'
                          ? 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
                  }`}
                >
                  <div className="relative shrink-0 w-5 h-5 flex items-center justify-center">
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-500' : ''}`} />
                    
                    {/* Small Count Badge over Icon when Collapsed */}
                    {isSidebarCollapsed && item.badge !== undefined && (
                      <span className="absolute -top-1.5 -right-2 h-4 min-w-[16px] px-1 rounded-full bg-emerald-500 text-neutral-950 font-mono text-[9px] font-bold flex items-center justify-center border border-neutral-950">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  {/* Label text (Smooth transition fade-in/out) */}
                  <span className={`truncate flex-1 text-left transition-all duration-300 ${
                    isSidebarCollapsed 
                      ? 'opacity-0 w-0 pointer-events-none overflow-hidden' 
                      : 'opacity-100 w-auto'
                  } whitespace-nowrap`}>
                    {item.label}
                  </span>

                  {/* Badge Number (When Expanded) */}
                  {!isSidebarCollapsed && item.badge !== undefined && (
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold shrink-0 transition-opacity duration-300 ${
                      isSidebarCollapsed ? 'opacity-0' : 'opacity-100'
                    } ${
                      isActive 
                        ? 'bg-emerald-500 text-neutral-950' 
                        : (theme === 'dark' ? 'bg-neutral-800 text-neutral-300' : 'bg-slate-200 text-slate-700')
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer */}
          <div className={`p-3 border-t flex items-center shrink-0 justify-center ${
            theme === 'dark' ? 'border-neutral-800' : 'border-slate-200'
          }`}>
            {!isSidebarCollapsed ? (
              <span className={`text-[10px] font-mono ${theme === 'dark' ? 'text-neutral-500' : 'text-slate-400'}`}>
                GoDrive v3.2
              </span>
            ) : (
              <span className={`text-[10px] font-mono font-bold ${theme === 'dark' ? 'text-emerald-500' : 'text-emerald-600'}`}>
                GD
              </span>
            )}
          </div>
        </aside>

        {/* Mobile Backdrop Overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Main Workspace container next to Sidebar */}
        <div className={`flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 ${animClass}`}>
          {children}
        </div>
      </div>
    </>
  );
};
