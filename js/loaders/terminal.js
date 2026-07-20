import { createLoader } from './create-loader.js';

export const terminalLoader = createLoader(
    () => import('../modules/terminal.js?v=caesar-scroll-3'),
    { label: 'terminal.js' },
);
