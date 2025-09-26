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
  age?: number; // calculated age
}

interface WeightEntry {
  id: string;
  memberId: string;
  weight: number;
  date: string;
  notes?: string;
  bmi?: number;
}

// Predefined family member heights and birth years
const PREDEFINED_HEIGHTS: { [key: string]: number } = {
  'Ravi': 170.18, // 5'7" in cm
  'Father': 175.26, // 5'9" in cm
  'Mother': 165.10, // 5'5" in cm
  'Brother': 180.34, // 5'11" in cm
  'Wife': 170.18, // 5'7" in cm
  'Wife (Breastfeeding)': 170.18, // 5'7" in cm
  'Sister inlaw': 157.48, // 5'2" in cm
  'Sister-In-law': 157.48, // 5'2" in cm
  'Sister-in-law (Pregnant)': 157.48, // 5'2" in cm
};

const BIRTH_YEARS: { [key: string]: number } = {
  'Brother': 1998,
  'Ravi': 1996,
  'Mother': 1974,
  'Father': 1978,
  'Wife': 2003,
  'Wife (Breastfeeding)': 2003,
  'Sister inlaw': 2001,
  'Sister-In-law': 2001,
  'Sister-in-law (Pregnant)': 2001,
};

// Helper function to get height by name
function getHeightByName(name: string): number {
  return PREDEFINED_HEIGHTS[name] || 0;
}

// Helper function to get birth year by name
function getBirthYearByName(name: string): number {
  return BIRTH_YEARS[name] || 0;
}

// Helper function to calculate age from birth year
function calculateAge(birthYear: number): number {
  if (birthYear <= 0) return 0;
  return new Date().getFullYear() - birthYear;
}

// Helper function to convert cm to feet and inches
function cmToFeetInches(cm: number): string {
  if (cm <= 0) return '';
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
}

// Helper function to convert feet/inches string to cm
function feetInchesToCm(feetInchesStr: string): number {
  const match = feetInchesStr.match(/(\d+)'(\d+)"/);
  if (!match) return 0;
  const feet = parseInt(match[1]);
  const inches = parseInt(match[2]);
  return (feet * 12 + inches) * 2.54;
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
      const predefinedHeight = getHeightByName(memberName.trim());
      const predefinedBirthYear = getBirthYearByName(memberName.trim());
      let finalHeight = predefinedHeight;
      
      // If no predefined height, try to parse user input
      if (finalHeight <= 0) {
        if (height.includes("'") && height.includes('"')) {
          // Parse feet'inches" format
          finalHeight = feetInchesToCm(height);
        } else {
          // Try to parse as number (assuming cm)
          finalHeight = parseFloat(height) || 0;
        }
      }

      // Use predefined birth year if available, otherwise use user input
      let finalDateOfBirth = memberDateOfBirth;
      if (predefinedBirthYear > 0 && !memberDateOfBirth) {
        finalDateOfBirth = `${predefinedBirthYear}-01-01`; // Default to January 1st
      }
      
      await addDoc(collection(db, 'familyMembers'), {
        name: memberName.trim(),
        height: finalHeight,
        dateOfBirth: finalDateOfBirth,
        age: predefinedBirthYear > 0 ? calculateAge(predefinedBirthYear) : undefined
      });
      
      setMemberName('');
      setHeight('');
      setMemberDateOfBirth('');
      
      if (predefinedHeight > 0) {
        toast.success(`Family member added with predefined height: ${cmToFeetInches(predefinedHeight)}`);
      } else if (finalHeight > 0) {
        toast.success(`Family member added with height: ${cmToFeetInches(finalHeight)}`);
      } else {
        toast.success('Family member added successfully');
      }
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
      let heightValue = member.height;
      
      // Parse height input if provided
      if (height.trim()) {
        if (height.includes("'") && height.includes('"')) {
          // Parse feet'inches" format
          heightValue = feetInchesToCm(height);
        } else {
          // Try to parse as number (assuming cm)
          heightValue = parseFloat(height) || member.height;
        }
      }
      
      // If still no height, try to get predefined height
      if (heightValue <= 0) {
        const predefinedHeight = getHeightByName(member.name);
        heightValue = predefinedHeight;
      }

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
      let heightValue = member.height;
      
      // Parse height input if provided
      if (height.trim()) {
        if (height.includes("'") && height.includes('"')) {
          // Parse feet'inches" format
          heightValue = feetInchesToCm(height);
        } else {
          // Try to parse as number (assuming cm)
          heightValue = parseFloat(height) || member.height;
        }
      }
      
      // If still no height, try to get predefined height
      if (heightValue <= 0) {
        const predefinedHeight = getHeightByName(member.name);
        heightValue = predefinedHeight;
      }

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
    setHeight(member?.height ? cmToFeetInches(member.height) : '');
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

  const updateExistingMembersWithPredefinedHeights = async () => {
    try {
      const updates: Promise<void>[] = [];
      const updateDetails: string[] = [];
      
      familyMembers.forEach(member => {
        const predefinedHeight = getHeightByName(member.name);
        console.log(`Checking member: "${member.name}", current height: ${member.height}, predefined: ${predefinedHeight}`);
        
        if (predefinedHeight > 0 && (!member.height || member.height === 0)) {
          updates.push(
            updateDoc(doc(db, 'familyMembers', member.id), {
              height: predefinedHeight
            })
          );
          updateDetails.push(`${member.name}: ${Math.round(predefinedHeight)}cm`);
        }
      });

      if (updates.length > 0) {
        await Promise.all(updates);
        toast.success(`Updated heights for: ${updateDetails.join(', ')}`);
      } else {
        const memberNames = familyMembers.map(m => `"${m.name}"`).join(', ');
        toast(`No updates needed. Current members: ${memberNames}. Check browser console for details.`, {
          icon: 'ℹ️',
          duration: 6000
        });
      }
    } catch (error) {
      console.error('Error updating member heights:', error);
      toast.error('Failed to update member heights');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName}? This will also delete all their weight entries.`)) {
      return;
    }

    try {
      // First, delete all weight entries for this member
      const weightEntriesQuery = query(collection(db, 'weightEntries'), where('memberId', '==', memberId));
      const weightEntriesSnapshot = await getDocs(weightEntriesQuery);
      
      const deleteWeightPromises = weightEntriesSnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      
      // Delete the member
      const deleteMemberPromise = deleteDoc(doc(db, 'familyMembers', memberId));
      
      // Execute all deletions
      await Promise.all([...deleteWeightPromises, deleteMemberPromise]);
      
      // Reset selected member if it was the deleted one
      if (selectedMember === memberId) {
        setSelectedMember('');
      }
      
      toast.success(`${memberName} and all their data have been removed`);
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const recalculateAllBMI = async () => {
    try {
      const updates: Promise<void>[] = [];
      let updatedCount = 0;

      // Get all weight entries
      const allEntriesSnapshot = await getDocs(collection(db, 'weightEntries'));
      
      for (const entryDoc of allEntriesSnapshot.docs) {
        const entry = entryDoc.data() as WeightEntry;
        const member = familyMembers.find(m => m.id === entry.memberId);
        
        if (member && member.height > 0) {
          const newBMI = calculateBMI(entry.weight, member.height);
          
          // Update if BMI is missing or different
          if (!entry.bmi || Math.abs(entry.bmi - newBMI) > 0.1) {
            updates.push(
              updateDoc(doc(db, 'weightEntries', entryDoc.id), {
                bmi: newBMI
              })
            );
            updatedCount++;
          }
        }
      }

      if (updates.length > 0) {
        await Promise.all(updates);
        toast.success(`Recalculated BMI for ${updatedCount} weight entries`);
      } else {
        toast('All BMI values are already up to date', {
          icon: 'ℹ️'
        });
      }
    } catch (error) {
      console.error('Error recalculating BMI:', error);
      toast.error('Failed to recalculate BMI');
    }
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
            <div className="flex gap-2">
              <button
                onClick={updateExistingMembersWithPredefinedHeights}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-medium"
                title="Update existing members with predefined heights"
              >
                <Scale size={16} />
                Update Heights
              </button>
              <button
                onClick={recalculateAllBMI}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
                title="Recalculate BMI for all weight entries"
              >
                <TrendingUp size={16} />
                Fix BMI
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {familyMembers.map((member) => (
              <div
                key={member.id}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  selectedMember === member.id
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-600'
                }`}
              >
                <button
                  onClick={() => setSelectedMember(member.id)}
                  className="w-full h-full flex items-center gap-3 text-left"
                >
                  <User size={20} className="text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{member.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {member.height > 0 ? `${cmToFeetInches(member.height)} (${Math.round(member.height)}cm)` : 'Height not set'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {(() => {
                        const predefinedAge = calculateAge(getBirthYearByName(member.name));
                        if (predefinedAge > 0) {
                          return `Age: ${predefinedAge}`;
                        } else if (member.dateOfBirth) {
                          const age = new Date().getFullYear() - new Date(member.dateOfBirth).getFullYear();
                          return age > 0 ? `Age: ${age}` : '';
                        }
                        return '';
                      })()}
                    </div>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveMember(member.id, member.name);
                  }}
                  className="absolute top-2 right-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  title={`Remove ${member.name}`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Add New Member Form */}
          <details className="group">
            <summary className="cursor-pointer text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium">
              + Add New Family Member
            </summary>
            <form onSubmit={handleAddMember} className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-2">
                  📏 Predefined Heights & Ages Available:
                </p>
                <div className="text-xs text-blue-700 dark:text-blue-300 grid grid-cols-1 gap-1">
                  <div>• Ravi - 5'7" (170cm), Age: {calculateAge(1996)} (born 1996)</div>
                  <div>• Father - 5'9" (175cm), Age: {calculateAge(1978)} (born 1978)</div>
                  <div>• Mother - 5'5" (165cm), Age: {calculateAge(1974)} (born 1974)</div>
                  <div>• Brother - 5'11" (180cm), Age: {calculateAge(1998)} (born 1998)</div>
                  <div>• Wife / Wife (Breastfeeding) - 5'7" (170cm), Age: {calculateAge(2003)} (born 2003)</div>
                  <div>• Sister-In-law / Sister-In-law (Pregnant) - 5'2" (157cm), Age: {calculateAge(2001)} (born 2001)</div>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-300 mt-2">
                  💡 Use exact names above for automatic height and age assignment
                </p>
              </div>
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
                  {memberName && getHeightByName(memberName.trim()) > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      ✓ Height will be set automatically: {Math.round(getHeightByName(memberName.trim()))}cm
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Height (ft'in") {memberName && getHeightByName(memberName.trim()) > 0 ? '(optional - auto-filled)' : ''}
                  </label>
                  <input
                    type="text"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                    placeholder="5'7&quot;"
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
                  {cmToFeetInches(selectedMemberData.height)}
                </div>
                <div className="text-gray-500 dark:text-gray-400">Height</div>
                <div className="text-sm text-gray-400">
                  {Math.round(selectedMemberData.height)}cm
                </div>
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
                    Height (ft'in") {selectedMemberData?.height ? '(optional)' : '*'}
                  </label>
                  <input
                    type="text"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                    placeholder={selectedMemberData?.height ? cmToFeetInches(selectedMemberData.height) : "5'7\""}
                    disabled={Boolean(selectedMemberData?.height && selectedMemberData.height > 0)}
                    required={!selectedMemberData?.height}
                  />
                  {selectedMemberData?.height && selectedMemberData.height > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Height already set for this member: {cmToFeetInches(selectedMemberData.height)}
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