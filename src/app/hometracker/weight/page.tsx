'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Edit3, Trash2, Calendar, TrendingUp, TrendingDown, Minus, Save, X, User, Scale } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy, where, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface FamilyMember {
  id: string;
  name: string;
  height: number; // in cm
  dateOfBirth: string;
}

interface WeightEntry {
  id: string;
  memberId: string;
  weight: number;
  date: string;
  notes?: string;
  bmi?: number;
}

const BMI_CATEGORIES = [
  { range: 'Below 18.5', category: 'Underweight', color: 'text-blue-600' },
  { range: '18.5 - 24.9', category: 'Normal weight', color: 'text-green-600' },
  { range: '25.0 - 29.9', category: 'Overweight', color: 'text-yellow-600' },
  { range: '30.0 and above', category: 'Obese', color: 'text-red-600' }
];

function calculateBMI(weight: number, height: number): number {
  if (height <= 0) return 0;
  const heightInMeters = height / 100;
  return parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(1));
}

function getBMICategory(bmi: number): { category: string; color: string } {
  if (bmi < 18.5) return { category: 'Underweight', color: 'text-blue-600' };
  if (bmi < 25) return { category: 'Normal weight', color: 'text-green-600' };
  if (bmi < 30) return { category: 'Overweight', color: 'text-yellow-600' };
  return { category: 'Obese', color: 'text-red-600' };
}

export default function WeightTracker() {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WeightEntry | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberDateOfBirth, setMemberDateOfBirth] = useState('');

  useEffect(() => {
    // Load family members
    const unsubscribeMembers = onSnapshot(
      query(collection(db, 'familyMembers'), orderBy('name')),
      (snapshot) => {
        const members = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as FamilyMember));
        setFamilyMembers(members);
        
        if (members.length > 0 && !selectedMember) {
          setSelectedMember(members[0].id);
        }
      }
    );

    // Load weight entries
    const unsubscribeEntries = onSnapshot(
      query(collection(db, 'weightEntries'), orderBy('date', 'desc')),
      (snapshot) => {
        const entries = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as WeightEntry));
        setWeightEntries(entries);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeMembers();
      unsubscribeEntries();
    };
  }, [selectedMember]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim()) return;

    try {
      await addDoc(collection(db, 'familyMembers'), {
        name: memberName.trim(),
        height: parseFloat(height) || 0,
        dateOfBirth: memberDateOfBirth
      });
      
      setMemberName('');
      setHeight('');
      setMemberDateOfBirth('');
      toast.success('Family member added successfully');
    } catch (error) {
      console.error('Error adding family member:', error);
      toast.error('Failed to add family member');
    }
  };

  const handleAddWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMember || !weight || !date) {
      toast.error('Please fill in all required fields');
      return;
    }

    const member = familyMembers.find(m => m.id === selectedMember);
    if (!member) {
      toast.error('Please select a family member');
      return;
    }

    try {
      const weightValue = parseFloat(weight);
      const heightValue = parseFloat(height) || member.height;

      if (heightValue <= 0) {
        toast.error('Height is required for BMI calculation');
        return;
      }

      // If member doesn't have height, update it
      if (member.height === 0 || !member.height) {
        await updateDoc(doc(db, 'familyMembers', member.id), {
          height: heightValue
        });
      }

      const bmi = calculateBMI(weightValue, heightValue);

      await addDoc(collection(db, 'weightEntries'), {
        memberId: selectedMember,
        weight: weightValue,
        date,
        notes: notes.trim(),
        bmi
      });
      
      // Reset form
      setWeight('');
      setHeight('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setShowForm(false);
      toast.success('Weight entry added successfully');
    } catch (error) {
      console.error('Error adding weight entry:', error);
      toast.error('Failed to add weight entry');
    }
  };

  const handleEditWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingEntry || !weight || !date) {
      toast.error('Please fill in all required fields');
      return;
    }

    const member = familyMembers.find(m => m.id === editingEntry.memberId);
    if (!member) {
      toast.error('Family member not found');
      return;
    }

    try {
      const weightValue = parseFloat(weight);
      const heightValue = parseFloat(height) || member.height;

      if (heightValue <= 0) {
        toast.error('Height is required for BMI calculation');
        return;
      }

      // Update member height if it has changed and member doesn't have height
      if ((member.height === 0 || !member.height) && heightValue > 0) {
        await updateDoc(doc(db, 'familyMembers', member.id), {
          height: heightValue
        });
      }

      const bmi = calculateBMI(weightValue, heightValue);

      await updateDoc(doc(db, 'weightEntries', editingEntry.id), {
        weight: weightValue,
        date,
        notes: notes.trim(),
        bmi
      });
      
      // Reset form
      setWeight('');
      setHeight('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setEditingEntry(null);
      toast.success('Weight entry updated successfully');
    } catch (error) {
      console.error('Error updating weight entry:', error);
      toast.error('Failed to update weight entry');
    }
  };

  const handleDeleteWeight = async (entryId: string) => {
    if (!window.confirm('Are you sure you want to delete this weight entry?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'weightEntries', entryId));
      toast.success('Weight entry deleted successfully');
    } catch (error) {
      console.error('Error deleting weight entry:', error);
      toast.error('Failed to delete weight entry');
    }
  };

  const startEditEntry = (entry: WeightEntry) => {
    const member = familyMembers.find(m => m.id === entry.memberId);
    setEditingEntry(entry);
    setWeight(entry.weight.toString());
    setHeight(member?.height?.toString() || '');
    setDate(entry.date);
    setNotes(entry.notes || '');
    setShowForm(false);
  };

  const cancelEdit = () => {
    setEditingEntry(null);
    setWeight('');
    setHeight('');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
  };

  // Filter entries for selected member
  const selectedMemberEntries = weightEntries
    .filter(entry => entry.memberId === selectedMember)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Prepare chart data
  const chartData = selectedMemberEntries.map(entry => ({
    date: entry.date,
    weight: entry.weight,
    bmi: entry.bmi || 0
  }));

  // Get latest entry for selected member
  const latestEntry = selectedMemberEntries[selectedMemberEntries.length - 1];
  const selectedMemberData = familyMembers.find(m => m.id === selectedMember);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/hometracker"
              className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 mb-4"
            >
              ← Back to Family Tracker
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Scale className="text-indigo-600 dark:text-indigo-400" />
              Weight Tracker
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Track weight progress and BMI for your family
            </p>
          </div>
          <button
            onClick={() => {
              if (editingEntry) {
                cancelEdit();
              }
              setShowForm(!showForm);
            }}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium"
          >
            <Plus size={20} />
            Add Weight Entry
          </button>
        </div>

        {/* Family Member Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Family Members</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {familyMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => setSelectedMember(member.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedMember === member.id
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <User size={20} className="text-indigo-600 dark:text-indigo-400" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900 dark:text-white">{member.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {member.height > 0 ? `${member.height}cm` : 'Height not set'}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Add New Member Form */}
          <details className="group">
            <summary className="cursor-pointer text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium">
              + Add New Family Member
            </summary>
            <form onSubmit={handleAddMember} className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                    placeholder="170"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={memberDateOfBirth}
                    onChange={(e) => setMemberDateOfBirth(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Add Member
                </button>
              </div>
            </form>
          </details>
        </div>

        {/* Current Stats */}
        {selectedMemberData && latestEntry && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Current Stats - {selectedMemberData.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                  {latestEntry.weight} kg
                </div>
                <div className="text-gray-500 dark:text-gray-400">Current Weight</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedMemberData.height} cm
                </div>
                <div className="text-gray-500 dark:text-gray-400">Height</div>
              </div>
              <div className="text-center">
                <div className={`text-3xl font-bold ${getBMICategory(latestEntry.bmi || 0).color}`}>
                  {latestEntry.bmi || 0}
                </div>
                <div className="text-gray-500 dark:text-gray-400">BMI</div>
                <div className={`text-sm ${getBMICategory(latestEntry.bmi || 0).color}`}>
                  {getBMICategory(latestEntry.bmi || 0).category}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BMI Reference Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">BMI Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {BMI_CATEGORIES.map((category, index) => (
              <div key={index} className="text-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className={`font-semibold ${category.color}`}>{category.category}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{category.range}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Add/Edit Weight Form */}
        {(showForm || editingEntry) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingEntry ? 'Edit Weight Entry' : 'Add Weight Entry'}
              </h2>
              <button
                onClick={editingEntry ? cancelEdit : () => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={editingEntry ? handleEditWeight : handleAddWeight}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Weight (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                    placeholder="70.5"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Height (cm) {selectedMemberData?.height ? '(optional)' : '*'}
                  </label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                    placeholder={selectedMemberData?.height?.toString() || "170"}
                    disabled={Boolean(selectedMemberData?.height && selectedMemberData.height > 0)}
                    required={!selectedMemberData?.height}
                  />
                  {selectedMemberData?.height && selectedMemberData.height > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Height already set for this member
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                    placeholder="Optional notes"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <Save size={20} />
                  {editingEntry ? 'Update Entry' : 'Add Entry'}
                </button>
                <button
                  type="button"
                  onClick={editingEntry ? cancelEdit : () => setShowForm(false)}
                  className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors flex items-center gap-2"
                >
                  <X size={20} />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Charts */}
        {selectedMember && chartData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Weight Progress Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="text-indigo-600 dark:text-indigo-400" />
                Weight Progress
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      labelFormatter={(value) => `Date: ${value}`}
                      formatter={(value, name) => [`${value} kg`, 'Weight']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      stroke="#4f46e5" 
                      strokeWidth={3}
                      dot={{ fill: '#4f46e5', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* BMI Progress Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart className="text-indigo-600 dark:text-indigo-400" />
                BMI Progress
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      labelFormatter={(value) => `Date: ${value}`}
                      formatter={(value, name) => [value, 'BMI']}
                    />
                    <Bar 
                      dataKey="bmi" 
                      fill="#4f46e5"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Weight Entries List */}
        {selectedMember && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Weight History - {familyMembers.find(m => m.id === selectedMember)?.name}
            </h2>
            
            {selectedMemberEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Scale size={48} className="mx-auto mb-4 opacity-30" />
                <p>No weight entries found for this member.</p>
                <p className="text-sm">Add your first weight entry to start tracking progress!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Weight (kg)</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">BMI</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Category</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Notes</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...selectedMemberEntries].reverse().map((entry) => {
                      const bmiCategory = getBMICategory(entry.bmi || 0);
                      return (
                        <tr key={entry.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="py-3 px-4 text-gray-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <Calendar size={16} className="text-gray-400" />
                              {new Date(entry.date).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                            {entry.weight} kg
                          </td>
                          <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                            {entry.bmi || 0}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`${bmiCategory.color} font-medium`}>
                              {bmiCategory.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                            {entry.notes || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => startEditEntry(entry)}
                                className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                title="Edit entry"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteWeight(entry.id)}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Delete entry"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}