import withPWA from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export for Firebase Hosting
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Disable dynamic routes for static export
  generateBuildId: async () => {
    return 'build'
  },
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default withPWA({
  dest: "public",
  disable: false, // Enable PWA in development for testing
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "offlineCache",
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
})(nextConfig);
