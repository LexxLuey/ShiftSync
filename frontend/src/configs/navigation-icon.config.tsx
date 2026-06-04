import {
    PiHouseLineDuotone,
    PiArrowsInDuotone,
    PiBookOpenUserDuotone,
    PiBookBookmarkDuotone,
    PiAcornDuotone,
    PiBagSimpleDuotone,
    PiBuildingsDuotone,
    PiCalendarDuotone,
    PiChartBarDuotone,
    PiClockDuotone,
    PiFileTextDuotone,
    PiUsersThreeDuotone,
    PiArrowsClockwiseDuotone,
} from 'react-icons/pi'
import type { JSX } from 'react'

export type NavigationIcons = Record<string, JSX.Element>

const navigationIcon: NavigationIcons = {
    home: <PiHouseLineDuotone />,
    singleMenu: <PiAcornDuotone />,
    collapseMenu: <PiArrowsInDuotone />,
    groupSingleMenu: <PiBookOpenUserDuotone />,
    groupCollapseMenu: <PiBookBookmarkDuotone />,
    groupMenu: <PiBagSimpleDuotone />,
    calendar: <PiCalendarDuotone />,
    chartBar: <PiChartBarDuotone />,
    clock: <PiClockDuotone />,
    documentText: <PiFileTextDuotone />,
    userGroup: <PiUsersThreeDuotone />,
    switchHorizontal: <PiArrowsClockwiseDuotone />,
    building: <PiBuildingsDuotone />,
}

export default navigationIcon
