import { atom, useAtom } from 'jotai';
import { useEffect, useContext } from 'react';
import { AtomiContext } from './atomiContext';
import { AtomData, AtomiAtom, Query, ResponseData } from './types';
import { parseQuery } from './AST';
import { mergeServerAndLocalState } from './utils';

type AtomDataArray = [null | ResponseData, boolean, boolean];

const initialAtomData: AtomData = {
  loading: true,
  data: null,
  hasError: false,
};

interface UseQueryInput {
  variables?: any;
  isLocal?: boolean;
}

const useQuery = (query: Query, input?: UseQueryInput): AtomDataArray => {
  const isLocal = input && input.isLocal;
  // Parse the graphQL query
  const {
    updatedAST,
    queryString,
    pathToResolvers,
    foundClientDirective,
    sendQueryToServer,
  } = parseQuery(query);
  // Access the cache
  const {
    setCache,
    graphQLClient,
    resolvePathToResolvers,
    resolvers,
    getAtomiAtomContainer,
  } = useContext(AtomiContext);
  // Look for a cachedAtomContainer
  const cachedAtomContainer = getAtomiAtomContainer(queryString);
  const cachedAtom = cachedAtomContainer ? cachedAtomContainer.atom : null;
  // If there is no cached atom, set the active atom to be a new atom
  const activeAtom: AtomiAtom = cachedAtom || atom(initialAtomData);
  // Hooke into the activeAtom
  const [atomData, setAtom] = useAtom(activeAtom);

  useEffect(() => {
    (async () => {
      // If the atom is cached or it is a local only query do not query the server
      if (!cachedAtom && !isLocal) {
        const newAtomData: AtomData = {
          data: null,
          loading: false,
          hasError: false,
        };
        try {
          let result = {};
          // Query the server if Query is valid
          if (sendQueryToServer) {
            const variables = input ? input.variables : undefined;
            result = await graphQLClient.request(updatedAST, variables);
          }
          // If there are @client directives in the query, merge the result from
          // the server with local state from the resolvers for those Fields
          if (foundClientDirective) {
            resolvePathToResolvers(pathToResolvers, resolvers);
            mergeServerAndLocalState(result, pathToResolvers);
          }
          newAtomData.data = result;
          // Set the response in the cache
          setCache(queryString, {
            atom: activeAtom,
            atomData: newAtomData,
            setAtom,
          });
          // Update the value of the Jotai atom
          setAtom(newAtomData);
        } catch {
          // Catch any errors
          newAtomData.hasError = true;
          // Set the cache
          setCache(queryString, {
            atom: activeAtom,
            atomData: newAtomData,
            setAtom,
          });
          // Update the value of the Jotai atom
          setAtom(newAtomData);
        }
      }
      // If atom is cached but setAtom function is not defined
      if (cachedAtomContainer && !cachedAtomContainer.setAtom) {
        // Save the setAtom function so it becomes accessible
        setCache(queryString, {
          atom: activeAtom,
          atomData,
          setAtom,
        });
      }
      // If the query is Local and there is no cache hit
      if (isLocal && !cachedAtom) {
        // Set the cache with data null so that writeQuery
        // will update this atom and effect state changes
        const newAtomData: AtomData = {
          data: null,
          loading: true,
          hasError: false,
        };
        setCache(queryString, {
          atom: activeAtom,
          atomData: newAtomData,
          setAtom,
        });
      }
    })();
    /* eslint react-hooks/exhaustive-deps:0 */
  }, []);

  // If the atom is empty, assume the values of loading and hasError
  if (isAtomEmpty(atomData)) return [null, true, false];

  // Return to the user data about and response from their request
  return [atomData.data, atomData.loading, atomData.hasError];
};

const isAtomEmpty = (atomData: any) =>
  typeof atomData.loading === 'undefined' &&
  typeof atomData.loading === 'undefined';

export const GetAtom = (): AtomData => {
  const [atomData] = useAtom(atom(initialAtomData));
  return atomData;
};

export default useQuery;
