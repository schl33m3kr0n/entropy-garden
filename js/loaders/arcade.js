import { createLoader } from './create-loader.js';

export const arcadeLoader = createLoader(
    () => import('../modules/arcade.js'),
    { label: 'arcade.js' },
);
