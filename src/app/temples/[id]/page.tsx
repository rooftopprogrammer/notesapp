'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useTemplePlan } from '@/hooks/useTemplePlans';
import { TemplePlan } from '@/lib/types/temple';

// Tab components
const OverviewTab = ({ plan }: { plan: TemplePlan }) => {
  const getDaysUntilDue = () => {
    if (!plan.due?.value) return null;
    
    let dueDate: Date;
    
    if (plan.due.type === 'DATE') {
      dueDate = new Date(plan.due.value);
    } else if (plan.due.type === 'MONTH') {
      dueDate = new Date(plan.due.value);
    } else {
      dueDate = new Date(plan.due.value, 0, 1);
    }
    
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const daysUntilDue = getDaysUntilDue();
  const budgetProgress = plan.budget?.planned > 0 ? (plan.budget.savedSoFar / plan.budget.planned) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Temple Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Temple Information</h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Temple Name</dt>
            <dd className="text-sm text-gray-900 mt-1">{plan.templeName}</dd>
          </div>
          {plan.deity && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Deity</dt>
              <dd className="text-sm text-gray-900 mt-1">{plan.deity}</dd>
            </div>
          )}
          {plan.address && (
            <div className="md:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Address</dt>
              <dd className="text-sm text-gray-900 mt-1">{plan.address}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Vow Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Vow Information</h3>
        <div className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Reason for Vow</dt>
            <dd className="text-sm text-gray-900 mt-1">{plan.vowReason}</dd>
          </div>
          
          {plan.vowMadeOn && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Vow Made On</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {new Date(plan.vowMadeOn).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Due</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {plan.due.type === 'DATE' && new Date(plan.due.value).toLocaleDateString()}
                  {plan.due.type === 'MONTH' && new Date(plan.due.value).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                  {plan.due.type === 'YEAR' && plan.due.value}
                  {daysUntilDue !== null && (
                    <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                      daysUntilDue < 0 ? 'bg-red-100 text-red-800' :
                      daysUntilDue < 30 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` :
                       daysUntilDue === 0 ? 'Due today' :
                       `${daysUntilDue} days remaining`}
                    </span>
                  )}
                </dd>
              </div>
            </div>
          )}

          {plan.targetVisitDate && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Target Visit Date</dt>
              <dd className="text-sm text-gray-900 mt-1">
                {new Date(plan.targetVisitDate).toLocaleDateString()}
              </dd>
            </div>
          )}
        </div>
      </div>

      {/* Budget Progress */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Progress</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Saved</span>
            <span className="text-sm font-medium">₹{plan.budget?.savedSoFar?.toLocaleString() || '0'} / ₹{plan.budget?.planned?.toLocaleString() || '0'}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${Math.min(budgetProgress, 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 text-center">
            {budgetProgress.toFixed(1)}% saved
            {plan.budget && plan.budget.planned > plan.budget.savedSoFar && (
              <span className="ml-2">
                (₹{(plan.budget.planned - plan.budget.savedSoFar).toLocaleString()} remaining)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Travel Information */}
      {(plan.soloOrGroup || plan.transportMode || plan.companions) && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Travel Information</h3>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plan.soloOrGroup && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Travel Type</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {plan.soloOrGroup === 'SOLO' ? 'Solo Trip' : 'Group Trip'}
                </dd>
              </div>
            )}
            {plan.transportMode && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Transport</dt>
                <dd className="text-sm text-gray-900 mt-1 capitalize">{plan.transportMode.toLowerCase()}</dd>
              </div>
            )}
            {plan.companions && plan.companions.length > 0 && (
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Companions</dt>
                <dd className="text-sm text-gray-900 mt-1">{plan.companions.join(', ')}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Checklist */}
      {plan.checklist && plan.checklist.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pre-Visit Checklist</h3>
          <ul className="space-y-2">
            {plan.checklist.map((item: string, index: number) => (
              <li key={index} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={false}
                  readOnly
                  className="w-4 h-4 text-blue-600 rounded border-gray-300"
                />
                <span className="text-sm text-gray-900">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status</h3>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            plan.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
            plan.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
            plan.status === 'PLANNED' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {plan.status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
          </span>
          {plan.status === 'COMPLETED' && plan.lastVisit?.visitedOn && (
            <span className="text-sm text-gray-500">
              on {new Date(plan.lastVisit.visitedOn).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const ExpensesTab = ({ plan }: { plan: TemplePlan }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Expenses</h3>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
          Add Expense
        </button>
      </div>
      
      <div className="text-center text-gray-500 py-8">
        <p>No expenses recorded yet.</p>
        <p className="text-sm mt-1">Track your temple visit expenses here.</p>
      </div>
    </div>
  );
};

const MediaTab = ({ plan }: { plan: TemplePlan }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Media</h3>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
          Upload Media
        </button>
      </div>
      
      <div className="text-center text-gray-500 py-8">
        <p>No photos or videos uploaded yet.</p>
        <p className="text-sm mt-1">Share your temple visit memories here.</p>
      </div>
    </div>
  );
};

const NotesTab = ({ plan }: { plan: TemplePlan }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
      
      <div className="space-y-4">
        {plan.lastVisit?.experience && (
          <div>
            <h4 className="font-medium text-gray-900">Visit Experience</h4>
            <p className="text-gray-700 mt-1">{plan.lastVisit.experience}</p>
          </div>
        )}
        
        {!plan.lastVisit?.experience && (
          <div className="text-center text-gray-500 py-8">
            <p>No notes added yet.</p>
            <p className="text-sm mt-1">Add your thoughts and reflections here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default function TemplePlanDetail() {
  const router = useRouter();
  const params = useParams();
  const planId = params.id as string;
  
  const { plan, loading, error } = useTemplePlan(planId);
  const [activeTab, setActiveTab] = useState('overview');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading temple plan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading temple plan</p>
          <button
            onClick={() => router.push('/temples')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Temples
          </button>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Temple plan not found</p>
          <button
            onClick={() => router.push('/temples')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Temples
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'media', label: 'Media' },
    { id: 'notes', label: 'Notes' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/temples')}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{plan.templeName}</h1>
                {plan.deity && (
                  <p className="text-gray-600">Deity: {plan.deity}</p>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/temples/${planId}/edit`)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Edit
              </button>
              {plan.status !== 'COMPLETED' && (
                <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                  Mark as Visited
                </button>
              )}
            </div>
          </div>
          
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <OverviewTab plan={plan} />}
        {activeTab === 'expenses' && <ExpensesTab plan={plan} />}
        {activeTab === 'media' && <MediaTab plan={plan} />}
        {activeTab === 'notes' && <NotesTab plan={plan} />}
      </div>
    </div>
  );
}
