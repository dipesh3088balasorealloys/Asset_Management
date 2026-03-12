/**
 * Category Tree Configuration
 * Defines the hierarchical structure for ManageEngine-style asset navigation.
 * DB stores leaf values (e.g. 'Laptop', 'Server'). Parent nodes resolve to arrays of leaves.
 */

// All valid leaf categories stored in database
export const ASSET_CATEGORIES = [
  'AccessPoint', 'Server', 'Desktop',
  'Laptop', 'iPad', 'Tablet', 'Printer', 'Router', 'Switch',
  'Projector', 'Scanner', 'CCTV', 'VideoConference',
  'Monitor', 'Keyboard', 'Mouse', 'Headset', 'Webcam', 'DockingStation', 'FRS',
  'Other',
];

// Display-friendly names
export const ASSET_CATEGORY_LABELS = {
  AccessPoint: 'Access Point',
  Server: 'Server',
  Desktop: 'Desktop',
  Laptop: 'Laptop',
  Printer: 'Printer',
  Router: 'Router',
  Switch: 'Switch',
  Projector: 'Projector',
  Scanner: 'Scanner',
  Monitor: 'Monitor',
  Keyboard: 'Keyboard',
  Mouse: 'Mouse',
  Headset: 'Headset',
  Webcam: 'Webcam',
  DockingStation: 'Docking Station',
  FRS: 'FRS',
  iPad: 'iPad',
  Tablet: 'Tablet',
  CCTV: 'CCTV',
  VideoConference: 'Video Conference System',
  Other: 'Other',
};

// Categories that require unique serial number (qty always 1)
// All Assets (IT + Non-IT) need serial; only Components use quantity
export const SERIAL_REQUIRED_CATEGORIES = [
  'AccessPoint', 'Server', 'Desktop', 'Laptop', 'iPad', 'Tablet', 'Printer', 'Router', 'Switch',
  'Projector', 'Scanner', 'CCTV', 'VideoConference',
];

// Tree structure for sidebar navigation
// Each node: { id, label, children?, categories? }
// Leaf nodes have `categories` (array of DB values to filter)
// Parent nodes derive categories from all descendant leaves
export const ASSET_CATEGORY_TREE = [
  {
    id: 'all-assets',
    label: 'All Assets',
    children: [
      {
        id: 'assets',
        label: 'Assets',
        children: [
          {
            id: 'it-assets',
            label: 'IT',
            children: [
              { id: 'cat-access-point', label: 'Access Points', categories: ['AccessPoint'] },
              {
                id: 'computers',
                label: 'Computers',
                children: [
                  { id: 'cat-server', label: 'Servers', categories: ['Server'] },
                  { id: 'cat-desktop', label: 'Desktop', categories: ['Desktop'] },
                ],
              },
              { id: 'cat-laptop', label: 'Laptop', categories: ['Laptop'] },
              { id: 'cat-ipad', label: 'iPad', categories: ['iPad'] },
              { id: 'cat-tablet', label: 'Tablet', categories: ['Tablet'] },
              { id: 'cat-printer', label: 'Printers', categories: ['Printer'] },
              { id: 'cat-router', label: 'Routers', categories: ['Router'] },
              { id: 'cat-switch', label: 'Switches', categories: ['Switch'] },
            ],
          },
          {
            id: 'non-it-assets',
            label: 'Non-IT',
            children: [
              { id: 'cat-projector', label: 'Projector', categories: ['Projector'] },
              { id: 'cat-scanner', label: 'Scanner', categories: ['Scanner'] },
              { id: 'cat-cctv', label: 'CCTV', categories: ['CCTV'] },
              { id: 'cat-video-conference', label: 'Video Conference', categories: ['VideoConference'] },
            ],
          },
        ],
      },
      {
        id: 'components',
        label: 'Components',
        children: [
          {
            id: 'it-components',
            label: 'IT Components',
            children: [
              { id: 'cat-monitor', label: 'Monitor', categories: ['Monitor'] },
              { id: 'cat-keyboard', label: 'Keyboard', categories: ['Keyboard'] },
              { id: 'cat-mouse', label: 'Mouse', categories: ['Mouse'] },
              { id: 'cat-headset', label: 'Headset', categories: ['Headset'] },
              { id: 'cat-webcam', label: 'Webcam', categories: ['Webcam'] },
              { id: 'cat-docking-station', label: 'Docking Station', categories: ['DockingStation'] },
              { id: 'cat-frs', label: 'FRS', categories: ['FRS'] },
            ],
          },
          {
            id: 'non-it-components',
            label: 'Non-IT Components',
            children: [
              { id: 'cat-other', label: 'Other', categories: ['Other'] },
            ],
          },
        ],
      },
    ],
  },
];

// Build lookup maps from the tree
function buildMaps(nodes, map = {}, labelMap = {}) {
  for (const node of nodes) {
    labelMap[node.id] = node.label;
    if (node.categories) {
      map[node.id] = node.categories;
    } else if (node.children) {
      // Parent: collect all descendant leaf categories
      const childCats = [];
      buildMaps(node.children, map, labelMap);
      for (const child of node.children) {
        childCats.push(...(map[child.id] || []));
      }
      map[node.id] = childCats;
    }
  }
  return { map, labelMap };
}

const { map: CATEGORY_GROUP_MAP, labelMap: NODE_LABEL_MAP } = buildMaps(ASSET_CATEGORY_TREE);

export { CATEGORY_GROUP_MAP };

/** Get all leaf category values for a tree node ID */
export function getLeafCategories(nodeId) {
  if (!nodeId || nodeId === 'all-assets') return null; // null = show all
  return CATEGORY_GROUP_MAP[nodeId] || null;
}

/** Get display label for a tree node ID */
export function getNodeLabel(nodeId) {
  return NODE_LABEL_MAP[nodeId] || 'All Assets';
}

/** If a node maps to exactly one leaf category, return it (for auto-selecting in form) */
export function getSingleCategory(nodeId) {
  const cats = CATEGORY_GROUP_MAP[nodeId];
  return (cats && cats.length === 1) ? cats[0] : null;
}

/** Grouped options for <select> in forms */
export const CATEGORY_OPTGROUPS = [
  {
    label: 'IT Assets',
    options: [
      { value: 'AccessPoint', label: 'Access Point' },
      { value: 'Server', label: 'Server' },
      { value: 'Desktop', label: 'Desktop' },
      { value: 'Laptop', label: 'Laptop' },
      { value: 'iPad', label: 'iPad' },
      { value: 'Tablet', label: 'Tablet' },
      { value: 'Printer', label: 'Printer' },
      { value: 'Router', label: 'Router' },
      { value: 'Switch', label: 'Switch' },
    ],
  },
  {
    label: 'Non-IT Assets',
    options: [
      { value: 'Projector', label: 'Projector' },
      { value: 'Scanner', label: 'Scanner' },
      { value: 'CCTV', label: 'CCTV' },
      { value: 'VideoConference', label: 'Video Conference System' },
    ],
  },
  {
    label: 'IT Components',
    options: [
      { value: 'Monitor', label: 'Monitor' },
      { value: 'Keyboard', label: 'Keyboard' },
      { value: 'Mouse', label: 'Mouse' },
      { value: 'Headset', label: 'Headset' },
      { value: 'Webcam', label: 'Webcam' },
      { value: 'DockingStation', label: 'Docking Station' },
      { value: 'FRS', label: 'FRS' },
    ],
  },
  {
    label: 'Non-IT Components',
    options: [
      { value: 'Other', label: 'Other' },
    ],
  },
];
