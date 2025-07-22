'use client'
import siteMetadata from '@/data/siteMetadata'
import headerNavLinks from '@/data/headerNavLinks'
// import Logo from '@/data/avatar.jpeg'
import Link from './Link'
import MobileNav from './MobileNav'
import ThemeSwitch from './ThemeSwitch'
import SearchButton from './SearchButton'
import Imgage from '@/components/Image'
import { usePathname } from 'next/navigation'

const Header = () => {
  const pathname = usePathname()
  let headerClass = 'flex items-center w-full bg-white dark:bg-gray-950 justify-between py-10'
  if (siteMetadata.stickyNav) {
    headerClass += ' sticky top-0 z-50'
  }

  return (
    <header className={headerClass}>
      <Link href="/" aria-label={siteMetadata.headerTitle}>
        <div className="flex items-center justify-between">
          <div className="mr-3">
            <Imgage
              width={50}
              height={50}
              className="rounded-4xl"
              src={'/avatar.jpeg'}
              alt="logo"
            />
          </div>
          {typeof siteMetadata.headerTitle === 'string' ? (
            <div className="hidden h-6 text-2xl font-semibold sm:block">
              {siteMetadata.headerTitle}
            </div>
          ) : (
            siteMetadata.headerTitle
          )}
        </div>
      </Link>
      <div className="flex items-center space-x-4 leading-5 sm:-mr-6 sm:space-x-6">
        <div className="no-scrollbar hidden max-w-40 items-center gap-x-4 overflow-x-auto sm:flex md:max-w-72 lg:max-w-96">
          {headerNavLinks.map((link) => {
            const isActive = link.href === pathname
            const baseClasses = 'm-1 font-medium text-gray-900 dark:text-gray-100'
            const activeClasses = isActive ? 'text-primary-500 dark:text-primary-500' : ''
            const hoverClasses = 'hover:text-primary-500 dark:hover:text-primary-400'

            return (
              <Link
                key={link.title}
                href={link.href}
                className={`${baseClasses} ${activeClasses} ${hoverClasses}`}
              >
                {link.title}
              </Link>
            )
          })}
        </div>
        <SearchButton />
        <ThemeSwitch />
        <MobileNav />
      </div>
    </header>
  )
}

export default Header
