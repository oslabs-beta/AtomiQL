export interface PathObject {
  resolveLocally?: any;
  [key: string]: PathObject;
}
export interface ServerState {
  [key: string]: ServerState;
}

export const isObjectAndNotNull = (value: any) =>
  typeof value === 'object' && !!value;

export const objectKeysIncludes = (value: any, keyName: string) =>
  isObjectAndNotNull(value) && Object.keys(value).includes(keyName);

const resolveLocally = (pathValue: PathObject) =>
  objectKeysIncludes(pathValue, 'resolveLocally');

export const mergeServerAndLocalState = (
  serverState: ServerState,
  pathToResolver: PathObject
) => {
  if (!pathToResolver) return;
  if (Array.isArray(serverState)) {
    serverState.forEach((stateEl: any) =>
      mergeServerAndLocalState(stateEl, pathToResolver)
    );
    return;
  }

  for (const [pathKey, pathValue] of Object.entries(pathToResolver)) {
    if (resolveLocally(pathValue))
      serverState[pathKey] = pathValue.resolveLocally;
    else mergeServerAndLocalState(serverState[pathKey], pathValue);
  }
};
