import React from 'react'


import MobileHome from '@/components/Mobile/MobileHome'
import DesktopHome from '@/components/Mobile/DesktopHome'
const MyComponent = () => {
  return (
    <div>
      <div className='hidden md:block'>
        <DesktopHome />
      </div>
      <div className='block md:hidden'>
        <MobileHome />
      </div>
    </div>
  )
}

export default MyComponent
