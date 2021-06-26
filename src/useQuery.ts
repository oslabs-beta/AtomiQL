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

const useQuery = (query: Query, input?: any): AtomDataArray => {
  console.log('useQuery called');

  // Parse the graphQL query
  const { updatedAST, queryString, pathToResolvers, foundClientDirective } =
    parseQuery(query);
  // Access the cache
  const { atomCache, setCache, graphQLClient, resolvePathToResolvers, resolvers } =
    useContext(AtomiContext);
  // Look for a cachedAtom
  const cachedAtom = atomCache[queryString] ? atomCache[queryString].atom : null;
  // If there is no cached atom, set the active atom to be a new atom
  const activeAtom: AtomiAtom = cachedAtom || atom(initialAtomData);
  // Hooke into the activeAtom
  const [atomData, setAtom] = useAtom(activeAtom);

  useEffect(() => {
    (async () => {
      // If the atom is cached do not query the server
      if (!cachedAtom) {
        const newAtomData: AtomData = {
          data: null,
          loading: false,
          hasError: false,
        };
        try {
          // Query the server
          const result = await graphQLClient.request(updatedAST, input);
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
          console.log('you did it! atom and cache set');
          console.log('newAtomData.data', newAtomData);
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
    })();
    /* eslint react-hooks/exhaustive-deps:0 */
  }, []);

  // Return to the user data about and response from their request
  return [atomData.data, atomData.loading, atomData.hasError];
};

export const GetAtom = (): AtomData => {
  const [atomData] = useAtom(atom(initialAtomData));
  return atomData;
};

export default useQuery;
