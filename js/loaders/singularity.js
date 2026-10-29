import { createLoader } from './create-loader.js';

export const singularityLoader = createLoader(
    () => import('../modules/singularity.js?v=pause-prefs-29'),
    { label: 'singularity.js' },
);
