import { atom, useAtom } from 'jotai';
import { useEffect, useContext } from 'react';
import { AtomiContext } from './atomiContext';
import { AtomData, AtomiAtom, Query, ResponseData } from './types';
import { parseQuery } from './AST';

type AtomDataArray = [null | ResponseData, boolean, boolean];

const initialAtomData: AtomData = {
  loading: true,
  data: null,
  hasError: false,
};

const mergeClientAndLocalState = (localState: any, clientState: any, pathToLocalResolver: any) => {
  let currentClientStateLevel = clientState;
  const recurseThroughPath = (node: any) => {
    if (!node) return;
    let nextLevel: any;
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value] of Object.entries(node)) {
      if (typeof value === 'object' && !!value) {
        if (value.resolveLocally) {
          // eslint-disable-next-line no-param-reassign
          currentClientStateLevel[key] = localState;
          return;
        }
      }
      currentClientStateLevel = currentClientStateLevel[key];
      nextLevel = value;
    }
    recurseThroughPath(nextLevel);
  }
  recurseThroughPath(pathToLocalResolver)
  return clientState;
}

// eslint-disable-next-line no-unused-vars
const useQuery = (query: Query, input?: any): AtomDataArray => {
  const { updatedAST, queryString, pathToLocalResolver } = parseQuery(query);
  const { cache, setCache, graphQLClient, resolveLocalState } = useContext(AtomiContext);
  const cachedAtom = cache[queryString] ? cache[queryString].atom : null;
  const activeAtom: AtomiAtom = cachedAtom || atom(initialAtomData);

  const [atomData, setAtom] = useAtom(activeAtom);

  useEffect(() => {
    (async () => {
      if (!cachedAtom) {
        const newAtomData: AtomData = {
          data: null,
          loading: false,
          hasError: false,
        };
        try {
          const result = await graphQLClient.request(updatedAST, input);
          if (pathToLocalResolver) {
            const localState = resolveLocalState(pathToLocalResolver);
            mergeClientAndLocalState(localState, result, pathToLocalResolver);
          }
          newAtomData.data = result;
          setCache(queryString, {
            atom: activeAtom,
            atomData: newAtomData,
            writeAtom: setAtom,
          });
          setAtom(newAtomData);
        } catch {
          newAtomData.hasError = true;
          setCache(queryString, {
            atom: activeAtom,
            atomData: newAtomData,
            writeAtom: setAtom,
          });
          setAtom(newAtomData);
        }
      }
    })();
    /* eslint react-hooks/exhaustive-deps:0 */
  }, []);

  return [atomData.data, atomData.loading, atomData.hasError];
};

export const GetAtom = (): AtomData => {
  const [atomData] = useAtom(atom(initialAtomData));
  return atomData;
};

export default useQuery;
