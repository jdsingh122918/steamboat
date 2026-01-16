import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Enable WebAssembly support
  webpack: (config, { isServer }) => {
    // Enable async WebAssembly
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Configure WASM file handling
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Resolve WASM package imports
    if (!isServer) {
      const cratesDir = path.resolve(__dirname, '../../crates');

      config.resolve.alias = {
        ...config.resolve.alias,
        'expense-optimizer': path.join(cratesDir, 'expense-optimizer/pkg'),
        'finance-core': path.join(cratesDir, 'finance-core/pkg'),
        'media-processor': path.join(cratesDir, 'media-processor/pkg'),
      };
    }

    // In CI/Vercel, use mocks instead of WASM modules (Rust not available)
    const isCI = process.env.CI === 'true' || process.env.VERCEL === '1';
    if (isServer) {
      if (isCI) {
        // Use mock implementations in CI where WASM isn't built
        const mocksDir = path.resolve(__dirname, '__mocks__');
        config.resolve.alias = {
          ...config.resolve.alias,
          'expense-optimizer': path.join(mocksDir, 'expense-optimizer.ts'),
          'finance-core': path.join(mocksDir, 'finance-core.ts'),
          'media-processor': path.join(mocksDir, 'media-processor.ts'),
        };
      } else {
        // In production, externalize WASM modules
        config.externals = config.externals || [];
        if (Array.isArray(config.externals)) {
          config.externals.push({
            'expense-optimizer': 'expense-optimizer',
            'finance-core': 'finance-core',
            'media-processor': 'media-processor',
          });
        }
      }
    }

    return config;
  },

  // Headers for WASM files
  async headers() {
    return [
      {
        source: '/_next/static/wasm/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/wasm',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/wasm/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/wasm',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
