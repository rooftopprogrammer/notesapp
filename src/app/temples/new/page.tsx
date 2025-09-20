'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTemplePlans } from '@/hooks/useTemplePlans';
import { TempleForm } from '@/components/temples/TempleForm';
import { TemplePlan } from '@/lib/types/temple';

export default function NewTemplePage() {
  const router = useRouter();
  const { user, loading, signInAnonymouslyIfNeeded } = useAuth();
  const { createPlan } = useTemplePlans();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: Omit<TemplePlan, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => {
    setIsSubmitting(true);
    
    try {
      // Ensure user is authenticated
      if (!user) {
        console.log('No user found, signing in anonymously...');
        await signInAnonymouslyIfNeeded();
        
        // Wait a moment for auth state to update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if we now have a user
        if (!user) {
          throw new Error('Authentication failed. Please check if anonymous authentication is enabled in Firebase Console.');
        }
      }
      
      console.log('Creating temple plan with user:', user?.uid);
      const planId = await createPlan(data);
      
      if (planId) {
        // Success - redirect to the temples list
        console.log('Temple plan created successfully:', planId);
        router.push('/temples');
      } else {
        // Handle error
        console.error('Failed to create temple plan');
        alert('Failed to create temple plan. Please try again.');
      }
    } catch (error) {
      console.error('Error creating temple plan:', error);
      if (error instanceof Error) {
        if (error.message.includes('admin-restricted-operation')) {
          alert('Authentication issue: Anonymous sign-in may be disabled. Please contact support.');
        } else {
          alert(`Failed to create temple plan: ${error.message}`);
        }
      } else {
        alert('Failed to create temple plan. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/temples');
  };

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 py-6">
            <button
              onClick={handleCancel}
              className="text-slate-400 hover:text-white p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Create New Temple Journey</h1>
              <p className="text-slate-400">Plan your spiritual visit and track your vows</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-slate-800 rounded-2xl border border-slate-700">
          <TempleForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
