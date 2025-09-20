'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { db, isFirebaseAvailable } from '@/lib/firebase';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Instruction {
  id: string;
  title: string;
  instruction: string;
  order: number;
  createdAt?: Date;
}

// Sortable Instruction Card Component
function SortableInstructionCard({ 
  instruction, 
  copiedId, 
  onCopy, 
  onDelete,
  onEdit
}: { 
  instruction: Instruction;
  copiedId: string | null;
  onCopy: (instruction: Instruction) => void;
  onDelete: (id: string) => void;
  onEdit: (instruction: Instruction) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: instruction.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all cursor-pointer group ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {/* Header with title and action buttons */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors flex-1">
          {instruction.title}
        </h3>
        <div className="flex items-center gap-2">
          {/* Drag Handle Icon */}
          <div 
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
          {copiedId === instruction.id && (
            <span className="text-green-500 text-sm font-medium">Copied!</span>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Edit button clicked for:', instruction.id);
              onEdit(instruction);
            }}
            className="text-blue-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity z-10 relative"
            title="Edit instruction"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Delete button clicked for:', instruction.id);
              onDelete(instruction.id);
            }}
            className="text-red-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10 relative"
            title="Delete instruction"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      <div onClick={() => onCopy(instruction)}>
        <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap mb-3">
          {instruction.instruction}
        </p>
        
        <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
          <span>Click to copy instruction</span>
          {instruction.createdAt && (
            <span>{instruction.createdAt.toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DietInstructionsPage() {
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    instruction: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load instructions from Firestore
  useEffect(() => {
    if (!isFirebaseAvailable()) {
      setLoading(false);
      return;
    }

    const instructionsCollection = collection(db, 'dietInstructions');
    // Temporary: Use single orderBy until composite index is ready
    // Will revert to: query(instructionsCollection, orderBy('order', 'asc'), orderBy('createdAt', 'desc'))
    const instructionsQuery = query(instructionsCollection, orderBy('order', 'asc'));
    
    const unsubscribe = onSnapshot(instructionsQuery, (snapshot) => {
      const instructionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as Instruction[];
      
      // Additional client-side sorting until composite index is ready
      const sortedInstructions = instructionsData.sort((a, b) => {
        if (a.order !== b.order) {
          return (a.order || 0) - (b.order || 0);
        }
        return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
      });
      
      setInstructions(sortedInstructions);
      setLoading(false);
    }, (error) => {
      console.error('Error loading instructions:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If editing, use the update handler instead
    if (editingId) {
      return handleUpdateInstruction(e);
    }
    
    if (!isFirebaseAvailable()) {
      alert('Firebase is not available. Please check your configuration.');
      return;
    }
    
    if (!formData.title.trim() || !formData.instruction.trim()) {
      alert('Please fill in both title and instruction fields');
      return;
    }

    try {
      setSaving(true);
      const instructionsCollection = collection(db, 'dietInstructions');
      
      // Set order to be higher than all existing instructions
      const maxOrder = instructions.length > 0 ? Math.max(...instructions.map(i => i.order || 0)) : 0;
      
      await addDoc(instructionsCollection, {
        title: formData.title.trim(),
        instruction: formData.instruction.trim(),
        order: maxOrder + 1,
        createdAt: serverTimestamp()
      });

      // Reset form
      setFormData({ title: '', instruction: '' });
    } catch (error) {
      console.error('Error adding instruction:', error);
      alert('Error adding instruction. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = instructions.findIndex((item) => item.id === active.id);
      const newIndex = instructions.findIndex((item) => item.id === over?.id);

      const newInstructions = arrayMove(instructions, oldIndex, newIndex);
      
      // Update local state immediately for better UX
      setInstructions(newInstructions);

      // Update order in Firebase
      try {
        const batch = writeBatch(db);
        newInstructions.forEach((instruction, index) => {
          const docRef = doc(db, 'dietInstructions', instruction.id);
          batch.update(docRef, { order: index });
        });
        await batch.commit();
      } catch (error) {
        console.error('Error updating order:', error);
        // Revert local changes if Firebase update fails
        setInstructions(instructions);
        alert('Error updating order. Please try again.');
      }
    }
  };

  const handleCopyInstruction = async (instruction: Instruction) => {
    try {
      await navigator.clipboard.writeText(instruction.instruction);
      setCopiedId(instruction.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      alert('Error copying to clipboard');
    }
  };

  const handleDeleteInstruction = async (id: string) => {
    if (!isFirebaseAvailable()) {
      alert('Firebase is not available. Please check your connection.');
      return;
    }
    
    if (confirm('Are you sure you want to delete this instruction?')) {
      try {
        console.log('Attempting to delete instruction with id:', id);
        await deleteDoc(doc(db, 'dietInstructions', id));
        console.log('Successfully deleted instruction:', id);
      } catch (error) {
        console.error('Error deleting instruction:', error);
        alert(`Error deleting instruction: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const handleEditInstruction = (instruction: Instruction) => {
    setEditingId(instruction.id);
    setFormData({
      title: instruction.title,
      instruction: instruction.instruction
    });
  };

  const handleUpdateInstruction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !isFirebaseAvailable()) return;

    if (!formData.title.trim() || !formData.instruction.trim()) {
      alert('Please fill in both title and instruction');
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, 'dietInstructions', editingId), {
        title: formData.title.trim(),
        instruction: formData.instruction.trim(),
        updatedAt: serverTimestamp(),
      });
      
      // Reset form
      setFormData({ title: '', instruction: '' });
      setEditingId(null);
    } catch (error) {
      console.error('Error updating instruction:', error);
      alert(`Error updating instruction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ title: '', instruction: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-teal-100 dark:bg-teal-900/20 rounded-lg">
              <span className="text-2xl">📝</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Diet Instructions
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Add and manage your family diet instructions
              </p>
            </div>
          </div>

          {/* Back Button */}
          <div className="mb-6">
            <Link
              href="/hometracker/diet"
              className="inline-flex items-center gap-2 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Family Diet Tracker
            </Link>
          </div>
        </div>

        {/* Add/Edit Instruction Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingId ? 'Edit Instruction' : 'Add New Instruction'}
          </h2>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Add New Instruction
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter instruction title..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Instruction
              </label>
              <textarea
                value={formData.instruction}
                onChange={(e) => setFormData({ ...formData, instruction: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter the instruction details..."
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 sm:flex-none px-6 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-medium rounded-md transition-colors"
              >
                {saving ? (editingId ? 'Updating...' : 'Adding...') : (editingId ? 'Update Instruction' : 'Add Instruction')}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-6 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-medium rounded-md transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Instructions List */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Your Instructions ({instructions.length})
            </h2>
            {instructions.length > 1 && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
                <span>Drag to reorder</span>
              </div>
            )}
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Loading instructions...</p>
            </div>
          ) : instructions.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No instructions yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Add your first diet instruction using the form above
              </p>
            </div>
          ) : (
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={instructions.map(i => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  {instructions.map((instruction) => (
                    <SortableInstructionCard
                      key={instruction.id}
                      instruction={instruction}
                      copiedId={copiedId}
                      onCopy={handleCopyInstruction}
                      onDelete={handleDeleteInstruction}
                      onEdit={handleEditInstruction}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}