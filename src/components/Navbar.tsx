import React, { useState } from 'react';
import { 
  Plus, 
  LogOut, 
  ChevronDown, 
  Check, 
  Car, 
  DollarSign, 
  FileText,
  LifeBuoy
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
  onSwitchUser: (userId: string) => void;
  onToggleNormalUserMode: () => void;
  isDemoPulseActive: boolean;
  setIsDemoPulseActive: (val: boolean) => void;
  auditCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  allUsers,
  onOpenNewBooking,
  onOpenNewVehicle,
  onLogout,
  onSwitchUser,
  onToggleNormalUserMode,
  auditCount,
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false);
  const isAdmin = currentUser.role === 'admin';
  const isOwner = currentUser.role === 'vehicle_owner';
  const isCustomerOnly = currentUser.role === 'renter';
  const isNormalUserMode = isCustomerOnly || currentUser.activeViewMode === 'renter';

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand Wordmark */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-lg">
            व
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-white block leading-none">
                VahaanFlow
              </span>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                isAdmin ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                isOwner ? 'text-teal-400 bg-teal-500/10 border-teal-500/20' :
                'text-blue-400 bg-blue-500/10 border-blue-500/20'
              }`}>
                {isAdmin ? 'ADMIN' : (isOwner ? 'CAR OWNER' : 'CUSTOMER')}
              </span>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">
              {isCustomerOnly ? 'Customer (Rent a Car)' : (isNormalUserMode ? 'Renting as Customer' : (isAdmin ? 'Admin Dashboard' : 'Car Owner Dashboard'))}
            </span>
          </div>
        </div>

        {/* Dynamic Navigation Tabs in Simple Indian English */}
        <nav className="hidden lg:flex items-center gap-1">
          
          {/* Tab 1: Cars */}
          <button
            onClick={() => setActiveTab('fleet')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'fleet'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            {isOwner ? 'My Cars' : (isNormalUserMode ? 'Rent a Car' : 'All Cars')}
          </button>

          {/* Tab 2: Bookings */}
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'bookings'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            {isOwner ? 'Car Bookings' : (isNormalUserMode ? 'My Trips' : 'All Bookings')}
          </button>

          {/* Tab 3: Owner Earnings (Owner only) */}
          {isOwner && (
            <button
              onClick={() => setActiveTab('earnings')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'earnings'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
              <span>Earnings & Payouts</span>
            </button>
          )}

          {/* Tab 4: Admin Payouts & Complaints (Admin only) */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('payouts')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'payouts'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              <span>Owner Payouts & Complaints</span>
            </button>
          )}

          {/* Tab 5: Activity History (Admin only) */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'audit'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              <span>Activity History (Read-only)</span>
              <span className="text-[10px] font-mono tabular-nums text-neutral-400 bg-neutral-900 px-1.5 py-0.2 rounded border border-neutral-700">
                {auditCount}
              </span>
            </button>
          )}

          {/* Tab 6: Car Servicing & RTO Fitness (Admin only) */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'maintenance'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
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
            <button
              onClick={onOpenNewBooking}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 text-neutral-950 hover:bg-emerald-400 transition-colors shadow-sm shadow-emerald-500/20 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>New Booking</span>
            </button>
          )}

          {/* User Profile & Account Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1 text-xs rounded-lg border border-neutral-800 bg-neutral-900/90 hover:border-neutral-700 transition-colors"
            >
              <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <span className="text-xs font-medium text-white block max-w-[110px] truncate">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-neutral-400 block font-mono">
                  {isAdmin ? 'Admin' : (isOwner ? 'Car Owner' : 'Customer')}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl border border-neutral-800 bg-neutral-900 p-2 shadow-2xl z-50 space-y-2">
                <div className="p-2 border-b border-neutral-800">
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span className="truncate">{currentUser.name}</span>
                    <span className={`font-mono text-[9px] px-1.5 py-0.2 rounded border shrink-0 ${
                      isAdmin ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                      isOwner ? 'text-teal-400 bg-teal-500/10 border-teal-500/20' :
                      'text-blue-400 bg-blue-500/10 border-blue-500/20'
                    }`}>
                      {isAdmin ? 'Admin' : (isOwner ? 'Car Owner' : 'Customer')}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400 truncate mt-0.5">{currentUser.email}</div>
                  <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
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

                {/* Quick Profile Switching */}
                <div className="space-y-1">
                  <div className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider px-2 py-1">
                    Switch Test Account
                  </div>
                  {allUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => {
                        onSwitchUser(u.id);
                        setUserMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                        u.id === currentUser.id 
                          ? 'bg-neutral-800 text-white font-medium' 
                          : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="text-white text-xs truncate">{u.name}</div>
                        <div className="text-[10px] text-neutral-500 truncate">{u.email}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[9px] font-mono text-neutral-400">
                          {u.role === 'admin' ? 'Admin' : 'Owner'}
                        </span>
                        {u.id === currentUser.id && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                      </div>
                    </button>
                  ))}
                </div>

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
