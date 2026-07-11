export const createDefaultPublicData = () => ({
  settings: {
    title: '我的导航',
    icon: '',
    footerText: `© ${new Date().getFullYear()} NaviLink. Minimalism.`
  },
  categories: [
    { id: 'cat_1', name: '常用工具', order: 0 },
    { id: 'cat_2', name: '娱乐摸鱼', order: 1 }
  ],
  cards: [
    {
      id: 'card_1',
      categoryId: 'cat_1',
      title: 'Google',
      description: '全球最大的搜索引擎',
      url: 'https://google.com/',
      icon: 'https://www.google.com/favicon.ico',
      order: 0
    },
    {
      id: 'card_2',
      categoryId: 'cat_1',
      title: 'GitHub',
      description: '代码托管与协作平台',
      url: 'https://github.com/',
      icon: 'https://github.com/favicon.ico',
      order: 1
    }
  ]
});
