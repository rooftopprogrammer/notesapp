'use client';

import Link from 'next/link';

export default function StudyTracker() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-indigo-950 dark:to-purple-950 p-4 sm:p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="backdrop-blur-xl bg-white/30 dark:bg-gray-800/30 rounded-2xl p-8 border border-white/20 dark:border-gray-700/30 shadow-xl">
          <div className="flex items-center mb-6">
            <Link 
              href="/"
              className="group mr-6 p-3 rounded-xl backdrop-blur-sm bg-white/60 dark:bg-gray-800/60 border border-white/40 dark:border-gray-700/40 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
            >
              <svg className="w-6 h-6 text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-900 to-purple-900 dark:from-indigo-300 dark:to-purple-300 bg-clip-text text-transparent mb-2">
                Study Tracker
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                Track your learning progress, study sessions, and academic goals
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Study Categories Grid */}
      <div className="max-w-6xl mx-auto mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Study Sessions */}
          <Link
            href="/studytracker/sessions"
            className="group backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 rounded-2xl border border-white/30 dark:border-gray-700/30 p-8 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all duration-300 transform hover:scale-[1.02] shadow-xl hover:shadow-2xl"
          >
            <div className="flex items-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/30 rounded-2xl flex items-center justify-center group-hover:from-blue-200 group-hover:to-blue-300 dark:group-hover:from-blue-800/70 dark:group-hover:to-blue-700/50 transition-all duration-300 shadow-lg group-hover:shadow-xl border border-blue-200/50 dark:border-blue-700/50">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">Study Sessions</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Track study time, subjects, and productivity</p>
          </Link>

          {/* Courses */}
          <Link
            href="/studytracker/courses"
            className="group backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 rounded-2xl border border-white/30 dark:border-gray-700/30 p-8 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all duration-300 transform hover:scale-[1.02] shadow-xl hover:shadow-2xl"
          >
            <div className="flex items-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-800/30 rounded-2xl flex items-center justify-center group-hover:from-green-200 group-hover:to-green-300 dark:group-hover:from-green-800/70 dark:group-hover:to-green-700/50 transition-all duration-300 shadow-lg group-hover:shadow-xl border border-green-200/50 dark:border-green-700/50">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors duration-200">Courses</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Manage courses, syllabi, and progress</p>
          </Link>

          {/* Assignments */}
          <Link
            href="/studytracker/assignments"
            className="group backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 rounded-2xl border border-white/30 dark:border-gray-700/30 p-8 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all duration-300 transform hover:scale-[1.02] shadow-xl hover:shadow-2xl"
          >
            <div className="flex items-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/50 dark:to-purple-800/30 rounded-2xl flex items-center justify-center group-hover:from-purple-200 group-hover:to-purple-300 dark:group-hover:from-purple-800/70 dark:group-hover:to-purple-700/50 transition-all duration-300 shadow-lg group-hover:shadow-xl border border-purple-200/50 dark:border-purple-700/50">
                <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-200">Assignments</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Track homework, projects, and deadlines</p>
          </Link>

          {/* Exams */}
          <Link
            href="/studytracker/exams"
            className="group backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 rounded-2xl border border-white/30 dark:border-gray-700/30 p-8 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all duration-300 transform hover:scale-[1.02] shadow-xl hover:shadow-2xl"
          >
            <div className="flex items-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/50 dark:to-red-800/30 rounded-2xl flex items-center justify-center group-hover:from-red-200 group-hover:to-red-300 dark:group-hover:from-red-800/70 dark:group-hover:to-red-700/50 transition-all duration-300 shadow-lg group-hover:shadow-xl border border-red-200/50 dark:border-red-700/50">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors duration-200">Exams</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Schedule exams and track preparation</p>
          </Link>

          {/* Study Goals */}
          <Link
            href="/studytracker/goals"
            className="group backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 rounded-2xl border border-white/30 dark:border-gray-700/30 p-8 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all duration-300 transform hover:scale-[1.02] shadow-xl hover:shadow-2xl"
          >
            <div className="flex items-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/50 dark:to-yellow-800/30 rounded-2xl flex items-center justify-center group-hover:from-yellow-200 group-hover:to-yellow-300 dark:group-hover:from-yellow-800/70 dark:group-hover:to-yellow-700/50 transition-all duration-300 shadow-lg group-hover:shadow-xl border border-yellow-200/50 dark:border-yellow-700/50">
                <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors duration-200">Study Goals</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Set and track learning objectives</p>
          </Link>

          {/* Study Materials */}
          <Link
            href="/studytracker/materials"
            className="group backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 rounded-2xl border border-white/30 dark:border-gray-700/30 p-8 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all duration-300 transform hover:scale-[1.02] shadow-xl hover:shadow-2xl"
          >
            <div className="flex items-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-100 to-teal-200 dark:from-teal-900/50 dark:to-teal-800/30 rounded-2xl flex items-center justify-center group-hover:from-teal-200 group-hover:to-teal-300 dark:group-hover:from-teal-800/70 dark:group-hover:to-teal-700/50 transition-all duration-300 shadow-lg group-hover:shadow-xl border border-teal-200/50 dark:border-teal-700/50">
                <svg className="w-8 h-8 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors duration-200">Study Materials</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Organize books, notes, and resources</p>
          </Link>

        </div>
      </div>

      {/* Study Overview Section */}
      <div className="max-w-6xl mx-auto">
        <div className="backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 rounded-2xl border border-white/30 dark:border-gray-700/30 p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/50 dark:to-indigo-800/30 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">Study Overview</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center backdrop-blur-sm bg-blue-50/50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200/30 dark:border-blue-700/30">
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-400 dark:to-blue-500 bg-clip-text text-transparent mb-3">0</div>
              <div className="text-slate-700 dark:text-slate-300 font-medium flex items-center justify-center gap-2">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Active Courses
              </div>
            </div>
            <div className="text-center backdrop-blur-sm bg-purple-50/50 dark:bg-purple-900/20 rounded-xl p-6 border border-purple-200/30 dark:border-purple-700/30">
              <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 dark:from-purple-400 dark:to-purple-500 bg-clip-text text-transparent mb-3">0</div>
              <div className="text-slate-700 dark:text-slate-300 font-medium flex items-center justify-center gap-2">
                <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Pending Assignments
              </div>
            </div>
            <div className="text-center backdrop-blur-sm bg-green-50/50 dark:bg-green-900/20 rounded-xl p-6 border border-green-200/30 dark:border-green-700/30">
              <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-green-700 dark:from-green-400 dark:to-green-500 bg-clip-text text-transparent mb-3">0h</div>
              <div className="text-slate-700 dark:text-slate-300 font-medium flex items-center justify-center gap-2">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Study Hours This Week
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
