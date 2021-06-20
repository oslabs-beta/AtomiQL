/* eslint-disable import/prefer-default-export */
export const isObjectNotNull = (value: any) =>
  typeof value === 'object' && !!value;

export const objectKeysIncludes = (value: any, keyName: string) =>
  isObjectNotNull(value) && Object.keys(value).includes(keyName);

export const mergeServerAndLocalState = (
  serverState: any,
  pathToResolver: any
) => {
  if (!pathToResolver) return;
  if (Array.isArray(serverState)) {
    serverState.forEach((stateEl: any) =>
      mergeServerAndLocalState(stateEl, pathToResolver)
    );
    return;
  }
  for (const [pathKey, pathValue] of Object.entries(pathToResolver)) {
    if (objectKeysIncludes(pathValue, 'resolveLocally'))
      serverState[pathKey] = pathValue.resolveLocally;
    else mergeServerAndLocalState(serverState[pathKey], pathValue);
  }
};
