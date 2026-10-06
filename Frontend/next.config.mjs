import createNextIntlPlugin from 'next-intl/plugin';

// Point the plugin at our request handler so server components can
// resolve messages without us wiring them up manually. The path is
// resolved relative to the project root.
const withNextIntl = createNextIntlPlugin('./src/i18n/request.js');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // A self-contained server in .next/standalone: the Docker image ships
  // only that, not the whole node_modules.
  output: 'standalone',
};

export default withNextIntl(nextConfig);
