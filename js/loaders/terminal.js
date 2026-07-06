import { createLoader } from './create-loader.js';

export const terminalLoader = createLoader(
    () => import('../modules/terminal.js'),
    { label: 'terminal.js' },
);
