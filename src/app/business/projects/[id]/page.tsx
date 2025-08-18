import Link from 'next/link';

// Static export requires generateStaticParams for dynamic routes
export async function generateStaticParams() {
  // Return at least one static path to satisfy the export requirement
  return [
    { id: 'placeholder' }
  ];
}

export default function ProjectDetails() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Project Details
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          This page has been simplified for static deployment.
        </p>
        <Link 
          href="/business/projects" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md transition-colors"
        >
          Back to Projects
        </Link>
      </div>
    </div>
  );
}
