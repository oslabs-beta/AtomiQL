/* eslint-disable import/prefer-default-export */
export const mergeServerAndLocalState = (
  localState: any,
  serverState: any,
  pathToLocalResolver: any
) => {
  let currentServerStateLevel = serverState;
  const recurseThroughPath = (resolverPathNode: any) => {
    if (!resolverPathNode) return;
    if (Array.isArray(currentServerStateLevel)) {
      currentServerStateLevel.forEach((el: any) => {
        mergeServerAndLocalState(localState, el, resolverPathNode);
      });
      return;
    }
    let nextLevel: any;
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value] of Object.entries(resolverPathNode)) {
      if (typeof value === 'object' && !!value) {
        if (value.resolveLocally) {
          // eslint-disable-next-line no-param-reassign
          currentServerStateLevel[key] = localState;
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
