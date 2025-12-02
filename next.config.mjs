/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // อนุญาตให้โหลดรูปภาพจากทุก hostname
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    // หรือใช้ unoptimized สำหรับ external images (เร็วกว่าแต่ไม่ optimize)
    // unoptimized: true,
  },
};

export default nextConfig;


