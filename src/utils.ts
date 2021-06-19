/* eslint-disable import/prefer-default-export */
export const isObjectNotNull = (value: any) =>
  typeof value === 'object' && !!value;

export const objectKeysIncludes = (value: any, keyName: string) =>
  isObjectNotNull(value) && Object.keys(value).includes(keyName);

export const mergeServerAndLocalState3 = (
  serverState: any,
  pathToLocalResolver: any
) => {
  let currentServerStateLevel = serverState;
  const recurseThroughPath = (resolverPathNode: any) => {
    if (!resolverPathNode) return;
    if (Array.isArray(currentServerStateLevel)) {
      currentServerStateLevel.forEach((el: any) => {
        mergeServerAndLocalState3(el, resolverPathNode);
      });
      return;
    }
    let nextLevel: any;
    for (const [key, value] of Object.entries(resolverPathNode)) {
      if (objectKeysIncludes(value, 'resolveLocally')) {
        currentServerStateLevel[key] = value.resolveLocally;
      } else {
        currentServerStateLevel = currentServerStateLevel[key];
        nextLevel = value;
      }
    }
    recurseThroughPath(nextLevel);
  };
  recurseThroughPath(pathToLocalResolver);
};

export const mergeServerAndLocalState = (
  serverState: any,
  pathToLocalResolver: any,
) => {
  if (!pathToLocalResolver) return;
  if (Array.isArray(serverState)) {
    serverState.forEach((stateEl: any) => {
      mergeServerAndLocalState(stateEl, pathToLocalResolver);
    })
    return;
  }
  for (const [pathKey, pathValue] of Object.entries(pathToLocalResolver)) {
    if (objectKeysIncludes(pathValue, 'resolveLocally')) {
      serverState[pathKey] = pathValue.resolveLocally;
    } else {
      mergeServerAndLocalState(serverState[pathKey], pathValue)
    }
  }
};
