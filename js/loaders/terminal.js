import { createLoader } from './create-loader.js';

export const terminalLoader = createLoader(
    () => import('../modules/terminal.js?v=no-pw-autofill-1'),
    { label: 'terminal.js' },
);
