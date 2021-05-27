/* eslint no-console:0 */

import { atom, useAtom } from 'jotai';
import { request } from 'graphql-request';
import { useEffect, useContext, useRef } from 'react';
import { AppContext } from './atomiContext';

export interface AtomData {
  loading: boolean;
  data: null | { [key: string]: any };
  hasError: boolean;
}

type AtomDataArray = [null | { [key: string]: any }, boolean, boolean];

const initialAtomData: AtomData = {
  loading: true,
  data: null,
  hasError: false,
};

const newAtom = atom(initialAtomData)
// const newAsyncAtom = atom(async (get:any, set:any) => set(newAtom, get(newAtom) + 1));
// const newAsyncAtom = atom(async (get) => get(newAtom));
// const asyncFetchAtom = atom(
//   (get) => get(newAtom),
//   async (_get, set, url) => {
//     const response = await request(url, query);
//     set(newAtom, (await response))
//   }
// )

const useQuery = (query: string): AtomDataArray => {

  const { url, cache, setCache } = useContext(AppContext);
  const loading = useRef(true);
  const hasError = useRef(false);
  const data = useRef<{ [key: string]: any; } | null>(null);

  // console.log('cache in usequery', cache);
  console.log('cache.query in usequery', cache[query]);

  const [atomData, setAtom] = useAtom(newAtom);
  loading.current = atomData.loading;
  hasError.current = atomData.hasError;
  data.current = atomData.data;

  console.log('atomData in useQuery', atomData)

  // const [cachedAtomData] = useAtom(cacheResponse);


  useEffect(() => {
    (async () => {
      try {
        const cacheResponse = cache[query];
        // console.log('cacheResponse in useeffect', cacheResponse);
        if (cacheResponse) {
          console.log('you did it!');
          const [cachedAtomData] = useAtom(cacheResponse);
          // console.log('cachedAtomData after cache pull', cachedAtomData)

          loading.current = cachedAtomData.loading;
          hasError.current = cachedAtomData.hasError;
          data.current = cachedAtomData.data;
        } else {
          const result = await request(url, query);
          // console.log('RESULT IS',result)

          setAtom({
            data: result,
            loading: false,
            hasError: false,
          });

          setCache(query, newAtom);
        }
      } catch {
        setAtom({
          data: null,
          loading: false,
          hasError: true,
        });
      }
    })();
    /* eslint react-hooks/exhaustive-deps:0 */
  }, []);

  useEffect(() => {
    console.log('newAtom in 2nd useeffect', newAtom);
  }, [newAtom])


  return [data.current, loading.current, hasError.current];
};

export const GetAtom = (): AtomData => {
  const [atomData] = useAtom(newAtom);
  return atomData;
};

export default useQuery;
