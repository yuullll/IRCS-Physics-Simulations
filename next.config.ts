import type {NextConfig} from 'next';
import {PHASE_DEVELOPMENT_SERVER} from 'next/constants';

export default function nextConfig(phase: string): NextConfig {
  return {
    distDir:
      phase === PHASE_DEVELOPMENT_SERVER
        ? 'node_modules/.cache/next-dev'
        : '.next',
    reactStrictMode: true,
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
      ignoreBuildErrors: false,
    },
    // Allow access to remote image placeholder.
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'picsum.photos',
          port: '',
          pathname: '/**', // This allows any path under the hostname
        },
      ],
    },
    output: 'standalone',
    outputFileTracingExcludes: {
      '*': [
        '**/node_modules/typescript/**',
        '**/node_modules/eslint/**',
        '**/node_modules/firebase-tools/**',
        '**/node_modules/webpack/**',
        '**/node_modules/@swc/core-linux-x64-gnu/**',
        '**/node_modules/@swc/core-linux-x64-musl/**',
        '**/next/dist/compiled/babel/**',
        '**/next/dist/compiled/next-devtools/**',
        '**/next/dist/server/typescript/**',
        '**/next/dist/server/next-typescript.js',
        '**/next/dist/server/dev/next-dev-server.js',
        '**/.aistudio/**',
      ],
    },
    experimental: {
      webpackBuildWorker: true,
      parallelServerBuildTraces: true,
    },
    transpilePackages: ['motion'],
    ...(phase === PHASE_DEVELOPMENT_SERVER
      ? {
          webpack: (config, {dev}) => {
            // HMR is disabled in AI Studio via DISABLE_HMR env var.
            // Do not modify—file watching is disabled to prevent flickering during agent edits.
            if (dev && process.env.DISABLE_HMR === 'true') {
              config.watchOptions = {
                ignored: /.*/,
              };
            }
            return config;
          },
        }
      : {}),
  };
}
