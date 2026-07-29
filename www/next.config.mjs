/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/docs/:path*',
        destination: 'https://docs.biscuit.tomlin7.com/',
        permanent: true,
      },
    ];
  },
};

export default config;
