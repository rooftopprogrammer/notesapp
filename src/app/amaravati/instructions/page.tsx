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
import { 
  ArrowLeft, 
  Plus, 
  Save, 
  Edit, 
  Trash2, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp,
  GripVertical,
  Video,
  Camera,
  Film
} from 'lucide-react';

interface VideoEditingInstruction {
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
  onEdit, 
  onDelete,
  isExpanded,
  onToggleExpanded
}: {
  instruction: VideoEditingInstruction;
  copiedId: string | null;
  onCopy: (instruction: VideoEditingInstruction) => void;
  onEdit: (instruction: VideoEditingInstruction) => void;
  onDelete: (id: string) => void;
  isExpanded: boolean;
  onToggleExpanded: (id: string) => void;
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
    opacity: isDragging ? 0.5 : 1,
  };

  const handleCopy = () => {
    onCopy(instruction);
  };

  const isJustCopied = copiedId === instruction.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Drag handle */}
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
            >
              <GripVertical className="h-5 w-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 truncate">
                {instruction.title}
              </h3>
              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Video className="h-3 w-3" />
                Video Editing Step
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <button
              onClick={() => onToggleExpanded(instruction.id)}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            
            <button
              onClick={handleCopy}
              className={`p-1.5 rounded transition-colors ${
                isJustCopied 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
              title="Copy to clipboard"
            >
              {isJustCopied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
            
            <button
              onClick={() => onEdit(instruction)}
              className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
              title="Edit instruction"
            >
              <Edit className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => onDelete(instruction.id)}
              className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
              title="Delete instruction"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Expandable content */}
        {isExpanded && (
          <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mt-3">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                {instruction.instruction}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
          <span className="flex items-center gap-1">
            <Film className="h-3 w-3" />
            Order: {instruction.order}
          </span>
          {instruction.createdAt && (
            <span>{instruction.createdAt.toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AmaravatiVideoEditingInstructionsPage() {
  const [instructions, setInstructions] = useState<VideoEditingInstruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    instruction: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load instructions from Firestore - using different collection for Amaravati
  useEffect(() => {
    if (!isFirebaseAvailable()) {
      setLoading(false);
      return;
    }

    const instructionsCollection = collection(db, 'amaravatiVideoEditingInstructions');
    const instructionsQuery = query(instructionsCollection, orderBy('order', 'asc'));
    
    const unsubscribe = onSnapshot(instructionsQuery, (snapshot) => {
      const instructionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as VideoEditingInstruction[];
      
      // Additional client-side sorting
      const sortedInstructions = instructionsData.sort((a, b) => {
        if (a.order !== b.order) {
          return (a.order || 0) - (b.order || 0);
        }
        return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
      });
      
      setInstructions(sortedInstructions);
      setLoading(false);
    }, (error) => {
      console.error('Error loading video editing instructions:', error);
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
      const instructionsCollection = collection(db, 'amaravatiVideoEditingInstructions');
      
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
      console.error('Error adding video editing instruction:', error);
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
        if (!isFirebaseAvailable()) return;
        
        const batch = writeBatch(db);
        
        newInstructions.forEach((instruction, index) => {
          const instructionRef = doc(db, 'amaravatiVideoEditingInstructions', instruction.id);
          batch.update(instructionRef, { order: index + 1 });
        });
        
        await batch.commit();
      } catch (error) {
        console.error('Error updating instruction order:', error);
        // Revert local changes on error
        const revertedInstructions = arrayMove(newInstructions, newIndex, oldIndex);
        setInstructions(revertedInstructions);
      }
    }
  };

  const handleUpdateInstruction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFirebaseAvailable() || !editingId) {
      alert('Firebase is not available or no instruction selected for editing.');
      return;
    }
    
    if (!formData.title.trim() || !formData.instruction.trim()) {
      alert('Please fill in both title and instruction fields');
      return;
    }

    try {
      setSaving(true);
      const instructionRef = doc(db, 'amaravatiVideoEditingInstructions', editingId);
      
      await updateDoc(instructionRef, {
        title: formData.title.trim(),
        instruction: formData.instruction.trim(),
      });

      // Reset form and editing state
      setFormData({ title: '', instruction: '' });
      setEditingId(null);
    } catch (error) {
      console.error('Error updating video editing instruction:', error);
      alert('Error updating instruction. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (instruction: VideoEditingInstruction) => {
    setFormData({
      title: instruction.title,
      instruction: instruction.instruction
    });
    setEditingId(instruction.id);
    // Scroll to form
    document.getElementById('instruction-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!isFirebaseAvailable()) {
      alert('Firebase is not available.');
      return;
    }

    if (!confirm('Are you sure you want to delete this video editing instruction?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'amaravatiVideoEditingInstructions', id));
    } catch (error) {
      console.error('Error deleting video editing instruction:', error);
      alert('Error deleting instruction. Please try again.');
    }
  };

  const handleCopy = async (instruction: VideoEditingInstruction) => {
    try {
      await navigator.clipboard.writeText(
        `${instruction.title}\n\n${instruction.instruction}`
      );
      setCopiedId(instruction.id);
      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const handleToggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCards(newExpanded);
  };

  const handleExpandAll = () => {
    if (expandedCards.size === instructions.length) {
      // All expanded, collapse all
      setExpandedCards(new Set());
    } else {
      // Expand all
      setExpandedCards(new Set(instructions.map(i => i.id)));
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ title: '', instruction: '' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link 
              href="/amaravati/dashboard"
              className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Back to Dashboard</span>
            </Link>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Camera className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Video Editing Instructions
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Manage your Amaravati video editing workflow and instructions
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExpandAll}
                className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {expandedCards.size === instructions.length ? 'Collapse All' : 'Expand All'}
              </button>
            </div>
          </div>
        </div>

        {/* Add/Edit Form */}
        <div id="instruction-form" className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Plus className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingId ? 'Edit Video Editing Instruction' : 'Add New Video Editing Instruction'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Instruction Title
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Color Correction for Temple Shots"
                required
              />
            </div>

            <div>
              <label htmlFor="instruction" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Detailed Instructions
              </label>
              <textarea
                id="instruction"
                rows={6}
                value={formData.instruction}
                onChange={(e) => setFormData({ ...formData, instruction: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter detailed video editing instructions..."
                required
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : editingId ? 'Update Instruction' : 'Add Instruction'}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Instructions List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Video Editing Instructions ({instructions.length})
            </h2>
            
            {instructions.length > 0 && (
              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <GripVertical className="h-4 w-4" />
                Drag to reorder
              </div>
            )}
          </div>

          {instructions.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
              <div className="max-w-sm mx-auto">
                <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No instructions yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                  Add your first video editing instruction to get started with your Amaravati video workflow.
                </p>
              </div>
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
                <div className="space-y-4">
                  {instructions.map((instruction) => (
                    <SortableInstructionCard
                      key={instruction.id}
                      instruction={instruction}
                      copiedId={copiedId}
                      onCopy={handleCopy}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      isExpanded={expandedCards.has(instruction.id)}
                      onToggleExpanded={handleToggleExpanded}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Help text */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Video className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-blue-900 dark:text-blue-100 font-medium mb-1">
                Video Editing Tips
              </p>
              <p className="text-blue-700 dark:text-blue-200">
                Use this section to document your video editing workflow for Amaravati content. You can drag and drop to reorder instructions, copy them to clipboard, and expand/collapse for better organization.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}