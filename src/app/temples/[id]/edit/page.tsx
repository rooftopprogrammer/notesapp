'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useTemplePlan, useTemplePlans } from '@/hooks/useTemplePlans';
import { TempleForm } from '@/components/temples/TempleForm';
import { TemplePlan } from '@/lib/types/temple';

export default function EditTemplePage() {
  const router = useRouter();
  const params = useParams();
  const planId = params.id as string;
  
  const { plan, loading, error } = useTemplePlan(planId);
  const { updatePlan } = useTemplePlans();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: Omit<TemplePlan, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => {
    setIsSubmitting(true);
    
    try {
      const success = await updatePlan(planId, data);
      
      if (success) {
        // Success - redirect to the plan detail page
        router.push(`/temples/${planId}`);
      } else {
        // Handle error
        alert('Failed to update temple plan. Please try again.');
      }
    } catch (error) {
      console.error('Error updating temple plan:', error);
      alert('Failed to update temple plan. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/temples/${planId}`);
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 py-6">
            <button
              onClick={handleCancel}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Temple Plan</h1>
              <p className="text-gray-600">Update your temple visit plan</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TempleForm
          plan={plan}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}
