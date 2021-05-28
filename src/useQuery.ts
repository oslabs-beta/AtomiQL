/* eslint no-console:0 */

import { Atom, atom, useAtom } from 'jotai';
import { request } from 'graphql-request';
import { useEffect, useContext, useRef } from 'react';
import {
  OnMount,
  SetStateAction,
  WithInitialValue,
  Write,
} from 'jotai/core/types';
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

const newAtom = atom(initialAtomData);
// const newAsyncAtom = atom(async (get:any, set:any) => set(newAtom, get(newAtom) + 1));
// const newAsyncAtom = atom(async (get) => get(newAtom));
// const asyncFetchAtom = atom(
//   (get) => get(newAtom),
//   async (_get, set, url) => {
//     const response = await request(url, query);
//     set(newAtom, (await response))
//   }
// )

type SomethingAtom =
  | (Atom<AtomData> & {
      write: Write<SetStateAction<AtomData>>;
      onMount?: OnMount<SetStateAction<AtomData>> | undefined;
    } & WithInitialValue<AtomData>)
  | Atom<AtomData>;

const useQuery = (query: string): AtomDataArray => {
  let somethingAtom: SomethingAtom = newAtom;
  const { url, cache, setCache } = useContext(AppContext);

  const cacheResponse = cache[query];
  if (cacheResponse) {
    console.log('you did it!');
    somethingAtom = cacheResponse;
  }
  const [cachedAtomData] = useAtom(somethingAtom);

  const loading = useRef(true);
  const hasError = useRef(false);
  const data = useRef<{ [key: string]: any } | null>(null);

  const [atomData, setAtom] = useAtom(newAtom);
  loading.current = atomData.loading;
  hasError.current = atomData.hasError;
  data.current = atomData.data;

  useEffect(() => {
    (async () => {
      if (cacheResponse) {
        loading.current = cachedAtomData.loading;
        hasError.current = cachedAtomData.hasError;
        data.current = cachedAtomData.data;
      } else {
        try {
          const result = await request(url, query);
          console.log('RESULT IS', result);
          setCache(query, newAtom);

          setAtom({
            data: result,
            loading: false,
            hasError: false,
          });
        } catch {
          console.log('--------- CATCH ---------');
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
