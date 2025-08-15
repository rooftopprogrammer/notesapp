import withPWA from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
};

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
})(nextConfig);
