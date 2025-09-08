'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTemplePlans } from '@/hooks/useTemplePlans';
import { TemplePlan } from '@/lib/types/temple';
import { TempleForm } from '@/components/temples/TempleForm';

export default function NewTemplePlanPage() {
  const router = useRouter();
  const { createPlan } = useTemplePlans();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (planData: Omit<TemplePlan, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const planId = await createPlan(planData);
      if (planId) {
        router.push(`/hub/travel/temples/${planId}`);
      } else {
        setError('Failed to create temple plan. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create temple plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Create New Temple Plan</h1>
        <p className="text-gray-600 mt-2">Plan your temple visit with detailed information and budget tracking</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <TempleForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
