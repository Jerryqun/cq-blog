interface Project {
  title: string
  description: string
  href?: string
  imgSrc?: string
}

const projectsData: Project[] = [
  {
    title: 'pc端通用saas模板',
    description: `React18通用后台管理系统，基于React18+ReactRouter7.0+AntD5+TypeScript5.0+Vite实现通用后台`,
    imgSrc: '/static/images/saas.png',
    href: 'https://jerryqun.github.io/saas-temple/#/',
  },
  {
    title: 'React在线编辑器',
    description: `基于react17、antd4、monaco-editor实现的在线编辑器`,
    imgSrc: '/static/images/react-editor.png',
    href: 'https://jerryqun.github.io/playground-react/#/~demos/docs-playground',
  },
  {
    title: '个人知识积累',
    description: `前端知识，工作中遇到的坑，个人知识积累`,
    imgSrc: '/static/images/write.png',
    href: 'https://jerryqun.github.io/bad-writing/',
  },
]

export default projectsData
