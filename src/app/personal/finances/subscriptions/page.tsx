'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import Image from 'next/image';
import { 
  getSubscriptions, 
  addSubscription, 
  updateSubscription, 
  deleteSubscription,
  addTransaction,
  getTransactions,
  Subscription,
  Transaction
} from '@/lib/personalFinances';

export default function SubscriptionManager() {
  const { theme } = useTheme();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAddSubscription, setShowAddSubscription] = useState(false);
  const [showEditSubscription, setShowEditSubscription] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'cancelled' | 'expiring-soon'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'amount' | 'date'>('date');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [subscriptionForm, setSubscriptionForm] = useState({
    name: '',
    provider: '',
    description: '',
    amount: '',
    currency: 'INR',
    billingCycle: 'monthly' as 'monthly' | 'quarterly' | 'annually' | 'custom',
    customCycleDays: '',
    nextBillingDate: new Date().toISOString().split('T')[0],
    category: 'entertainment',
    icon: '',
    autoRenewal: true,
    reminderDays: '7',
    status: 'active' as 'active' | 'cancelled' | 'paused',
    notes: ''
  });

  const totalMonthlySpend = subscriptions
    .filter(sub => sub.status === 'active')
    .reduce((total, subscription) => {
      let monthlyAmount = subscription.amount;
      
      // Convert amount to monthly equivalent
      switch (subscription.billingCycle) {
        case 'quarterly':
          monthlyAmount = subscription.amount / 3;
          break;
        case 'annually':
          monthlyAmount = subscription.amount / 12;
          break;
        case 'custom':
          if (subscription.customCycleDays) {
            monthlyAmount = (subscription.amount * 30) / subscription.customCycleDays;
          }
          break;
      }
      
      return total + monthlyAmount;
    }, 0);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [loadedSubscriptions, loadedTransactions] = await Promise.all([
          getSubscriptions(),
          getTransactions()
        ]);
        setSubscriptions(loadedSubscriptions);
        setTransactions(loadedTransactions);
      } catch (error) {
        console.error('Error loading subscription data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (isEdit) {
        setEditingSubscription(prev => 
          prev ? { ...prev, icon: reader.result as string } : null
        );
      } else {
        setSubscriptionForm(prev => ({ ...prev, icon: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscriptionForm.name || !subscriptionForm.amount) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate amount is a valid number
    const amount = parseFloat(subscriptionForm.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }

    // Validate reminder days is a valid number
    const reminderDays = parseInt(subscriptionForm.reminderDays);
    if (isNaN(reminderDays) || reminderDays < 0) {
      alert('Please enter a valid number of reminder days');
      return;
    }

    // Validate next billing date
    if (!subscriptionForm.nextBillingDate) {
      alert('Please select a next billing date');
      return;
    }

    // Validate custom cycle days if billing cycle is custom
    let customCycleDays: number | undefined;
    if (subscriptionForm.billingCycle === 'custom') {
      if (!subscriptionForm.customCycleDays) {
        alert('Please enter the number of days for custom billing cycle');
        return;
      }
      customCycleDays = parseInt(subscriptionForm.customCycleDays);
      if (isNaN(customCycleDays) || customCycleDays <= 0) {
        alert('Please enter a valid number of days for custom billing cycle');
        return;
      }
    }

    try {
      console.log('Adding subscription with data:', {
        name: subscriptionForm.name,
        provider: subscriptionForm.provider,
        description: subscriptionForm.description,
        amount: amount,
        currency: subscriptionForm.currency,
        billingCycle: subscriptionForm.billingCycle,
        customCycleDays: customCycleDays,
        nextBillingDate: subscriptionForm.nextBillingDate,
        category: subscriptionForm.category,
        icon: subscriptionForm.icon,
        autoRenewal: subscriptionForm.autoRenewal,
        reminderDays: reminderDays,
        status: subscriptionForm.status,
        notes: subscriptionForm.notes
      });

      const newSubscription = await addSubscription({
        name: subscriptionForm.name,
        provider: subscriptionForm.provider,
        description: subscriptionForm.description,
        amount: amount,
        currency: subscriptionForm.currency,
        billingCycle: subscriptionForm.billingCycle,
        customCycleDays: customCycleDays,
        nextBillingDate: subscriptionForm.nextBillingDate,
        category: subscriptionForm.category,
        icon: subscriptionForm.icon,
        autoRenewal: subscriptionForm.autoRenewal,
        reminderDays: reminderDays,
        status: subscriptionForm.status,
        notes: subscriptionForm.notes
      });

      setSubscriptions([newSubscription, ...subscriptions]);
      
      // Also add as a transaction to align with overview tab
      await addTransaction({
        description: `Subscription: ${subscriptionForm.name}`,
        amount: amount,
        category: subscriptionForm.category,
        type: 'expense',
        date: new Date().toISOString().split('T')[0]
      });
      
      console.log('Subscription added successfully:', newSubscription);
      
      // Reset form
      setSubscriptionForm({
        name: '',
        provider: '',
        description: '',
        amount: '',
        currency: 'INR',
        billingCycle: 'monthly',
        customCycleDays: '',
        nextBillingDate: new Date().toISOString().split('T')[0],
        category: 'entertainment',
        icon: '',
        autoRenewal: true,
        reminderDays: '7',
        status: 'active',
        notes: ''
      });
      setShowAddSubscription(false);
    } catch (error) {
      console.error('Error adding subscription:', error);
      alert(`Error adding subscription: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    }
  };

  const handleEditSubscription = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setShowEditSubscription(true);
  };

  const handleUpdateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubscription) return;

    try {
      const updatedSubscription = await updateSubscription(editingSubscription.id!, {
        name: editingSubscription.name,
        provider: editingSubscription.provider,
        description: editingSubscription.description,
        amount: editingSubscription.amount,
        currency: editingSubscription.currency,
        billingCycle: editingSubscription.billingCycle,
        customCycleDays: editingSubscription.customCycleDays,
        nextBillingDate: editingSubscription.nextBillingDate,
        category: editingSubscription.category,
        icon: editingSubscription.icon,
        autoRenewal: editingSubscription.autoRenewal,
        reminderDays: editingSubscription.reminderDays,
        status: editingSubscription.status,
        notes: editingSubscription.notes
      });

      if (updatedSubscription) {
        setSubscriptions(subscriptions.map(sub => 
          sub.id === editingSubscription.id ? updatedSubscription : sub
        ));
      }
      
      // Also add as a transaction to align with overview tab
      if (editingSubscription.status === 'active') {
        await addTransaction({
          description: `Subscription Updated: ${editingSubscription.name}`,
          amount: editingSubscription.amount,
          category: editingSubscription.category,
          type: 'expense',
          date: new Date().toISOString().split('T')[0]
        });
      }
      
      setShowEditSubscription(false);
      setEditingSubscription(null);
    } catch (error) {
      console.error('Error updating subscription:', error);
      alert('Error updating subscription. Please try again.');
    }
  };

  const handleDeleteSubscription = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to delete this subscription?')) {
      return;
    }

    try {
      await deleteSubscription(subscriptionId);
      setSubscriptions(subscriptions.filter(sub => sub.id !== subscriptionId));
    } catch (error) {
      console.error('Error deleting subscription:', error);
      alert('Error deleting subscription. Please try again.');
    }
  };

  const handleToggleStatus = async (subscription: Subscription) => {
    const newStatus = subscription.status === 'active' ? 'paused' : 'active';
    try {
      const updatedSubscription = await updateSubscription(subscription.id!, {
        status: newStatus
      });
      
      if (updatedSubscription) {
        setSubscriptions(subscriptions.map(sub => 
          sub.id === subscription.id ? updatedSubscription : sub
        ));
      }
      
    } catch (error) {
      console.error('Error updating subscription status:', error);
      alert('Error updating subscription status. Please try again.');
    }
  };

  const getFilteredSubscriptions = () => {
    let filtered = [...subscriptions];
    
    // Apply filters
    if (filter === 'active') {
      filtered = filtered.filter(sub => sub.status === 'active');
    } else if (filter === 'cancelled') {
      filtered = filtered.filter(sub => sub.status === 'cancelled');
    } else if (filter === 'expiring-soon') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      filtered = filtered.filter(sub => {
        const nextBilling = new Date(sub.nextBillingDate);
        return nextBilling <= thirtyDaysFromNow && sub.status === 'active';
      });
    }
    
    // Apply sorting
    if (sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'amount') {
      filtered.sort((a, b) => b.amount - a.amount);
    } else if (sortBy === 'date') {
      filtered.sort((a, b) => {
        const dateA = new Date(a.nextBillingDate);
        const dateB = new Date(b.nextBillingDate);
        return dateA.getTime() - dateB.getTime();
      });
    }
    
    return filtered;
  };

  const getBillingDescription = (subscription: Subscription) => {
    switch (subscription.billingCycle) {
      case 'monthly':
        return 'Monthly';
      case 'quarterly':
        return 'Quarterly';
      case 'annually':
        return 'Annually';
      case 'custom':
        return subscription.customCycleDays ? `Every ${subscription.customCycleDays} days` : 'Custom';
      default:
        return 'Monthly';
    }
  };

  const getDaysUntilNextBilling = (nextBillingDate: string) => {
    const today = new Date();
    const nextDate = new Date(nextBillingDate);
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const renderSubscriptionIcon = (subscription: Subscription) => {
    if (subscription.icon) {
      if (subscription.icon.startsWith('data:')) {
        // For base64 data URLs, we need to keep using img tag
        // Next.js Image doesn't support data URLs well
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={subscription.icon} alt={subscription.name} className="w-full h-full object-cover rounded-md" />;
      } else {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={subscription.icon} alt={subscription.name} className="w-full h-full object-cover rounded-md" />;
      }
    }
    
    // Default icons based on category
    const iconMap: Record<string, string> = {
      'entertainment': '🎬',
      'streaming': '📺',
      'music': '🎵',
      'gaming': '🎮',
      'software': '💻',
      'cloud': '☁️',
      'news': '📰',
      'fitness': '💪',
      'education': '📚',
      'other': '📦'
    };
    
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-2xl rounded-md">
        {iconMap[subscription.category] || '📦'}
      </div>
    );
  };

  return (
    <div className={`p-4 min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/personal/finances"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              theme === 'dark' 
                ? 'text-gray-300 hover:bg-gray-800' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Finances
          </Link>
          <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>Subscription Manager</h1>
        </div>
        <button
          onClick={() => setShowAddSubscription(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Add Subscription
        </button>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`rounded-xl shadow p-4 ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
          <h3 className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Total Monthly Spend</h3>
          <p className="text-2xl font-bold mt-1">₹{totalMonthlySpend.toFixed(2)}</p>
        </div>
        <div className={`rounded-xl shadow p-4 ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
          <h3 className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Active Subscriptions</h3>
          <p className="text-2xl font-bold mt-1">
            {subscriptions.filter(s => s.status === 'active').length}
          </p>
        </div>
        <div className={`rounded-xl shadow p-4 ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
          <h3 className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Upcoming Renewals (30 days)</h3>
          <p className="text-2xl font-bold mt-1">
            {subscriptions.filter(s => {
              const daysUntil = getDaysUntilNextBilling(s.nextBillingDate);
              return daysUntil <= 30 && daysUntil >= 0 && s.status === 'active';
            }).length}
          </p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center">
          <label className={`mr-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Filter:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'active' | 'cancelled' | 'expiring-soon')}
            className={`rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-red-500 ${
              theme === 'dark' 
                ? 'bg-gray-700 text-white border border-gray-600' 
                : 'bg-white text-gray-800 border border-gray-300'
            }`}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="cancelled">Cancelled</option>
            <option value="expiring-soon">Due Soon</option>
          </select>
        </div>
        <div className="flex items-center">
          <label className={`mr-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'amount' | 'date')}
            className={`rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-red-500 ${
              theme === 'dark' 
                ? 'bg-gray-700 text-white border border-gray-600' 
                : 'bg-white text-gray-800 border border-gray-300'
            }`}
          >
            <option value="date">Next Billing Date</option>
            <option value="name">Name</option>
            <option value="amount">Amount</option>
          </select>
        </div>
      </div>

      {/* Subscription Cards */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
        </div>
      ) : getFilteredSubscriptions().length === 0 ? (
        <div className={`rounded-xl shadow p-8 text-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>No subscriptions found</p>
          <button
            onClick={() => setShowAddSubscription(true)}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
          >
            Add your first subscription
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {getFilteredSubscriptions().map(subscription => (
            <div key={subscription.id} className={`rounded-xl shadow overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`h-2 ${subscription.status === 'active' ? 'bg-green-500' : subscription.status === 'paused' ? 'bg-yellow-500' : 'bg-gray-400'}`}></div>
              <div className="p-4">
                <div className="flex gap-3">
                  <div className="w-14 h-14 rounded-md overflow-hidden flex-shrink-0">
                    {renderSubscriptionIcon(subscription)}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-lg ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>{subscription.name}</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{subscription.provider}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`font-bold text-lg ${theme === 'dark' ? 'text-gray-200' : ''}`}>₹{subscription.amount.toFixed(2)}</span>
                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getBillingDescription(subscription)}</span>
                  </div>
                </div>
                
                <div className={`mt-3 pt-3 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                  <div className="flex justify-between text-sm">
                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Next billing:</span>
                    <span className="font-medium">
                      {new Date(subscription.nextBillingDate).toLocaleDateString('en-IN', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </span>
                  </div>
                  
                  <div className="mt-1 flex justify-between text-sm">
                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Status:</span>
                    <span className={`font-medium ${
                      subscription.status === 'active' ? theme === 'dark' ? 'text-green-500' : 'text-green-600' : 
                      subscription.status === 'paused' ? theme === 'dark' ? 'text-yellow-500' : 'text-yellow-600' : 
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                    </span>
                  </div>
                  
                  {subscription.status === 'active' && (
                    <div className="mt-1 flex justify-between text-sm">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Days until billing:</span>
                      <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : ''}`}>
                        {getDaysUntilNextBilling(subscription.nextBillingDate)}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 flex justify-between">
                  <button 
                    onClick={() => handleToggleStatus(subscription)}
                    className={`px-3 py-1 rounded text-sm ${
                      theme === 'dark'
                        ? subscription.status === 'active'
                          ? 'bg-yellow-900 text-yellow-300 border border-yellow-700 hover:bg-yellow-800' 
                          : 'bg-green-900 text-green-300 border border-green-700 hover:bg-green-800'
                        : subscription.status === 'active' 
                          ? 'bg-yellow-50 text-yellow-700 border border-yellow-300 hover:bg-yellow-100' 
                          : 'bg-green-50 text-green-700 border border-green-300 hover:bg-green-100'
                    }`}
                  >
                    {subscription.status === 'active' ? 'Pause' : 'Activate'}
                  </button>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleEditSubscription(subscription)}
                      className={`px-3 py-1 rounded text-sm ${
                        theme === 'dark'
                          ? 'bg-blue-900 text-blue-300 border border-blue-700 hover:bg-blue-800'
                          : 'bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100'
                      }`}
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteSubscription(subscription.id!)}
                      className={`px-3 py-1 rounded text-sm ${
                        theme === 'dark'
                          ? 'bg-red-900 text-red-300 border border-red-700 hover:bg-red-800'
                          : 'bg-red-50 text-red-700 border border-red-300 hover:bg-red-100'
                      }`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Add Subscription Modal */}
      {showAddSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
            <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Add New Subscription</h2>
            <form onSubmit={handleAddSubscription}>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Subscription Name*</label>
                  <input
                    type="text"
                    required
                    value={subscriptionForm.name}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, name: e.target.value})}
                    className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                      theme === 'dark' 
                        ? 'bg-gray-700 text-white border border-gray-600' 
                        : 'bg-white text-gray-800 border border-gray-300'
                    }`}
                    placeholder="Netflix, Spotify, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
                  <input
                    type="text"
                    value={subscriptionForm.provider}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, provider: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Netflix, Inc."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={subscriptionForm.description}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Premium plan with 4K streaming"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount*</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={subscriptionForm.amount}
                      onChange={(e) => setSubscriptionForm({...subscriptionForm, amount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="199.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                    <select
                      value={subscriptionForm.currency}
                      onChange={(e) => setSubscriptionForm({...subscriptionForm, currency: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="INR">₹ INR</option>
                      <option value="USD">$ USD</option>
                      <option value="EUR">€ EUR</option>
                      <option value="GBP">£ GBP</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Billing Cycle</label>
                    <select
                      value={subscriptionForm.billingCycle}
                      onChange={(e) => setSubscriptionForm({...subscriptionForm, billingCycle: e.target.value as 'monthly' | 'quarterly' | 'annually' | 'custom'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annually">Annually</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  {subscriptionForm.billingCycle === 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Cycle Days</label>
                      <input
                        type="number"
                        value={subscriptionForm.customCycleDays}
                        onChange={(e) => setSubscriptionForm({...subscriptionForm, customCycleDays: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="15"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Next Billing Date</label>
                  <input
                    type="date"
                    value={subscriptionForm.nextBillingDate}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, nextBillingDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={subscriptionForm.category}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="entertainment">Entertainment</option>
                    <option value="streaming">Streaming</option>
                    <option value="music">Music</option>
                    <option value="gaming">Gaming</option>
                    <option value="software">Software</option>
                    <option value="cloud">Cloud Storage</option>
                    <option value="news">News</option>
                    <option value="fitness">Fitness</option>
                    <option value="education">Education</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload Icon</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={(e) => handleIconUpload(e)}
                    className="hidden"
                    id="icon-upload"
                  />
                  <div className="flex items-center space-x-4">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Choose File
                    </button>
                    {subscriptionForm.icon && (
                      <div className="w-12 h-12 rounded-md overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={subscriptionForm.icon} 
                          alt="Selected icon" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Auto Renewal</label>
                    <select
                      value={subscriptionForm.autoRenewal ? "true" : "false"}
                      onChange={(e) => setSubscriptionForm({...subscriptionForm, autoRenewal: e.target.value === "true"})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reminder (days)</label>
                    <input
                      type="number"
                      value={subscriptionForm.reminderDays}
                      onChange={(e) => setSubscriptionForm({...subscriptionForm, reminderDays: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="7"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={subscriptionForm.status}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, status: e.target.value as 'active' | 'cancelled' | 'paused'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={subscriptionForm.notes}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Additional notes"
                    rows={2}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddSubscription(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                  >
                    Add Subscription
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit Subscription Modal */}
      {showEditSubscription && editingSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Subscription</h2>
            <form onSubmit={handleUpdateSubscription}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subscription Name*</label>
                  <input
                    type="text"
                    required
                    value={editingSubscription.name}
                    onChange={(e) => setEditingSubscription({...editingSubscription, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
                  <input
                    type="text"
                    value={editingSubscription.provider}
                    onChange={(e) => setEditingSubscription({...editingSubscription, provider: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={editingSubscription.description || ''}
                    onChange={(e) => setEditingSubscription({...editingSubscription, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount*</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editingSubscription.amount}
                      onChange={(e) => setEditingSubscription({...editingSubscription, amount: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                    <select
                      value={editingSubscription.currency}
                      onChange={(e) => setEditingSubscription({...editingSubscription, currency: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="INR">₹ INR</option>
                      <option value="USD">$ USD</option>
                      <option value="EUR">€ EUR</option>
                      <option value="GBP">£ GBP</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Billing Cycle</label>
                    <select
                      value={editingSubscription.billingCycle}
                      onChange={(e) => setEditingSubscription({
                        ...editingSubscription, 
                        billingCycle: e.target.value as 'monthly' | 'quarterly' | 'annually' | 'custom'
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annually">Annually</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  {editingSubscription.billingCycle === 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Cycle Days</label>
                      <input
                        type="number"
                        value={editingSubscription.customCycleDays || ''}
                        onChange={(e) => setEditingSubscription({
                          ...editingSubscription, 
                          customCycleDays: e.target.value ? parseInt(e.target.value) : undefined
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Next Billing Date</label>
                  <input
                    type="date"
                    value={editingSubscription.nextBillingDate}
                    onChange={(e) => setEditingSubscription({...editingSubscription, nextBillingDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={editingSubscription.category}
                    onChange={(e) => setEditingSubscription({...editingSubscription, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="entertainment">Entertainment</option>
                    <option value="streaming">Streaming</option>
                    <option value="music">Music</option>
                    <option value="gaming">Gaming</option>
                    <option value="software">Software</option>
                    <option value="cloud">Cloud Storage</option>
                    <option value="news">News</option>
                    <option value="fitness">Fitness</option>
                    <option value="education">Education</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload Icon</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={(e) => handleIconUpload(e, true)}
                    className="hidden"
                    id="icon-upload-edit"
                  />
                  <div className="flex items-center space-x-4">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Choose File
                    </button>
                    {editingSubscription.icon && (
                      <div className="w-12 h-12 rounded-md overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={editingSubscription.icon} 
                          alt="Selected icon" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Auto Renewal</label>
                    <select
                      value={editingSubscription.autoRenewal ? "true" : "false"}
                      onChange={(e) => setEditingSubscription({...editingSubscription, autoRenewal: e.target.value === "true"})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reminder (days)</label>
                    <input
                      type="number"
                      value={editingSubscription.reminderDays}
                      onChange={(e) => setEditingSubscription({
                        ...editingSubscription, 
                        reminderDays: parseInt(e.target.value)
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={editingSubscription.status}
                    onChange={(e) => setEditingSubscription({
                      ...editingSubscription, 
                      status: e.target.value as 'active' | 'cancelled' | 'paused'
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={editingSubscription.notes || ''}
                    onChange={(e) => setEditingSubscription({...editingSubscription, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    rows={2}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditSubscription(false);
                      setEditingSubscription(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                  >
                    Update Subscription
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mt-8">
        <Link href="/personal/finances" className="text-red-600 hover:underline">
          ← Back to Finance Dashboard
        </Link>
      </div>
    </div>
  );
}
