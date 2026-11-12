export const NODE_IDS = [
  'n01',
  'n02',
  'n03',
  'n04',
  'n05',
  'n06',
  'n07',
  'n08',
  'n09',
  'n10',
  'n11',
  'n12',
  'n13',
  'n14',
] as const;

export type NodeId = (typeof NODE_IDS)[number];

export const UNIT_IDS = ['u1', 'u2', 'u3', 'u4', 'u5'] as const;

export type UnitId = (typeof UNIT_IDS)[number];

export const LAB_IDS = ['lab-01', 'lab-02', 'lab-03', 'jsonserver'] as const;

export type LabId = (typeof LAB_IDS)[number];

export interface Unit {
  id: UnitId;
  title: string;
  nodes: readonly NodeId[];
}

export interface TreeNode {
  id: NodeId;
  title: string;
  /** Aulas that feed this node, in the canonical course order. */
  aulas: readonly number[];
  unitId: UnitId;
}

export const UNITS: readonly Unit[] = [
  { id: 'u1', title: 'Fundamentos da Web', nodes: ['n01', 'n02'] },
  { id: 'u2', title: 'HTML', nodes: ['n03', 'n04', 'n05'] },
  { id: 'u3', title: 'CSS', nodes: ['n06', 'n07', 'n08', 'n09'] },
  { id: 'u4', title: 'Design e Mobile', nodes: ['n10', 'n11', 'n12'] },
  { id: 'u5', title: 'Dados e JavaScript', nodes: ['n13', 'n14'] },
];

export const NODES: readonly TreeNode[] = [
  { id: 'n01', title: 'Introdução à Web e tecnologias', aulas: [110, 120], unitId: 'u1' },
  {
    id: 'n02',
    title: 'Arquitetura, URI/URL/URN e dinâmica da Web',
    aulas: [130, 131, 150],
    unitId: 'u1',
  },
  { id: 'n03', title: 'Sintaxe e elementos HTML', aulas: [160, 161], unitId: 'u2' },
  { id: 'n04', title: 'Formulários', aulas: [162], unitId: 'u2' },
  { id: 'n05', title: 'Semântica', aulas: [163], unitId: 'u2' },
  { id: 'n06', title: 'CSS: introdução e sintaxe', aulas: [170, 171], unitId: 'u3' },
  { id: 'n07', title: 'Propriedades CSS', aulas: [172], unitId: 'u3' },
  { id: 'n08', title: 'Viewport e Media Queries', aulas: [173], unitId: 'u3' },
  { id: 'n09', title: 'Flexbox e Grid', aulas: [174], unitId: 'u3' },
  { id: 'n10', title: 'UX Design e projeto web', aulas: [210], unitId: 'u4' },
  { id: 'n11', title: 'Web e computação móvel', aulas: [220], unitId: 'u4' },
  { id: 'n12', title: 'Bootstrap', aulas: [230], unitId: 'u4' },
  { id: 'n13', title: 'JSON e APIs', aulas: [240, 250], unitId: 'u5' },
  { id: 'n14', title: 'Introdução ao JavaScript', aulas: [310], unitId: 'u5' },
];

export const NODE_BY_ID: Record<NodeId, TreeNode> = Object.fromEntries(
  NODES.map((node) => [node.id, node]),
) as Record<NodeId, TreeNode>;

/** Canonical aula order: the table order, flattened. */
export const AULA_ORDER: readonly number[] = NODES.flatMap((node) => node.aulas);
