import { atom, useAtom } from 'jotai';
import { useEffect, useContext } from 'react';
import { DocumentNode, print } from 'graphql';
import { AtomiContext } from './atomiContext';
import { AtomData, AtomiAtom, ResponseData } from './types';
import { getASTFromQuery, removeFieldsWithClientDirective } from './AST';

type AtomDataArray = [null | ResponseData, boolean, boolean];

const initialAtomData: AtomData = {
  loading: true,
  data: null,
  hasError: false,
};

// eslint-disable-next-line no-unused-vars
const useQuery = (query: string | DocumentNode, input?: any): AtomDataArray => {
  const AST = getASTFromQuery(query);
  const queryString = print(AST);
  const { updatedAST } = removeFieldsWithClientDirective(AST);
  const { cache, setCache, graphQLClient } = useContext(AtomiContext);
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
