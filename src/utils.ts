import { PathObject, ServerState } from './types';

export const isObjectAndNotNull = (value: any) =>
  typeof value === 'object' && !!value;

export const objectKeysIncludes = (value: any, keyName: string) =>
  isObjectAndNotNull(value) && Object.keys(value).includes(keyName);

const resolveLocally = (pathValue: PathObject) =>
  objectKeysIncludes(pathValue, 'resolveLocally');

export const mergeServerAndLocalState = (
  serverState: ServerState,
  pathToResolvers: PathObject
) => {
  // If pathToResolvers is falsy hit the base case
  if (!pathToResolvers) return;
  // If serverState is an array, recursively call each element and return out
  if (Array.isArray(serverState)) {
    serverState.forEach((stateEl: ServerState) =>
      mergeServerAndLocalState(stateEl, pathToResolvers)
    );
    return;
  }

  // Otherwise iterate through each key value pair in the  pathToResolvers object
  for (const [pathKey, pathValue] of Object.entries(pathToResolvers)) {
    // If pathToResolvers says resolver locally, update the serverState with the local state
    if (resolveLocally(pathValue))
      serverState[pathKey] = pathValue.resolveLocally;
    // If we are resolving a whole SelectionSet locally, add the SelectionSet root node to the serverState
    else if (serverState[pathKey] === undefined) serverState[pathKey] = {}
    // Otherwise recursively call at the next level of depth in the server and path objects
    else mergeServerAndLocalState(serverState[pathKey], pathValue);
  }
};
