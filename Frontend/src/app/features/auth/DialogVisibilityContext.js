import {createContext} from 'react';

// React portals retain this context even when their DOM leaves the locked app wrapper.
export const DialogVisibilityContext=createContext(true);
