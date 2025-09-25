'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Edit3, Trash2, Calendar, TrendingUp, TrendingDown, Minus, Save, X, User, Scale } from 'lucide-react';
import { db } from '@/lib/firebase';
import toast, { Toaster } from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  orderBy, 
  query, 
  where,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';

interface FamilyMember {
  id: string;
  name: string;
  birthDate: string;
  gender: 'male' | 'female' | 'other';
  height: number; // in cm
  targetWeight?: number;
  createdAt: Timestamp;
}

interface WeightEntry {
  id: string;
  memberId: string;
  memberName: string;
  weight: number; // in kg
  bmi?: number;
  date: string; // YYYY-MM-DD format for Sunday dates
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export default function WeightTracker() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isAddingWeight, setIsAddingWeight] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WeightEntry | null>(null);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(getNextSunday());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Member form state
  const [memberForm, setMemberForm] = useState({
    name: '',
    birthDate: '',
    gender: 'male' as 'male' | 'female' | 'other',
    height: '',
    targetWeight: ''
  });

  // Weight form state
  const [weightForm, setWeightForm] = useState({
    memberId: '',
    weight: '',
    notes: ''
  });

  function getNextSunday(): string {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    return nextSunday.toISOString().split('T')[0];
  }

  function calculateBMI(weight: number, height: number): number {
    const heightInMeters = height / 100;
    return Number((weight / (heightInMeters * heightInMeters)).toFixed(1));
  }

  function getWeightChange(entries: WeightEntry[], memberId: string, weeks: number): { change: number; percentage: number } {
    const memberEntries = entries
      .filter(entry => entry.memberId === memberId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (memberEntries.length < 2) return { change: 0, percentage: 0 };

    const latest = memberEntries[0];
    const comparison = memberEntries.find((_, index) => index >= weeks - 1) || memberEntries[memberEntries.length - 1];
    
    const change = Number((latest.weight - comparison.weight).toFixed(1));
    const percentage = Number(((change / comparison.weight) * 100).toFixed(1));
    
    return { change, percentage };
  }

  // Load family members
  useEffect(() => {
    const q = query(collection(db, 'familyMembers'), orderBy('name'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const membersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FamilyMember[];
      setMembers(membersData);
    });

    return () => unsubscribe();
  }, []);

  // Load weight entries
  useEffect(() => {
    const q = query(collection(db, 'weightEntries'), orderBy('date', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WeightEntry[];
      setWeightEntries(entriesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddMember = async () => {
    if (!memberForm.name.trim() || !memberForm.height) {
      toast.error('Please fill in name and height');
      return;
    }

    try {
      await addDoc(collection(db, 'familyMembers'), {
        name: memberForm.name.trim(),
        birthDate: memberForm.birthDate,
        gender: memberForm.gender,
        height: Number(memberForm.height),
        targetWeight: memberForm.targetWeight ? Number(memberForm.targetWeight) : null,
        createdAt: serverTimestamp()
      });
      
      setMemberForm({
        name: '',
        birthDate: '',
        gender: 'male',
        height: '',
        targetWeight: ''
      });
      setIsAddingMember(false);
      toast.success('Family member added successfully!');
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Failed to add family member');
    }
  };

  const handleAddWeight = async () => {
    if (!weightForm.memberId || !weightForm.weight) {
      toast.error('Please select member and enter weight');
      return;
    }

    const member = members.find(m => m.id === weightForm.memberId);
    if (!member) {
      toast.error('Member not found');
      return;
    }

    const weight = Number(weightForm.weight);
    const bmi = calculateBMI(weight, member.height);

    try {
      if (editingEntry) {
        await updateDoc(doc(db, 'weightEntries', editingEntry.id), {
          weight,
          bmi,
          notes: weightForm.notes.trim() || null,
          updatedAt: serverTimestamp()
        });
        toast.success('Weight entry updated successfully!');
      } else {
        await addDoc(collection(db, 'weightEntries'), {
          memberId: weightForm.memberId,
          memberName: member.name,
          weight,
          bmi,
          date: selectedDate,
          notes: weightForm.notes.trim() || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast.success('Weight entry added successfully!');
      }
      
      setWeightForm({
        memberId: '',
        weight: '',
        notes: ''
      });
      setIsAddingWeight(false);
      setEditingEntry(null);
    } catch (error) {
      console.error('Error saving weight entry:', error);
      toast.error('Failed to save weight entry');
    }
  };

  const handleEditWeight = (entry: WeightEntry) => {
    setEditingEntry(entry);
    setWeightForm({
      memberId: entry.memberId,
      weight: entry.weight.toString(),
      notes: entry.notes || ''
    });
    setSelectedDate(entry.date);
    setIsAddingWeight(true);
  };

  const handleDeleteWeight = async (id: string) => {
    if (confirm('Are you sure you want to delete this weight entry?')) {
      setDeletingId(id);
      try {
        await deleteDoc(doc(db, 'weightEntries', id));
        toast.success('Weight entry deleted successfully!');
      } catch (error) {
        console.error('Error deleting weight entry:', error);
        toast.error('Failed to delete weight entry');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleCancel = () => {
    setIsAddingMember(false);
    setIsAddingWeight(false);
    setEditingEntry(null);
    setMemberForm({
      name: '',
      birthDate: '',
      gender: 'male',
      height: '',
      targetWeight: ''
    });
    setWeightForm({
      memberId: '',
      weight: '',
      notes: ''
    });
  };

  const getMemberWeightData = (memberId: string) => {
    return weightEntries
      .filter(entry => entry.memberId === memberId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(entry => ({
        date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        weight: entry.weight,
        bmi: entry.bmi
      }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading weight tracker...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
              <span className="text-2xl">⚖️</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Family Weight Tracker
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Track weekly weight progress for all family members
              </p>
            </div>
          </div>

          <Link
            href="/hometracker"
            className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home Tracker
          </Link>
        </div>

        {/* Action Buttons */}
        <div className="mb-8 flex gap-4">
          <button
            onClick={() => setIsAddingMember(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
          >
            <User className="w-5 h-5" />
            Add Family Member
          </button>
          
          <button
            onClick={() => setIsAddingWeight(true)}
            disabled={members.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            <Scale className="w-5 h-5" />
            Add Weight Entry
          </button>
        </div>

        {/* Add Member Form */}
        {isAddingMember && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Add Family Member
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={memberForm.name}
                  onChange={(e) => setMemberForm({...memberForm, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Birth Date
                </label>
                <input
                  type="date"
                  value={memberForm.birthDate}
                  onChange={(e) => setMemberForm({...memberForm, birthDate: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gender
                </label>
                <select
                  value={memberForm.gender}
                  onChange={(e) => setMemberForm({...memberForm, gender: e.target.value as 'male' | 'female' | 'other'})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Height (cm) *
                </label>
                <input
                  type="number"
                  value={memberForm.height}
                  onChange={(e) => setMemberForm({...memberForm, height: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={memberForm.targetWeight}
                  onChange={(e) => setMemberForm({...memberForm, targetWeight: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddMember}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Member
              </button>
              
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Add Weight Form */}
        {isAddingWeight && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {editingEntry ? 'Edit Weight Entry' : 'Add Weight Entry'}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Family Member *
                </label>
                <select
                  value={weightForm.memberId}
                  onChange={(e) => setWeightForm({...weightForm, memberId: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select member...</option>
                  {members.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Weight (kg) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={weightForm.weight}
                  onChange={(e) => setWeightForm({...weightForm, weight: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date (Sunday) *
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={weightForm.notes}
                  onChange={(e) => setWeightForm({...weightForm, notes: e.target.value})}
                  placeholder="Any additional notes..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddWeight}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                {editingEntry ? 'Update Entry' : 'Save Entry'}
              </button>
              
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Family Members Overview */}
        {members.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {members.map((member) => {
              const memberEntries = weightEntries.filter(entry => entry.memberId === member.id);
              const latestEntry = memberEntries
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
              
              const weekChange = getWeightChange(weightEntries, member.id, 2);
              const monthChange = getWeightChange(weightEntries, member.id, 5);
              
              return (
                <div key={member.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{member.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Height: {member.height}cm</p>
                    </div>
                  </div>
                  
                  {latestEntry ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Current Weight:</span>
                        <span className="font-semibold text-lg text-gray-900 dark:text-white">
                          {latestEntry.weight} kg
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">BMI:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {latestEntry.bmi}
                        </span>
                      </div>
                      
                      {weekChange.change !== 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Week Change:</span>
                          <div className="flex items-center gap-1">
                            {weekChange.change > 0 ? (
                              <TrendingUp className="w-4 h-4 text-red-500" />
                            ) : weekChange.change < 0 ? (
                              <TrendingDown className="w-4 h-4 text-green-500" />
                            ) : (
                              <Minus className="w-4 h-4 text-gray-500" />
                            )}
                            <span className={`font-medium ${
                              weekChange.change > 0 ? 'text-red-500' : 
                              weekChange.change < 0 ? 'text-green-500' : 
                              'text-gray-500'
                            }`}>
                              {weekChange.change > 0 ? '+' : ''}{weekChange.change} kg
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {monthChange.change !== 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Month Change:</span>
                          <div className="flex items-center gap-1">
                            {monthChange.change > 0 ? (
                              <TrendingUp className="w-4 h-4 text-red-500" />
                            ) : monthChange.change < 0 ? (
                              <TrendingDown className="w-4 h-4 text-green-500" />
                            ) : (
                              <Minus className="w-4 h-4 text-gray-500" />
                            )}
                            <span className={`font-medium ${
                              monthChange.change > 0 ? 'text-red-500' : 
                              monthChange.change < 0 ? 'text-green-500' : 
                              'text-gray-500'
                            }`}>
                              {monthChange.change > 0 ? '+' : ''}{monthChange.change} kg
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {member.targetWeight && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Target:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {member.targetWeight} kg
                          </span>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Last updated: {new Date(latestEntry.date).toLocaleDateString()}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500 dark:text-gray-400 text-sm">No weight entries yet</p>
                      <button
                        onClick={() => {
                          setWeightForm({...weightForm, memberId: member.id});
                          setIsAddingWeight(true);
                        }}
                        className="mt-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-medium"
                      >
                        Add first entry
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Weight Progress Charts */}
        {members.length > 0 && weightEntries.length > 0 && (
          <div className="space-y-8 mb-8">
            {members
              .filter(member => weightEntries.some(entry => entry.memberId === member.id))
              .map((member) => {
                const data = getMemberWeightData(member.id);
                if (data.length === 0) return null;

                return (
                  <div key={member.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      {member.name} - Weight Progress
                    </h3>
                    
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="weight" 
                            stroke="#6366f1" 
                            strokeWidth={2}
                            dot={{ fill: '#6366f1' }}
                          />
                          {member.targetWeight && (
                            <Line
                              type="monotone"
                              dataKey={() => member.targetWeight}
                              stroke="#10b981"
                              strokeDasharray="5 5"
                              strokeWidth={1}
                              dot={false}
                            />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Recent Weight Entries */}
        {weightEntries.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent Weight Entries
            </h3>
            
            <div className="space-y-3">
              {weightEntries.slice(0, 10).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {entry.memberName} - {entry.weight} kg
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(entry.date).toLocaleDateString()} • BMI: {entry.bmi}
                      {entry.notes && ` • ${entry.notes}`}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditWeight(entry)}
                      className="p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteWeight(entry.id)}
                      disabled={deletingId === entry.id}
                      className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      {deletingId === entry.id ? (
                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {members.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-center py-16 px-6">
              <div className="w-24 h-24 mx-auto mb-6 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center">
                <span className="text-4xl">⚖️</span>
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Family Members Yet
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Start by adding family members to track their weekly weight progress and health journey.
              </p>
              
              <button
                onClick={() => setIsAddingMember(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
              >
                <User className="w-5 h-5" />
                Add First Family Member
              </button>
            </div>
          </div>
        )}
      </div>
      
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            style: {
              background: '#10b981',
            },
          },
          error: {
            style: {
              background: '#ef4444',
            },
          },
        }}
      />
    </div>
  );
}