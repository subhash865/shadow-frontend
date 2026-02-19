/** @type {import('next').NextConfig} */
const nextConfig = {
    // Strict mode for catching bugs
    reactStrictMode: true,

    // Image optimization
    images: {
        formats: ['image/webp', 'image/avif'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920],
        imageSizes: [16, 32, 48, 64, 96, 128, 256],
    },

    // SWC minification (faster than Terser)
    swcMinify: true,

    // Remove x-powered-by header
    poweredByHeader: false,

    // Compress responses
    compress: true,

    // Optimize package imports — tree-shake lucide-react
    experimental: {
        optimizePackageImports: ['lucide-react'],
    },
};

module.exports = nextConfig;
