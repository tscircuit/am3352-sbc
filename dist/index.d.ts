import * as react from 'react';
import { FanoutTracePath } from '@tscircuit/props';

declare function Board({ ddrRoutes, routePeripherals, peripheralRoutes, solveDdr, placementOnly, }?: {
    ddrRoutes?: FanoutTracePath[];
    routePeripherals?: boolean;
    peripheralRoutes?: FanoutTracePath[];
    solveDdr?: boolean;
    placementOnly?: boolean;
}): any;

export { Board as default };