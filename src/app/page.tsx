export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <div className="text-center sm:text-left">
          <h1 className="text-4xl sm:text-6xl font-bold text-gray-800 dark:text-gray-100 mb-4">
            RNotes
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Progressive Web App Starter
          </p>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 max-w-2xl">
          <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-3">
            🚀 Starter App Ready!
          </h2>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
            <li>✅ Next.js 15 with App Router</li>
            <li>✅ TypeScript configured</li>
            <li>✅ Tailwind CSS for styling</li>
            <li>✅ Firebase SDK installed</li>
            <li>✅ PWA configuration ready</li>
            <li>✅ Authentication context setup</li>
          </ul>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 max-w-2xl">
          <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-3">
            📝 Next Steps:
          </h3>
          <ol className="text-sm text-yellow-700 dark:text-yellow-300 space-y-2 list-decimal list-inside">
            <li>Update Firebase config in <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">src/lib/firebase.ts</code></li>
            <li>Add PWA icons to the <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">public</code> folder</li>
            <li>Start building your note-taking features</li>
            <li>Test PWA functionality</li>
          </ol>
        </div>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href="https://firebase.google.com/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            🔥 Firebase Docs
          </a>
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto"
            href="https://nextjs.org/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            📚 Next.js Docs
          </a>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4 text-sm text-gray-600 dark:text-gray-400"
          href="https://nextjs.org/learn"
          target="_blank"
          rel="noopener noreferrer"
        >
          📖 Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4 text-sm text-gray-600 dark:text-gray-400"
          href="https://vercel.com/templates?framework=next.js"
          target="_blank"
          rel="noopener noreferrer"
        >
          💡 Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4 text-sm text-gray-600 dark:text-gray-400"
          href="https://firebase.google.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          🔥 Firebase
        </a>
      </footer>
    </div>
  );
}
