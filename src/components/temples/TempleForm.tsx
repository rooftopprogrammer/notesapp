'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TemplePlan, DueType } from '@/lib/types/temple';

// Form validation schema - matches form inputs
const templeFormSchema = z.object({
  templeName: z.string().min(1, 'Temple name is required'),
  deity: z.string().optional(),
  address: z.string().optional(),
  vowReason: z.string().min(1, 'Vow reason is required'),
  vowMadeOn: z.string().optional(),
  dueType: z.enum(['DATE', 'MONTH', 'YEAR']),
  dueValue: z.string().min(1, 'Due date is required'),
  targetVisitDate: z.string().optional(),
  soloOrGroup: z.enum(['SOLO', 'GROUP']),
  companions: z.string().optional(),
  transportMode: z.enum(['CAR', 'BIKE', 'BUS', 'TRAIN', 'FLIGHT', 'WALK', 'OTHER']),
  routeStartLabel: z.string().optional(),
  routeWaypointNotes: z.string().optional(),
  hotelName: z.string().optional(),
  hotelAddress: z.string().optional(),
  stayNotes: z.string().optional(),
  plannedBudget: z.number().min(0, 'Budget must be positive').optional(),
  savedSoFar: z.number().min(0, 'Saved amount must be positive').optional(),
  tags: z.string().optional(),
});

type FormData = z.infer<typeof templeFormSchema>;

interface TempleFormProps {
  plan?: TemplePlan;
  onSubmit: (data: Omit<TemplePlan, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const TempleForm = ({ plan, onSubmit, onCancel, isSubmitting = false }: TempleFormProps) => {
  const [checklistItems, setChecklistItems] = useState<string[]>(plan?.checklist || []);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<FormData>({
    resolver: zodResolver(templeFormSchema),
    defaultValues: plan ? {
      templeName: plan.templeName,
      deity: plan.deity || '',
      address: plan.address || '',
      vowReason: plan.vowReason,
      vowMadeOn: plan.vowMadeOn ? new Date(plan.vowMadeOn).toISOString().split('T')[0] : '',
      dueType: plan.due.type,
      dueValue: formatDueValueForForm(plan.due),
      targetVisitDate: plan.targetVisitDate ? new Date(plan.targetVisitDate).toISOString().split('T')[0] : '',
      soloOrGroup: plan.soloOrGroup,
      companions: plan.companions?.join(', ') || '',
      transportMode: plan.transportMode,
      routeStartLabel: plan.routeMap?.startLabel || '',
      routeWaypointNotes: plan.routeMap?.waypointNotes || '',
      hotelName: plan.stayPlan?.hotelName || '',
      hotelAddress: plan.stayPlan?.address || '',
      stayNotes: plan.stayPlan?.notes || '',
      plannedBudget: plan.budget.planned,
      savedSoFar: plan.budget.savedSoFar,
      tags: plan.tags?.join(', ') || '',
    } : {
      templeName: '',
      deity: '',
      address: '',
      vowReason: '',
      vowMadeOn: '',
      dueType: 'DATE' as const,
      dueValue: '',
      targetVisitDate: '',
      soloOrGroup: 'SOLO' as const,
      companions: '',
      transportMode: 'CAR' as const,
      routeStartLabel: '',
      routeWaypointNotes: '',
      hotelName: '',
      hotelAddress: '',
      stayNotes: '',
      plannedBudget: 0,
      savedSoFar: 0,
      tags: '',
    }
  });

  const dueType = watch('dueType');

  // Add checklist item
  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setChecklistItems([...checklistItems, newChecklistItem.trim()]);
      setNewChecklistItem('');
    }
  };

  // Remove checklist item
  const removeChecklistItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  const onFormSubmit = (data: FormData) => {
    // Parse due value based on type
    let dueValue: number;
    if (data.dueType === 'DATE') {
      dueValue = new Date(data.dueValue).getTime();
    } else if (data.dueType === 'MONTH') {
      const [year, month] = data.dueValue.split('-').map(Number);
      dueValue = year * 100 + month;
    } else {
      dueValue = parseInt(data.dueValue);
    }

    // Transform form data to TemplePlan format
    const planData: Omit<TemplePlan, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'> = {
      status: 'PLANNED',
      templeName: data.templeName,
      deity: data.deity || undefined,
      address: data.address || undefined,
      vowReason: data.vowReason,
      vowMadeOn: data.vowMadeOn ? new Date(data.vowMadeOn).getTime() : undefined,
      due: { type: data.dueType, value: dueValue },
      targetVisitDate: data.targetVisitDate ? new Date(data.targetVisitDate).getTime() : undefined,
      soloOrGroup: data.soloOrGroup,
      companions: data.companions ? data.companions.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      transportMode: data.transportMode,
      routeMap: {
        startLabel: data.routeStartLabel || undefined,
        waypointNotes: data.routeWaypointNotes || undefined,
      },
      stayPlan: {
        hotelName: data.hotelName || undefined,
        address: data.hotelAddress || undefined,
        notes: data.stayNotes || undefined,
      },
      checklist: checklistItems.length > 0 ? checklistItems : undefined,
      budget: {
        planned: data.plannedBudget || 0,
        savedSoFar: data.savedSoFar || 0,
      },
      tags: data.tags ? data.tags.split(',').map(s => s.trim()).filter(Boolean) : undefined,
    };

    onSubmit(planData);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-8 p-6">
      {/* Temple Information */}
      <div className="bg-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          🏛️ Temple & Vow Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Temple Name *
            </label>
            <input
              {...register('templeName')}
              type="text"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              placeholder="Enter temple name"
            />
            {errors.templeName && (
              <p className="text-red-400 text-sm mt-2">{errors.templeName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Deity
            </label>
            <input
              {...register('deity')}
              type="text"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              placeholder="Primary deity"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Address
            </label>
            <textarea
              {...register('address')}
              rows={2}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              placeholder="Temple address"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Vow/Reason *
            </label>
            <textarea
              {...register('vowReason')}
              rows={3}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              placeholder="Why did you make this vow? What was promised?"
            />
            {errors.vowReason && (
              <p className="text-red-400 text-sm mt-2">{errors.vowReason.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Vow Made On
            </label>
            <input
              {...register('vowMadeOn')}
              type="date"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Due Type *
            </label>
            <select
              {...register('dueType')}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            >
              <option value="DATE">Specific Date</option>
              <option value="MONTH">By Month</option>
              <option value="YEAR">By Year</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Due {dueType === 'DATE' ? 'Date' : dueType === 'MONTH' ? 'Month' : 'Year'} *
            </label>
            <input
              {...register('dueValue')}
              type={dueType === 'DATE' ? 'date' : dueType === 'MONTH' ? 'month' : 'number'}
              min={dueType === 'YEAR' ? new Date().getFullYear() : undefined}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            />
            {errors.dueValue && (
              <p className="text-red-400 text-sm mt-2">{errors.dueValue.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Target Visit Date
            </label>
            <input
              {...register('targetVisitDate')}
              type="date"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Travel Information */}
      <div className="bg-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          ✈️ Travel Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Travel Type
            </label>
            <select
              {...register('soloOrGroup')}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            >
              <option value="SOLO">Solo Trip</option>
              <option value="GROUP">Group Trip</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Transport Mode
            </label>
            <select
              {...register('transportMode')}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            >
              <option value="CAR">Car</option>
              <option value="BIKE">Bike</option>
              <option value="BUS">Bus</option>
              <option value="TRAIN">Train</option>
              <option value="FLIGHT">Flight</option>
              <option value="WALK">Walk</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Companions (comma-separated)
            </label>
            <input
              {...register('companions')}
              type="text"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              placeholder="Names of people joining you"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Starting Point
            </label>
            <input
              {...register('routeStartLabel')}
              type="text"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              placeholder="Your starting location"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Route Notes
            </label>
            <input
              {...register('routeWaypointNotes')}
              type="text"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              placeholder="Any stops or route preferences"
            />
          </div>
        </div>
      </div>

      {/* Stay Information */}
      <div className="bg-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          🏨 Stay Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Hotel Name
            </label>
            <input
              {...register('hotelName')}
              type="text"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              placeholder="Where you plan to stay"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Hotel Address
            </label>
            <input
              {...register('hotelAddress')}
              type="text"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              placeholder="Hotel location"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Stay Notes
            </label>
            <textarea
              {...register('stayNotes')}
              rows={2}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              placeholder="Any specific requirements or preferences"
            />
          </div>
        </div>
      </div>

      {/* Budget Information */}
      <div className="bg-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          💰 Budget Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Planned Budget (₹)
            </label>
            <input
              {...register('plannedBudget', { valueAsNumber: true })}
              type="number"
              min="0"
              step="1"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              placeholder="0"
            />
            {errors.plannedBudget && (
              <p className="text-red-400 text-sm mt-2">{errors.plannedBudget.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Saved So Far (₹)
            </label>
            <input
              {...register('savedSoFar', { valueAsNumber: true })}
              type="number"
              min="0"
              step="1"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              placeholder="0"
            />
            {errors.savedSoFar && (
              <p className="text-red-400 text-sm mt-2">{errors.savedSoFar.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          📋 Pre-Visit Checklist
        </h2>
        
        <div className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newChecklistItem}
              onChange={(e) => setNewChecklistItem(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
              className="flex-1 px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              placeholder="Add checklist item..."
            />
            <button
              type="button"
              onClick={addChecklistItem}
              className="px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {checklistItems.length > 0 && (
          <ul className="space-y-2">
            {checklistItems.map((item, index) => (
              <li key={index} className="flex items-center gap-2 p-3 bg-slate-800 rounded-lg">
                <span className="flex-1 text-slate-200">{item}</span>
                <button
                  type="button"
                  onClick={() => removeChecklistItem(index)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1 rounded"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tags */}
      <div className="bg-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          🏷️ Tags
        </h2>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Tags (comma-separated)
          </label>
          <input
            {...register('tags')}
            type="text"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            placeholder="e.g., Andhra, Hill temple, Famous"
          />
          <p className="text-sm text-slate-400 mt-2">
            Add tags to help categorize and filter your temple plans
          </p>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-6 py-3 border border-slate-600 text-slate-300 bg-slate-800 rounded-lg hover:bg-slate-700 hover:text-white disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Saving...' : plan ? 'Update Plan' : 'Create Plan'}
        </button>
      </div>
    </form>
  );
};

// Helper function to format due value for form input
function formatDueValueForForm(due: { type: DueType; value: number }): string {
  switch (due.type) {
    case 'DATE':
      return new Date(due.value).toISOString().split('T')[0];
    case 'MONTH':
      const year = Math.floor(due.value / 100);
      const month = (due.value % 100).toString().padStart(2, '0');
      return `${year}-${month}`;
    case 'YEAR':
      return due.value.toString();
    default:
      return '';
  }
}
