import type { LabId, UnitId } from '../../content';

/** Each lab sits at the end of the unit holding the last concept it needs. */
export const LAB_UNIT: Readonly<Record<LabId, UnitId>> = {
  'lab-01': 'u3',
  'lab-02': 'u5',
  'lab-03': 'u5',
  jsonserver: 'u5',
};
