import React from 'react';
import MeetSomeone from '../../components/Home/MeetSomeone';
import MeetSomeoneMobile from '../../components/Mobile/MeetSomeoneMobile';

const Page = () => {
    return (
        <>
            <div className='hidden md:block'>
                <MeetSomeone />
            </div>
            <div className='block md:hidden'>
                <MeetSomeoneMobile />

            </div>
        </>
    );
};

export default Page;