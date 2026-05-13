import { cloneElement } from 'react'
import type { CommonProps } from '@/@types/common'
import Image from 'next/image'

type SideProps = CommonProps

const Side = ({ children, ...rest }: SideProps) => {
    return (
        <div className="flex h-full p-6 bg-white dark:bg-gray-800">
            <div className=" flex flex-col justify-center items-center flex-1">
                <div className="w-full xl:max-w-[450px] px-8 max-w-[380px]">
                    {children
                        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          cloneElement(children as React.ReactElement<any>, {
                              ...rest,
                          })
                        : null}
                </div>
            </div>
            <div className="py-6 px-10 lg:flex flex-col flex-1 justify-between hidden rounded-3xl items-end relative max-w-[520px] 2xl:max-w-[720px]">
                <div className="absolute h-full w-full top-0 left-0 rounded-3xl bg-white dark:bg-gray-900 flex items-center justify-center p-8">
                    <Image
                        src="/img/logo/cfc-kids-logo-2.jpeg"
                        alt="CFC KIDS ShiftSync"
                        width={942}
                        height={1080}
                        className="h-full w-full object-contain rounded-2xl"
                        priority
                    />
                </div>
            </div>
        </div>
    )
}

export default Side
