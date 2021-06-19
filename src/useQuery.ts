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
  const { updatedAST, queryString, pathToLocalResolver, numberOfClientDirectives } = parseQuery(query);
  const { cache, setCache, graphQLClient, resolveLocalState, resolvers } =
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
          if (numberOfClientDirectives > 0) {
            resolveLocalState(pathToLocalResolver, resolvers);
            mergeServerAndLocalState(result, pathToLocalResolver);
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
