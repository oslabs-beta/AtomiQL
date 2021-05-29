/* eslint no-console:0 */
import { atom, useAtom } from 'jotai';
import { request } from 'graphql-request';
import { useEffect, useContext, useRef } from 'react';
import { AppContext } from './atomiContext';
import { AtomData, AtomiAtom, ResponseData } from './types';

type AtomDataArray = [null | ResponseData, boolean, boolean];

const initialAtomData: AtomData = {
  loading: true,
  data: null,
  hasError: false,
};

const newAtom = atom(initialAtomData);

const useQuery = (query: string): AtomDataArray => {
  const { url, cache, setCache } = useContext(AppContext);
  const cacheResponse = cache[query] ? cache[query].atom : null;
  const loading = useRef(true);
  const hasError = useRef(false);
  const data = useRef<ResponseData | null>(null);
  
  const activeAtom: AtomiAtom = cacheResponse || newAtom;
  const [atomData, setAtom] = useAtom(activeAtom);
  loading.current = atomData.loading;
  hasError.current = atomData.hasError;
  data.current = atomData.data;

  useEffect(() => {
    (async () => {
      if (cacheResponse) {
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
