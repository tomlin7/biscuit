// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Biscuit Docs',
  tagline: 'Developer guide, Extensions API documentation',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://billyeatcookies.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/biscuit/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'billyeatcookies', // Usually your GitHub org/user name.
  projectName: 'biscuit', // Usually your repo name.
  trailingSlash: false,
  deploymentBranch: 'docs',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/billyeatcookies/biscuit/tree/main/docs/docs/',
        },
        blog: {
          showReadingTime: true,
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/billyeatcookies/biscuit/tree/main/docs/blogs/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/docusaurus-social-card.jpg',
      navbar: {
        title: 'Biscuit Docs',
        logo: {
          alt: 'Biscuit logo',
          src: 'img/logo.png',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Tutorial',
          },
          {to: '/blog', label: 'Blog', position: 'left'},
          {
            href: 'https://github.com/billyeatcookies/biscuit',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Developer Guide',
                to: '/docs/intro',
              },
              {
                label: 'Extensions API',
                to: '/docs/intro',
              },
              {
                label: 'User Guide',
                to: '/docs/intro',
              },
            ],
          },
          {
            title: 'Links',
            items: [
              {
                label: 'Biscuit',
                href: 'https://github.com/billyeatcookies/biscuit',
              },
              {
                label: 'Extensions',
                href: 'https://github.com/billyeatcookies/biscuit-extensions',
              },
              {
                label: 'Cupcake',
                href: 'https://github.com/billyeatcookies/cupcake',
              },
              {
                label: 'Cupcake on Pypi',
                href: 'https://pypi.org/project/biscuit-editor',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Blog',
                to: '/blog',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/billyeatcookies/biscuit',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} billyeatcookies. Built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
