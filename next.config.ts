import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'qmhzfurvlbolbftdccjq.supabase.co',
      },
    ]
  }
};

export default nextConfig;
