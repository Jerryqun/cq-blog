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
    imgSrc: '/static/images/time-machine.jpg',
    href: 'https://jerryqun.github.io/playground-react/#/~demos/docs-playground',
  },
]

export default projectsData
