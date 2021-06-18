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
  const { updatedAST, queryString, pathToLocalResolver } = parseQuery(query);
  const { cache, setCache, graphQLClient, resolveLocalState } =
    useContext(AtomiContext);
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
            mergeServerAndLocalState(localState, result, pathToLocalResolver);
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
