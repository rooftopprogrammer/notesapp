'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { addGoal, getGoals, deleteGoal, addHabit, getHabits, deleteHabit, markHabitComplete } from '../../../lib/goalsHabits';

interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: 'not-started' | 'in-progress' | 'completed' | 'on-hold';
  targetDate: string;
  progress: number;
  milestones: string[];
  completedMilestones: string[];
  createdAt: string;
  updatedAt: string;
}

interface Habit {
  id: string;
  title: string;
  description: string;
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  targetDays: number;
  currentStreak: number;
  longestStreak: number;
  completedDates: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function GoalsHabits() {
  const [activeTab, setActiveTab] = useState<'goals' | 'habits'>('goals');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddHabit, setShowAddHabit] = useState(false);

  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    category: 'personal',
    priority: 'medium' as 'low' | 'medium' | 'high',
    targetDate: '',
    milestones: ['']
  });

  const [habitForm, setHabitForm] = useState({
    title: '',
    description: '',
    category: 'health',
    frequency: 'daily' as 'daily' | 'weekly' | 'monthly',
    targetDays: 7
  });

  useEffect(() => {
    loadGoals();
    loadHabits();
  }, []);

  const loadGoals = async () => {
    const goalsData = await getGoals();
    setGoals(goalsData);
  };

  const loadHabits = async () => {
    const habitsData = await getHabits();
    setHabits(habitsData);
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const milestones = goalForm.milestones.filter(m => m.trim() !== '');
      await addGoal({
        ...goalForm,
        milestones,
        progress: 0,
        status: 'not-started' as const,
        completedMilestones: []
      });
      setShowAddGoal(false);
      setGoalForm({
        title: '',
        description: '',
        category: 'personal',
        priority: 'medium',
        targetDate: '',
        milestones: ['']
      });
      loadGoals();
    } catch (error) {
      console.error('Error adding goal:', error);
    }
  };

  const handleAddHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addHabit({
        ...habitForm,
        currentStreak: 0,
        longestStreak: 0,
        completedDates: [],
        isActive: true
      });
      setShowAddHabit(false);
      setHabitForm({
        title: '',
        description: '',
        category: 'health',
        frequency: 'daily',
        targetDays: 7
      });
      loadHabits();
    } catch (error) {
      console.error('Error adding habit:', error);
    }
  };

  const handleMarkHabitComplete = async (habitId: string) => {
    const today = new Date().toISOString().split('T')[0];
    await markHabitComplete(habitId, today);
    loadHabits();
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (confirm('Are you sure you want to delete this goal?')) {
      await deleteGoal(goalId);
      loadGoals();
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (confirm('Are you sure you want to delete this habit?')) {
      await deleteHabit(habitId);
      loadHabits();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'on-hold': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center mb-6">
          <Link 
            href="/personal"
            className="mr-4 p-2 rounded-lg bg-white shadow-md hover:shadow-lg transition-shadow"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Goals & Habits</h1>
        </div>
        
        <p className="text-gray-600 text-lg">
          Set and track your personal goals and daily habits for self-improvement
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="bg-white rounded-xl shadow-lg p-2">
          <div className="flex">
            <button
              onClick={() => setActiveTab('goals')}
              className={`flex-1 px-6 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'goals'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-blue-500'
              }`}
            >
              Goals ({goals.length})
            </button>
            <button
              onClick={() => setActiveTab('habits')}
              className={`flex-1 px-6 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'habits'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-blue-500'
              }`}
            >
              Habits ({habits.length})
            </button>
          </div>
        </div>
      </div>

      {/* Goals Tab */}
      {activeTab === 'goals' && (
        <div className="max-w-6xl mx-auto">
          {/* Goals Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Your Goals</h2>
            <button
              onClick={() => setShowAddGoal(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Add New Goal
            </button>
          </div>

          {/* Goals Grid */}
          {goals.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-lg">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No Goals Yet</h3>
              <p className="text-gray-600 mb-4">Start your journey by setting your first goal!</p>
              <button
                onClick={() => setShowAddGoal(true)}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Add Your First Goal
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {goals.map((goal) => (
                <div key={goal.id} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}>
                        {goal.status.replace('-', ' ')}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(goal.priority)}`}>
                        {goal.priority}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{goal.title}</h3>
                  <p className="text-gray-600 text-sm mb-4">{goal.description}</p>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{goal.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${goal.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-500">
                    <div>Category: {goal.category}</div>
                    <div>Target: {new Date(goal.targetDate).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Habits Tab */}
      {activeTab === 'habits' && (
        <div className="max-w-6xl mx-auto">
          {/* Habits Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Your Habits</h2>
            <button
              onClick={() => setShowAddHabit(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Add New Habit
            </button>
          </div>

          {/* Habits Grid */}
          {habits.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-lg">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No Habits Yet</h3>
              <p className="text-gray-600 mb-4">Build better habits by tracking them daily!</p>
              <button
                onClick={() => setShowAddHabit(true)}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Add Your First Habit
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {habits.map((habit) => {
                const today = new Date().toISOString().split('T')[0];
                const completedToday = habit.completedDates.includes(today);
                
                return (
                  <div key={habit.id} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        habit.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {habit.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteHabit(habit.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">{habit.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">{habit.description}</p>
                    
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Current Streak</span>
                        <span className="text-lg font-bold text-blue-600">{habit.currentStreak} days</span>
                      </div>
                      <div className="text-sm text-gray-500 mb-3">
                        Best Streak: {habit.longestStreak} days
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMarkHabitComplete(habit.id)}
                        disabled={completedToday}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                          completedToday
                            ? 'bg-green-100 text-green-800 cursor-not-allowed'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {completedToday ? 'Completed Today' : 'Mark Complete'}
                      </button>
                    </div>

                    <div className="text-sm text-gray-500 mt-3">
                      <div>Frequency: {habit.frequency}</div>
                      <div>Category: {habit.category}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Goal</h2>
            <form onSubmit={handleAddGoal}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Goal Title*</label>
                  <input
                    type="text"
                    required
                    value={goalForm.title}
                    onChange={(e) => setGoalForm({...goalForm, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Learn Spanish"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={goalForm.description}
                    onChange={(e) => setGoalForm({...goalForm, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Become conversational in Spanish"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={goalForm.category}
                      onChange={(e) => setGoalForm({...goalForm, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="personal">Personal</option>
                      <option value="health">Health</option>
                      <option value="career">Career</option>
                      <option value="education">Education</option>
                      <option value="finance">Finance</option>
                      <option value="relationships">Relationships</option>
                      <option value="hobbies">Hobbies</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <select
                      value={goalForm.priority}
                      onChange={(e) => setGoalForm({...goalForm, priority: e.target.value as 'low' | 'medium' | 'high'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Date*</label>
                  <input
                    type="date"
                    required
                    value={goalForm.targetDate}
                    onChange={(e) => setGoalForm({...goalForm, targetDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Milestones</label>
                  {goalForm.milestones.map((milestone, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={milestone}
                        onChange={(e) => {
                          const newMilestones = [...goalForm.milestones];
                          newMilestones[index] = e.target.value;
                          setGoalForm({...goalForm, milestones: newMilestones});
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`Milestone ${index + 1}`}
                      />
                      {goalForm.milestones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newMilestones = goalForm.milestones.filter((_, i) => i !== index);
                            setGoalForm({...goalForm, milestones: newMilestones});
                          }}
                          className="px-3 py-2 text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setGoalForm({...goalForm, milestones: [...goalForm.milestones, '']})}
                    className="text-blue-500 hover:text-blue-700 text-sm"
                  >
                    + Add Milestone
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Add Goal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddGoal(false);
                    setGoalForm({
                      title: '',
                      description: '',
                      category: 'personal',
                      priority: 'medium',
                      targetDate: '',
                      milestones: ['']
                    });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Habit Modal */}
      {showAddHabit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Habit</h2>
            <form onSubmit={handleAddHabit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Habit Title*</label>
                  <input
                    type="text"
                    required
                    value={habitForm.title}
                    onChange={(e) => setHabitForm({...habitForm, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Exercise for 30 minutes"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={habitForm.description}
                    onChange={(e) => setHabitForm({...habitForm, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Daily cardio and strength training"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={habitForm.category}
                      onChange={(e) => setHabitForm({...habitForm, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="health">Health</option>
                      <option value="productivity">Productivity</option>
                      <option value="learning">Learning</option>
                      <option value="mindfulness">Mindfulness</option>
                      <option value="social">Social</option>
                      <option value="hobbies">Hobbies</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                    <select
                      value={habitForm.frequency}
                      onChange={(e) => setHabitForm({...habitForm, frequency: e.target.value as 'daily' | 'weekly' | 'monthly'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Days</label>
                  <input
                    type="number"
                    min="1"
                    value={habitForm.targetDays}
                    onChange={(e) => setHabitForm({...habitForm, targetDays: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="7"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Number of days per {habitForm.frequency.replace('ly', '')} period
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Add Habit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddHabit(false);
                    setHabitForm({
                      title: '',
                      description: '',
                      category: 'health',
                      frequency: 'daily',
                      targetDays: 7
                    });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
