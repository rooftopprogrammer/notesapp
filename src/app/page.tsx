export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-4xl sm:text-6xl font-bold text-gray-800 dark:text-gray-100 mb-6">
          RNotes
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          Production Application Manager
        </p>
        
        <a
          className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
          href="/prodapps"
        >
          � Production Applications
        </a>
      </div>
    </div>
  );
}
