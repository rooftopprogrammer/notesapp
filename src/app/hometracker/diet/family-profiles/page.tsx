'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FamilyMember } from '@/lib/types/diet-tracker';
import { familyMemberService } from '@/lib/firebase/diet-tracker';
import { validateFamilyMember } from '@/lib/utils/diet-tracker-utils';

interface FamilyMemberForm {
  name: string;
  role: FamilyMember['role'] | '';
  age: number;
  medicalConditions: string[];
  dietaryRestrictions: string[];
  portionMultiplier: number;
  waterIntakeTarget: number;
  oilLimit: number;
  preferences: {
    favoriteFruits: string[];
    dislikedFoods: string[];
    allergies: string[];
  };
}

const initialForm: FamilyMemberForm = {
  name: '',
  role: '',
  age: 25,
  medicalConditions: [],
  dietaryRestrictions: [],
  portionMultiplier: 1.0,
  waterIntakeTarget: 3.0,
  oilLimit: 4,
  preferences: {
    favoriteFruits: [],
    dislikedFoods: [],
    allergies: []
  }
};

const ROLE_OPTIONS: { value: FamilyMember['role']; label: string; description: string }[] = [
  { value: 'ravi', label: 'Ravi', description: 'Thyroid condition, 4 tsp oil limit' },
  { value: 'father', label: 'Father', description: '4 tsp oil limit, prefers guava' },
  { value: 'mother', label: 'Mother', description: 'Thyroid condition, 4 tsp oil limit' },
  { value: 'brother', label: 'Brother', description: '4 tsp oil limit, higher portions' },
  { value: 'wife_bf', label: 'Wife (Breastfeeding)', description: '5 tsp oil limit, special nutrition needs' },
  { value: 'pregnant_sil', label: 'Pregnant Sister-in-law', description: '5 tsp oil limit, pregnancy nutrition' }
];

const MEDICAL_CONDITIONS = [
  'Thyroid',
  'Diabetes',
  'Hypertension',
  'Heart Disease',
  'Kidney Disease',
  'Liver Disease',
  'Anemia',
  'High Cholesterol',
  'Pregnancy',
  'Breastfeeding'
];

const DIETARY_RESTRICTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-free',
  'Lactose intolerant',
  'Low sodium',
  'Low sugar',
  'Nut allergy',
  'Seafood allergy',
  'Egg allergy'
];

export default function FamilyProfilesPage() {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [formData, setFormData] = useState<FamilyMemberForm>(initialForm);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadFamilyMembers();
  }, []);

  const loadFamilyMembers = async () => {
    setIsLoading(true);
    const response = await familyMemberService.getAll();
    if (response.success && response.data) {
      setFamilyMembers(response.data);
    }
    setIsLoading(false);
  };

  const handleCreateNew = () => {
    setEditingMember(null);
    setFormData(initialForm);
    setShowForm(true);
    setErrors([]);
  };

  const handleEdit = (member: FamilyMember) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      role: member.role,
      age: member.age,
      medicalConditions: member.medicalConditions,
      dietaryRestrictions: member.dietaryRestrictions,
      portionMultiplier: member.portionMultiplier,
      waterIntakeTarget: member.waterIntakeTarget,
      oilLimit: member.oilLimit,
      preferences: member.preferences
    });
    setShowForm(true);
    setErrors([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.role) {
      setErrors(['Please select a family member role']);
      return;
    }

    const memberData = {
      ...formData,
      role: formData.role as FamilyMember['role']
    };

    const validationErrors = validateFamilyMember(memberData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      if (editingMember) {
        const response = await familyMemberService.update(editingMember.id, memberData);
        if (response.success) {
          await loadFamilyMembers();
          setShowForm(false);
        } else {
          setErrors([response.error?.message || 'Failed to update family member']);
        }
      } else {
        const response = await familyMemberService.create(memberData);
        if (response.success) {
          await loadFamilyMembers();
          setShowForm(false);
        } else {
          setErrors([response.error?.message || 'Failed to create family member']);
        }
      }
    } catch (err) {
      console.error('Error saving family member:', err);
      setErrors(['An unexpected error occurred']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (member: FamilyMember) => {
    if (confirm(`Are you sure you want to delete ${member.name}? This action cannot be undone.`)) {
      const response = await familyMemberService.delete(member.id);
      if (response.success) {
        await loadFamilyMembers();
      } else {
        alert('Failed to delete family member');
      }
    }
  };

  // Utility functions for managing lists (for future use with custom inputs)
  // const addToList = (list: string[], value: string, setter: (list: string[]) => void) => {
  //   if (value.trim() && !list.includes(value.trim())) {
  //     setter([...list, value.trim()]);
  //   }
  // };

  // const removeFromList = (list: string[], value: string, setter: (list: string[]) => void) => {
  //   setter(list.filter(item => item !== value));
  // };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <span className="text-2xl">👥</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Family Profiles
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage family member information and dietary requirements
              </p>
            </div>
          </div>

          {/* Back Button */}
          <div className="mb-6">
            <Link
              href="/hometracker/diet"
              className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Family Diet Tracker
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading family members...</p>
          </div>
        ) : (
          <>
            {/* Family Members Grid */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Family Members ({familyMembers.length})
                </h2>
                <button
                  onClick={handleCreateNew}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Family Member
                </button>
              </div>

              {familyMembers.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <span className="text-2xl">👥</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No family members added
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Add family members to start personalizing diet plans
                  </p>
                  <button
                    onClick={handleCreateNew}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Add First Family Member
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {familyMembers.map((member) => (
                    <div
                      key={member.id}
                      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                            <span className="text-xl">
                              {member.role === 'father' ? '👨' : 
                               member.role === 'mother' ? '👩' : 
                               member.role === 'brother' ? '👦' : 
                               member.role === 'wife_bf' ? '🤱' : 
                               member.role === 'pregnant_sil' ? '🤰' : '👤'}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {member.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                              {member.role.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(member)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(member)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Water Target:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {member.waterIntakeTarget}L
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Oil Limit:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {member.oilLimit} tsp
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Portion Size:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {(member.portionMultiplier * 100).toFixed(0)}%
                          </span>
                        </div>

                        {member.medicalConditions.length > 0 && (
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Medical:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {member.medicalConditions.map((condition) => (
                                <span
                                  key={condition}
                                  className="px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs rounded"
                                >
                                  {condition}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {member.dietaryRestrictions.length > 0 && (
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Dietary:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {member.dietaryRestrictions.map((restriction) => (
                                <span
                                  key={restriction}
                                  className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 text-xs rounded"
                                >
                                  {restriction}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Family Member Form Modal */}
            {showForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {editingMember ? 'Edit Family Member' : 'Add New Family Member'}
                      </h3>
                      <button
                        onClick={() => setShowForm(false)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {errors.length > 0 && (
                      <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                        <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                          Please fix the following errors:
                        </h4>
                        <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                          {errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Basic Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Name *
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Enter name"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Age
                          </label>
                          <input
                            type="number"
                            value={formData.age}
                            onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            min="1"
                            max="120"
                          />
                        </div>
                      </div>

                      {/* Role Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Family Role *
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {ROLE_OPTIONS.map((option) => (
                            <label
                              key={option.value}
                              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                                formData.role === option.value
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                              }`}
                            >
                              <input
                                type="radio"
                                value={option.value}
                                checked={formData.role === option.value}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value as FamilyMember['role'] })}
                                className="sr-only"
                              />
                              <div className="font-medium text-gray-900 dark:text-white">
                                {option.label}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {option.description}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Dietary Settings */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Water Target (L)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={formData.waterIntakeTarget}
                            onChange={(e) => setFormData({ ...formData, waterIntakeTarget: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            min="1"
                            max="6"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Oil Limit (tsp)
                          </label>
                          <input
                            type="number"
                            value={formData.oilLimit}
                            onChange={(e) => setFormData({ ...formData, oilLimit: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            min="1"
                            max="10"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Portion Size (%)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={formData.portionMultiplier * 100}
                            onChange={(e) => setFormData({ ...formData, portionMultiplier: (parseFloat(e.target.value) || 100) / 100 })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            min="50"
                            max="200"
                          />
                        </div>
                      </div>

                      {/* Medical Conditions */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Medical Conditions
                        </label>
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {MEDICAL_CONDITIONS.map((condition) => (
                              <label
                                key={condition}
                                className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={formData.medicalConditions.includes(condition)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormData({
                                        ...formData,
                                        medicalConditions: [...formData.medicalConditions, condition]
                                      });
                                    } else {
                                      setFormData({
                                        ...formData,
                                        medicalConditions: formData.medicalConditions.filter(c => c !== condition)
                                      });
                                    }
                                  }}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  {condition}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Dietary Restrictions */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Dietary Restrictions
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {DIETARY_RESTRICTIONS.map((restriction) => (
                            <label
                              key={restriction}
                              className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={formData.dietaryRestrictions.includes(restriction)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({
                                      ...formData,
                                      dietaryRestrictions: [...formData.dietaryRestrictions, restriction]
                                    });
                                  } else {
                                    setFormData({
                                      ...formData,
                                      dietaryRestrictions: formData.dietaryRestrictions.filter(r => r !== restriction)
                                    });
                                  }
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {restriction}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Form Actions */}
                      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-600">
                        <button
                          type="button"
                          onClick={() => setShowForm(false)}
                          className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
                        >
                          {isSubmitting ? 'Saving...' : editingMember ? 'Update Member' : 'Add Member'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}