import { createLoader } from './create-loader.js';

export const singularityLoader = createLoader(
    () => import('../modules/singularity.js?v=26'),
    { label: 'singularity.js' },
);
