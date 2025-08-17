import withPWA from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed output: 'export' since we're using dynamic features
  trailingSlash: true,
  images: {
    unoptimized: true
  }
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
