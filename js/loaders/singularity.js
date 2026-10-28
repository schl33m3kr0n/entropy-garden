import { createLoader } from './create-loader.js';

export const singularityLoader = createLoader(
    () => import('../modules/singularity.js?v=25'),
    { label: 'singularity.js' },
);
