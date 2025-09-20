'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTemplePlans } from '@/hooks/useTemplePlans';
import { TempleCard } from '@/components/temples/TempleCard';
import { TempleFilters } from '@/lib/types/temple';
import AuthModal from '@/components/AuthModal';

export default function TemplePage() {
  const router = useRouter();
  const { user, loading: authLoading, error: authError, signInAnonymouslyIfNeeded } = useAuth();
  const [filters, setFilters] = useState<TempleFilters>({});
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { plans, loading, error } = useTemplePlans(filters);

  // Auto sign-in anonymously when component mounts
  useEffect(() => {
    const handleAuth = async () => {
      if (!authLoading && !user) {
        try {
          await signInAnonymouslyIfNeeded();
        } catch (error) {
          console.error('Auto auth failed:', error);
          setShowAuthModal(true);
        }
      }
    };

    handleAuth();
  }, [authLoading, user, signInAnonymouslyIfNeeded]);

  // Show auth modal if there's an auth error
  useEffect(() => {
    if (authError && authError.includes('Anonymous authentication is disabled')) {
      setShowAuthModal(true);
    }
  }, [authError]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="text-slate-300 mt-2">Loading temple plans...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error loading temple plans</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Group plans by status for stats
  const stats = {
    total: plans.length,
    planned: plans.filter(p => p.status === 'PLANNED').length,
    overdue: plans.filter(p => p.status === 'OVERDUE').length,
    completed: plans.filter(p => p.status === 'COMPLETED').length,
  };

  const nextVisit = plans
    .filter(p => p.status === 'PLANNED' && p.targetVisitDate)
    .sort((a, b) => (a.targetVisitDate || 0) - (b.targetVisitDate || 0))[0];

  const getDaysToVisit = (targetDate: number) => {
    const today = new Date();
    const target = new Date(targetDate);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-slate-700 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-semibold text-slate-100">YOUR TRIP</h1>
                <p className="text-slate-400 text-sm">Temple Spiritual Journey</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <nav className="flex gap-6">
                <a href="#" className="text-slate-400 hover:text-white text-sm">Discover</a>
                <a href="#" className="text-emerald-400 text-sm font-medium">Dashboard</a>
                <a href="#" className="text-slate-400 hover:text-white text-sm">Your Trips</a>
                <a href="#" className="text-slate-400 hover:text-white text-sm">Archive</a>
                <button
                  onClick={() => router.push('/temples/new')}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-900 px-4 py-1.5 rounded-lg text-sm font-medium"
                >
                  📍 New Trip
                </button>
              </nav>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-slate-700 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                <button className="p-2 hover:bg-slate-700 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5V12h-5l5-5v10z" />
                  </svg>
                </button>
                <div className="w-8 h-8 bg-slate-600 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Main Content Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Main Welcome Card */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-6 h-80 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🏛️</span>
                  <span className="text-sm text-slate-300">{plans.length} Temple{plans.length !== 1 ? 's' : ''}</span>
                </div>
                <h2 className="text-2xl font-bold mb-4">
                  Hey Ashish! 🙏<br />
                  Welcome To Your Temple<br />
                  Adventure!
                </h2>
                <p className="text-slate-400 text-sm mb-6">
                  Plan your spiritual journey and keep track of your temple visits, expenses, and memories.
                </p>
                <button
                  onClick={() => router.push('/temples/new')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  + Plan New Temple Visit
                </button>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 to-blue-900/20"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 rounded-full -translate-y-8 translate-x-8"></div>
            </div>
          </div>

          {/* Budget Card */}
          <div className="col-span-12 sm:col-span-6 lg:col-span-2">
            <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-5 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white/80 text-sm font-medium">💰 BUDGET</h3>
                <button className="text-white/60 hover:text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
              
              <div className="relative w-20 h-20 mx-auto mb-4">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-white/30"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="transparent"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-white"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray="60, 100"
                    strokeLinecap="round"
                    fill="transparent"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">60%</span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/80">Air ticket</span>
                  <span>₹58,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Taxi rent</span>
                  <span>₹4,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Food budget</span>
                  <span>₹7,000</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-white/80">Record</span>
                  <span className="text-white">₹69,000</span>
                </div>
              </div>
              
              <button className="w-full mt-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">
                + Add Budget Item
              </button>
            </div>
          </div>

          {/* Expenses Card */}
          <div className="col-span-12 sm:col-span-6 lg:col-span-2">
            <div className="bg-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-400 text-sm font-medium">💳 EXPENSES</h3>
                <button className="text-slate-400 hover:text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-orange-400">✈️</span>
                    <span className="text-slate-300">Air ticket</span>
                  </div>
                  <span className="font-medium">₹23,000</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">🚗</span>
                    <span className="text-slate-300">Taxi rent</span>
                  </div>
                  <span className="font-medium">₹1,500</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400">🍽️</span>
                    <span className="text-slate-300">Food budget</span>
                  </div>
                  <span className="font-medium">₹2,500</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400">🏛️</span>
                    <span className="text-slate-300">Temple offerings</span>
                  </div>
                  <span className="font-medium">₹5,000</span>
                </div>
                <div className="flex justify-between items-center font-medium border-t border-slate-700 pt-2">
                  <span className="text-slate-300">Total spent</span>
                  <span className="text-white">₹32,000</span>
                </div>
              </div>
              
              <button className="w-full mt-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-sm font-medium transition-colors">
                + Add Expense
              </button>
            </div>
          </div>

          {/* Readiness Card */}
          <div className="col-span-12 sm:col-span-6 lg:col-span-2">
            <div className="bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl p-5 text-slate-900">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-800 text-sm font-medium">📋 READINESS</h3>
                <button className="text-slate-700 hover:text-slate-900">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
              
              <div className="relative w-20 h-20 mx-auto mb-4">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-800/30"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="transparent"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-slate-900"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray="85, 100"
                    strokeLinecap="round"
                    fill="transparent"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm text-slate-700">Days left</span>
                  <span className="text-3xl font-bold">
                    {nextVisit ? getDaysToVisit(nextVisit.targetVisitDate!) : '17'}
                  </span>
                </div>
              </div>

              <button className="w-full py-2 bg-slate-900/20 hover:bg-slate-900/30 text-slate-800 rounded-lg text-sm font-medium transition-colors">
                + Add Checklist Item
              </button>
            </div>
          </div>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-12 gap-6 mt-6">
          {/* Destinations Map */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-slate-800 rounded-2xl p-6 h-80">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-200 font-medium">🗺️ DESTINATIONS</h3>
                <button className="text-slate-400 hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
              
              {/* Simple Map Illustration */}
              <div className="relative h-52 bg-slate-700/50 rounded-xl overflow-hidden">
                <svg viewBox="0 0 300 200" className="w-full h-full">
                  <path 
                    d="M50 150 Q100 100 150 120 Q200 140 250 110" 
                    stroke="#10b981" 
                    strokeWidth="3" 
                    fill="none"
                    strokeDasharray="5,5"
                  />
                  <circle cx="50" cy="150" r="6" fill="#10b981" />
                  <circle cx="150" cy="120" r="6" fill="#f59e0b" />
                  <circle cx="250" cy="110" r="6" fill="#ef4444" />
                </svg>
                
                <div className="absolute bottom-4 left-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    <span className="text-slate-300">Kathmandu</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                    <span className="text-slate-300">Pokhara</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-slate-300">Chitwan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="text-slate-300">Everest</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Weather Card */}
          <div className="col-span-12 sm:col-span-6 lg:col-span-2">
            <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-5 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm opacity-90">🌤️ KATHMANDU</span>
                <button className="opacity-70 hover:opacity-100">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="text-4xl font-bold">13°</div>
                <div className="text-right">
                  <div className="text-xs opacity-75">Feels like</div>
                  <div className="text-lg font-semibold">8°</div>
                </div>
              </div>
              
              <div className="text-xs space-y-1 opacity-90 mb-4">
                <div>⬆️ 15°C Max today</div>
                <div>⬇️ 8°C Min today</div>
                <div>💨 Really cloudy</div>
                <div>🌧️ Partly cloudy</div>
              </div>

              <button className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">
                📋 New Reminder
              </button>
            </div>
          </div>

          {/* Flight Info Card */}
          <div className="col-span-12 sm:col-span-6 lg:col-span-2">
            <div className="bg-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm font-medium">✈️ FLIGHT</span>
                <button className="text-slate-400 hover:text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="text-2xl font-bold mb-3 text-white">Dehradun</div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>✈️</span>
                    <span className="text-slate-300">Kathmandu</span>
                  </div>
                  <span className="text-emerald-400">✈</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>📍</span>
                    <span className="text-slate-300">Delhi</span>
                  </div>
                </div>
              </div>

              <button className="w-full mt-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg text-sm font-medium transition-colors">
                + Add Flight
              </button>
            </div>
          </div>

          {/* Packing List Card */}
          <div className="col-span-12 sm:col-span-6 lg:col-span-2">
            <div className="bg-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-400 text-sm font-medium">🎒 PACKING LIST</h3>
                <button className="text-slate-400 hover:text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded border-2 border-slate-600 flex items-center justify-center">
                    <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-slate-300">Backpack</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded border-2 border-slate-600"></div>
                  <span className="text-slate-300">Camera & GoPro</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded border-2 border-slate-600"></div>
                  <span className="text-slate-300">Laptop & Charger</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded border-2 border-slate-600"></div>
                  <span className="text-slate-300">Hot water bottle</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded border-2 border-slate-600"></div>
                  <span className="text-slate-300">Winter Jacket</span>
                </div>
                
                <button className="w-full mt-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium transition-colors">
                  + Add Packing Item
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Activities Section */}
        <div className="mt-8">
          <div className="bg-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-slate-200 font-medium">📅 DAYS & ACTIVITY</h3>
              <button className="text-slate-400 hover:text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {plans.slice(0, 3).map((plan, index) => (
                <div key={plan.id} className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-xl hover:bg-slate-700/50 transition-colors cursor-pointer"
                     onClick={() => router.push(`/temples/${plan.id}`)}>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 font-medium">Day {index + 1}</span>
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-medium text-slate-200">{plan.templeName}</div>
                    <div className="text-sm text-slate-400 mt-1">
                      {plan.vowReason.length > 60 ? plan.vowReason.substring(0, 60) + '...' : plan.vowReason}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-slate-400 text-sm">Status</div>
                    <div className={`text-sm font-medium ${
                      plan.status === 'COMPLETED' ? 'text-emerald-400' :
                      plan.status === 'PLANNED' ? 'text-blue-400' :
                      plan.status === 'OVERDUE' ? 'text-red-400' :
                      'text-slate-400'
                    }`}>
                      {plan.status === 'COMPLETED' ? 'Completed' :
                       plan.status === 'PLANNED' ? 'Planned' :
                       plan.status === 'OVERDUE' ? 'Overdue' : 'Pending'}
                    </div>
                  </div>
                </div>
              ))}
              
              {plans.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🏛️</div>
                  <h3 className="text-xl font-medium text-slate-200 mb-2">No temple plans yet</h3>
                  <p className="text-slate-400 mb-4">Create your first spiritual journey plan to get started</p>
                  <button
                    onClick={() => router.push('/temples/new')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Create Your First Plan
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
}
