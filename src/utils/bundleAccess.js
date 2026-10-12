// Tests, notes and recordings can be limited to one or more course bundles.
//   bundleIds: the bundles that unlock the item (a student needs any one of them)
//   bundleId:  kept for code that reads the older single-bundle field - the first bundle, or
//              'free' / '' when no bundle is chosen
// Items saved before bundleIds existed only have bundleId.

export const bundleIdsOf = (item) => {
  if (Array.isArray(item?.bundleIds) && item.bundleIds.length) return item.bundleIds;
  return item?.bundleId && item.bundleId !== 'free' ? [item.bundleId] : [];
};

// What the access picker shows: { mode: 'default' | 'free' | 'bundles', ids }
export const accessOf = (item) => {
  const ids = bundleIdsOf(item);
  if (ids.length) return { mode: 'bundles', ids };
  return { mode: item?.bundleId === 'free' ? 'free' : 'default', ids: [] };
};

// Fields to save for a picker value. "Specific bundles" with none ticked falls back to the default.
export const accessFields = (access) => {
  if (access?.mode === 'bundles' && access.ids.length) return { bundleId: access.ids[0], bundleIds: access.ids };
  return { bundleId: access?.mode === 'free' ? 'free' : '', bundleIds: [] };
};

// Names of the item's bundles, for labels on admin cards
export const bundleNamesOf = (item, bundles) => bundleIdsOf(item).map(id => (bundles || []).find(b => b.id === id)?.name || 'Deleted bundle');
