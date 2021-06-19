/* eslint-disable import/prefer-default-export */
export const mergeServerAndLocalState = (
  serverState: any,
  pathToLocalResolver: any
) => {
  let currentServerStateLevel = serverState;
  const recurseThroughPath = (resolverPathNode: any) => {
    if (!resolverPathNode) return;
    if (Array.isArray(currentServerStateLevel)) {
      currentServerStateLevel.forEach((el: any) => {
        mergeServerAndLocalState(el, resolverPathNode);
      });
      return;
    }
    let nextLevel: any;
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value] of Object.entries(resolverPathNode)) {
      if (typeof value === 'object' && !!value) {
        if (Object.keys(value).includes('resolveLocally')) {
          currentServerStateLevel[key] = value.resolveLocally;
          return;
        }
      }
      currentServerStateLevel = currentServerStateLevel[key];
      nextLevel = value;
    }
    recurseThroughPath(nextLevel);
  };
  recurseThroughPath(pathToLocalResolver);
};

// export const resolveLocalStateHelper = (currentResolverLevel, key, value) => {
//   const nextResolverLevel = currentResolverLevel[key]
//   const nextLevel = value;
//   if (value.resolveLocally) {
//     value.resolveLocally = currentResolverLevel()
//   }
// }
