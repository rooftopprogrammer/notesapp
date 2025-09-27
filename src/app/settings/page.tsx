'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { aiExtractor } from '@/lib/ai/pdf-extractor';

export default function SettingsPage() {
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [showApiKeys, setShowApiKeys] = useState(false);

  useEffect(() => {
    setAiStatus(aiExtractor.getUsageStats());
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-blue-600 hover:text-blue-800">
                ← Back to Home
              </Link>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Settings
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* AI Services Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              AI Services for PDF Extraction
            </h2>
          </div>

          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              Why use AI for PDF extraction?
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Better family member detection with health conditions</li>
              <li>• More accurate meal timing and descriptions</li>
              <li>• Smart grocery categorization and prioritization</li>
              <li>• Nutritional insights and dietary guidelines extraction</li>
              <li>• Handles various PDF formats and layouts</li>
            </ul>
          </div>

          {/* Service Status */}
          {aiStatus && (
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                Current Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiStatus.services.map((service: any) => (
                  <div 
                    key={service.name}
                    className={`p-4 rounded-lg border ${
                      service.enabled && service.hasApiKey
                        ? 'border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                        : 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {service.name}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        service.enabled && service.hasApiKey
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                        {service.enabled && service.hasApiKey ? 'Active' : 'Not Configured'}
                      </span>
                    </div>
                    
                    {service.enabled && service.hasApiKey ? (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <p>Requests: {service.requestCount}/{service.limit}</p>
                        <p>Remaining: {service.remaining}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Add API key to enable
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* API Keys Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-md font-medium text-gray-900 dark:text-white">
                API Keys Configuration
              </h3>
              <button
                onClick={() => setShowApiKeys(!showApiKeys)}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
              >
                {showApiKeys ? 'Hide' : 'Show'} Configuration
              </button>
            </div>

            {showApiKeys && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-700">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Security Note:</strong> API keys should be added to your <code>.env.local</code> file, not entered here.
                    This interface is for monitoring only.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      🌟 Google AI Studio (Gemini) - Recommended
                    </h4>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded border text-sm">
                      <p className="text-gray-600 dark:text-gray-400 mb-2">
                        Best free tier: 60 requests/minute, 1500/day
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-gray-700 dark:text-gray-300">
                        <li>Visit <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">aistudio.google.com</a></li>
                        <li>Create account and get API key</li>
                        <li>Add to .env.local: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">NEXT_PUBLIC_GOOGLE_AI_API_KEY=your_key</code></li>
                      </ol>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      🤖 OpenAI (GPT-3.5)
                    </h4>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded border text-sm">
                      <p className="text-gray-600 dark:text-gray-400 mb-2">
                        $5 free credits (3-month expiry)
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-gray-700 dark:text-gray-300">
                        <li>Visit <a href="https://platform.openai.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">platform.openai.com</a></li>
                        <li>Create account, verify phone, and get API key</li>
                        <li>Add to .env.local: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">NEXT_PUBLIC_OPENAI_API_KEY=sk-your_key</code></li>
                      </ol>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      🤗 Hugging Face
                    </h4>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded border text-sm">
                      <p className="text-gray-600 dark:text-gray-400 mb-2">
                        1000 requests/month free
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-gray-700 dark:text-gray-300">
                        <li>Visit <a href="https://huggingface.co/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">huggingface.co</a></li>
                        <li>Create account and get access token</li>
                        <li>Add to .env.local: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">NEXT_PUBLIC_HUGGINGFACE_API_KEY=hf_your_key</code></li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-700">
                  <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                    💡 Pro Tips
                  </h4>
                  <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                    <li>• Start with Google Gemini (best free tier)</li>
                    <li>• Add multiple services for redundancy</li>
                    <li>• System automatically falls back if one fails</li>
                    <li>• Usage limits reset monthly</li>
                    <li>• Works fine without AI too (regex fallback)</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Other Settings Sections */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Other Settings
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            More configuration options will be added here as the application grows.
          </p>
        </div>
      </div>
    </div>
  );
}