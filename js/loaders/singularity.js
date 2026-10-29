import { createLoader } from './create-loader.js';

export const singularityLoader = createLoader(
    () => import('../modules/singularity.js?v=pause-prefs-30'),
    { label: 'singularity.js' },
);
