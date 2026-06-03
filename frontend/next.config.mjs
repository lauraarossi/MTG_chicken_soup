/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    // Explicit paths avoid conflict with NextAuth's /api/auth/* route handler
    return [
      { source: "/api/users/:path*",  destination: `${backendUrl}/api/users/:path*` },
      { source: "/api/decks/:path*",  destination: `${backendUrl}/api/decks/:path*` },
      { source: "/api/chat/:path*",   destination: `${backendUrl}/api/chat/:path*` },
      { source: "/api/health",        destination: `${backendUrl}/api/health` },
    ];
  },
};

export default nextConfig;
