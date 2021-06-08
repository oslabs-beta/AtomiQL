import { atom, useAtom } from 'jotai';
import { request } from 'graphql-request';
import { useEffect, useContext } from 'react';
import { AtomiContext } from './atomiContext';
import { AtomData, AtomiAtom, ResponseData } from './types';

type AtomDataArray = [null | ResponseData, boolean, boolean];

const initialAtomData: AtomData = {
  loading: true,
  data: null,
  hasError: false,
};

const useQuery = (query: string): AtomDataArray => {
  const { url, cache, setCache } = useContext(AtomiContext);
  const cachedAtom = cache[query] ? cache[query].atom : null;
  const activeAtom: AtomiAtom = cachedAtom || atom(initialAtomData)

  const [atomData, setAtom] = useAtom(activeAtom);

  useEffect(() => {
    (async () => {
      if (!cachedAtom) {
        try {
          const result = await request(url, query);
          const newAtomData: AtomData = {
            data: result,
            loading: false,
            hasError: false,
          }
          setCache(query, {
            atom: activeAtom,
            atomData: newAtomData,
            writeAtom: setAtom
          });
          setAtom(newAtomData);
        } catch {
          setAtom({
            data: null,
            loading: false,
            hasError: true,
          });
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
