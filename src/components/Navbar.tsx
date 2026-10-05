import React, { useState } from 'react';
import { 
  Plus, 
  LogOut, 
  ChevronDown, 
  Check, 
  Car, 
  DollarSign, 
  FileText,
  LifeBuoy,
  Trash2,
  Sun,
  Moon
} from 'lucide-react';
import { UserProfile } from '../types/auth';

interface NavbarProps {
  activeTab: 'fleet' | 'bookings' | 'earnings' | 'payouts' | 'audit' | 'maintenance';
  setActiveTab: (tab: 'fleet' | 'bookings' | 'earnings' | 'payouts' | 'audit' | 'maintenance') => void;
  currentUser: UserProfile;
  allUsers: UserProfile[];
  onOpenNewBooking: () => void;
  onOpenNewVehicle: () => void;
  onLogout: () => void;
  onToggleNormalUserMode: () => void;
  isDemoPulseActive: boolean;
  setIsDemoPulseActive: (val: boolean) => void;
  auditCount: number;
  onDeleteUser?: (userId: string) => Promise<void>;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
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
  onDeleteUser,
  theme,
  onToggleTheme,
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false);
  const isAdmin = currentUser.role === 'admin';
  const isOwner = currentUser.role === 'vehicle_owner';
  const isCustomerOnly = currentUser.role === 'renter';
  const isNormalUserMode = isCustomerOnly || currentUser.activeViewMode === 'renter';

  return (
    <header className={`sticky top-0 z-30 border-b backdrop-blur-md transition-colors duration-200 ${
      theme === 'dark' 
        ? 'border-neutral-800 bg-neutral-950/95 text-neutral-100' 
        : 'border-slate-200 bg-white/95 text-slate-900 shadow-sm'
    }`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand Wordmark */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold text-lg">
            व
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-base font-bold tracking-tight block leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                VahaanFlow
              </span>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                isAdmin ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' :
                isOwner ? 'text-teal-500 bg-teal-500/10 border-teal-500/20' :
                'text-blue-500 bg-blue-500/10 border-blue-500/20'
              }`}>
                {isAdmin ? 'ADMIN' : (isOwner ? 'CAR OWNER' : 'CUSTOMER')}
              </span>
            </div>
            <span className={`text-[10px] font-mono ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>
              {isCustomerOnly ? 'Customer (Rent a Car)' : (isNormalUserMode ? 'Renting as Customer' : (isAdmin ? 'Admin Dashboard' : 'Car Owner Dashboard'))}
            </span>
          </div>
        </div>

        {/* Dynamic Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1">
          
          {/* Tab 1: Cars */}
          <button
            onClick={() => setActiveTab('fleet')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'fleet'
                ? (theme === 'dark' ? 'bg-neutral-800 text-white' : 'bg-slate-900 text-white shadow-sm')
                : (theme === 'dark' ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
            }`}
          >
            {isOwner ? 'My Cars' : (isNormalUserMode ? 'Rent a Car' : 'All Cars')}
          </button>

          {/* Tab 2: Bookings */}
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'bookings'
                ? (theme === 'dark' ? 'bg-neutral-800 text-white' : 'bg-slate-900 text-white shadow-sm')
                : (theme === 'dark' ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
            }`}
          >
            {isOwner ? 'Car Bookings' : (isNormalUserMode ? 'My Trips' : 'All Bookings')}
          </button>

          {/* Tab 3: Owner Earnings (Owner only) */}
          {isOwner && (
            <button
              onClick={() => setActiveTab('earnings')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'earnings'
                  ? (theme === 'dark' ? 'bg-neutral-800 text-white' : 'bg-slate-900 text-white shadow-sm')
                  : (theme === 'dark' ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
              }`}
            >
              <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
              <span>Earnings & Payouts</span>
            </button>
          )}

          {/* Tab 4: Admin Payouts & Complaints (Admin only) */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('payouts')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'payouts'
                  ? (theme === 'dark' ? 'bg-neutral-800 text-white' : 'bg-slate-900 text-white shadow-sm')
                  : (theme === 'dark' ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
              }`}
            >
              <span>Owner Payouts & Complaints</span>
            </button>
          )}

          {/* Tab 5: Activity History (Admin only) */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'audit'
                  ? (theme === 'dark' ? 'bg-neutral-800 text-white' : 'bg-slate-900 text-white shadow-sm')
                  : (theme === 'dark' ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
              }`}
            >
              <span>Activity History (Read-only)</span>
              <span className={`text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded border ${
                theme === 'dark' ? 'text-neutral-400 bg-neutral-900 border-neutral-700' : 'text-slate-600 bg-slate-100 border-slate-300'
              }`}>
                {auditCount}
              </span>
            </button>
          )}

          {/* Tab 6: Car Servicing & RTO Fitness (Admin only) */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'maintenance'
                  ? (theme === 'dark' ? 'bg-neutral-800 text-white' : 'bg-slate-900 text-white shadow-sm')
                  : (theme === 'dark' ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
              }`}
            >
              Car Servicing & Fitness
            </button>
          )}
        </nav>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2.5">
          
          {/* Normal User View Switcher (Only for Admin & Owners who have dual view modes) */}
          {!isCustomerOnly && (
            <button
              onClick={onToggleNormalUserMode}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                isNormalUserMode
                  ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
                  : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
              }`}
              title="Switch between Admin/Owner and Customer view"
            >
              <Car className="h-3.5 w-3.5" />
              <span>{isNormalUserMode ? 'Back to Dashboard' : 'Rent a Car'}</span>
            </button>
          )}

          {/* Action CTA: Add Car or Booking */}
          {isOwner ? (
            <button
              onClick={onOpenNewVehicle}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 text-neutral-950 hover:bg-emerald-400 transition-colors shadow-sm shadow-emerald-500/20 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Add Car</span>
            </button>
          ) : (
            isNormalUserMode && (
              <button
                onClick={onOpenNewBooking}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 text-neutral-950 hover:bg-emerald-400 transition-colors shadow-sm shadow-emerald-500/20 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>New Booking</span>
              </button>
            )
          )}

          {/* Light / Dark Theme Switch Button (Top Right Corner) */}
          <button
            onClick={onToggleTheme}
            className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-xs font-semibold shrink-0 shadow-sm ${
              theme === 'dark'
                ? 'bg-neutral-900 border-neutral-700 text-amber-400 hover:bg-neutral-800'
                : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
            }`}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-4 w-4 stroke-[2.5] text-amber-400" />
                <span className="hidden sm:inline">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 stroke-[2.5] text-indigo-600" />
                <span className="hidden sm:inline">Dark Mode</span>
              </>
            )}
          </button>

          {/* User Profile & Account Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={`flex items-center gap-2 pl-2 pr-2.5 py-1 text-xs rounded-lg border transition-colors ${
                theme === 'dark'
                  ? 'border-neutral-800 bg-neutral-900/90 hover:border-neutral-700'
                  : 'border-slate-200 bg-slate-100 hover:border-slate-300'
              }`}
            >
              <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-500 font-bold flex items-center justify-center text-[10px]">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <span className={`text-xs font-medium block max-w-[110px] truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {currentUser.name}
                </span>
                <span className={`text-[10px] block font-mono ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>
                  {isAdmin ? 'Admin' : (isOwner ? 'Car Owner' : 'Customer')}
                </span>
              </div>
              <ChevronDown className={`h-3.5 w-3.5 ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`} />
            </button>

            {userMenuOpen && (
              <div className={`absolute right-0 mt-2 w-72 rounded-xl border p-2 shadow-2xl z-50 space-y-2 ${
                theme === 'dark'
                  ? 'border-neutral-800 bg-neutral-900 text-neutral-100'
                  : 'border-slate-200 bg-white text-slate-900'
              }`}>
                <div className={`p-2 border-b ${theme === 'dark' ? 'border-neutral-800' : 'border-slate-100'}`}>
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
                  <div className={`text-[11px] truncate mt-0.5 ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>{currentUser.email}</div>
                  <div className={`text-[10px] font-mono mt-0.5 ${theme === 'dark' ? 'text-neutral-500' : 'text-slate-400'}`}>
                    Phone: {currentUser.phone}
                  </div>
                </div>

                {/* Normal User Mode Toggle (For Admin & Owner only) */}
                {!isCustomerOnly && (
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onToggleNormalUserMode();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium text-blue-400 hover:bg-blue-500/10 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Car className="h-3.5 w-3.5" />
                      <span>{isNormalUserMode ? 'Back to Admin/Owner Dashboard' : 'Rent a Car as Customer'}</span>
                    </span>
                    {isNormalUserMode && <Check className="h-3.5 w-3.5" />}
                  </button>
                )}

                {/* Registered Users Directory (ADMIN ONLY - STRICTLY READ-ONLY, NO ACCOUNT SWITCHING) */}
                {isAdmin && (
                  <div className="space-y-1.5 pt-1 border-t border-neutral-800">
                    <div className="flex items-center justify-between px-2 py-1">
                      <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider">
                        Registered Accounts Directory
                      </span>
                      <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        Admin View Only
                      </span>
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                      {allUsers.map(u => (
                        <div
                          key={u.id}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs ${
                            u.id === currentUser.id 
                              ? (theme === 'dark' ? 'bg-neutral-800/80 border border-neutral-700/60' : 'bg-slate-100 border border-slate-300')
                              : (theme === 'dark' ? 'bg-neutral-950/60 border border-neutral-800/40' : 'bg-slate-50 border border-slate-200')
                          }`}
                        >
                          <div className="truncate pr-2">
                            <div className={`text-xs font-medium truncate flex items-center gap-1.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              <span>{u.name}</span>
                              {u.id === currentUser.id && (
                                <span className="text-[9px] text-emerald-500 font-mono">(You)</span>
                              )}
                            </div>
                            <div className={`text-[10px] truncate ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>{u.email}</div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                              u.role === 'admin' 
                                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                                : u.role === 'vehicle_owner' 
                                ? 'text-teal-400 bg-teal-500/10 border-teal-500/20' 
                                : 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                            }`}>
                              {u.role === 'admin' ? 'Admin' : u.role === 'vehicle_owner' ? 'Owner' : 'Customer'}
                            </span>

                            {isAdmin && u.id !== currentUser.id && onDeleteUser && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (confirm(`Are you sure you want to permanently delete profile for ${u.name} (${u.email})?`)) {
                                    await onDeleteUser(u.id);
                                  }
                                }}
                                className="p-1 rounded bg-red-500/10 hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-colors border border-red-500/20 cursor-pointer"
                                title={`Delete ${u.role === 'vehicle_owner' ? 'Owner' : 'Customer'} Profile`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-1 border-t border-neutral-800 space-y-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Mobile Tab Strip */}
      <div className="lg:hidden flex items-center overflow-x-auto border-t border-neutral-800 px-4 py-2 gap-1 bg-neutral-950 text-xs">
        <button
          onClick={() => setActiveTab('fleet')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
            activeTab === 'fleet' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400'
          }`}
        >
          {isOwner ? 'My Cars' : 'Cars'}
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
            activeTab === 'bookings' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400'
          }`}
        >
          Bookings
        </button>

        {isOwner && (
          <button
            onClick={() => setActiveTab('earnings')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
              activeTab === 'earnings' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400'
            }`}
          >
            Earnings
          </button>
        )}

        {isAdmin && (
          <>
            <button
              onClick={() => setActiveTab('payouts')}
              className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
                activeTab === 'payouts' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400'
              }`}
            >
              Payouts
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
                activeTab === 'audit' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400'
              }`}
            >
              History
            </button>
          </>
        )}
      </div>

    </header>
  );
};
