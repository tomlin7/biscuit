/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/docs/:path*',
        destination: 'https://biscuit.mintlify.site/',
        permanent: true,
      },
    ];
  },
};

export default config;
