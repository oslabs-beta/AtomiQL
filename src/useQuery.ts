import { atom, useAtom } from 'jotai';
import { request } from 'graphql-request';
import { useEffect, useContext, useRef } from 'react';
import { AtomiContext } from './atomiContext';
import { AtomData, AtomiAtom, ResponseData } from './types';

type AtomDataArray = [null | ResponseData, boolean, boolean];

const initialAtomData: AtomData = {
  loading: true,
  data: null,
  hasError: false,
};

const newAtom = atom(initialAtomData);

const useQuery = (query: string): AtomDataArray => {
  const { url, cache, setCache } = useContext(AtomiContext);
  const cachedAtom = cache[query] ? cache[query].atom : null;
  const loading = useRef(true);
  const hasError = useRef(false);
  const data = useRef<ResponseData | null>(null);
  
  const activeAtom: AtomiAtom = cachedAtom || newAtom;
  const [atomData, setAtom] = useAtom(activeAtom);
  loading.current = atomData.loading;
  hasError.current = atomData.hasError;
  data.current = atomData.data;

  useEffect(() => {
    (async () => {
      if (cachedAtom) {
        loading.current = atomData.loading;
        hasError.current = atomData.hasError;
        data.current = atomData.data;
      } else {
        try {
          const result = await request(url, query);
          const newAtomData: AtomData = {
            data: result,
            loading: false,
            hasError: false,
          }
          setCache(query, {
            atom: newAtom,
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

  return [data.current, loading.current, hasError.current];
};

export const GetAtom = (): AtomData => {
  const [atomData] = useAtom(newAtom);
  return atomData;
};

export default useQuery;
