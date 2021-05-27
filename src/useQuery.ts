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

const newAtom = atom(initialAtomData);

const useQuery = (query: string): AtomDataArray => {
  // pull cache from context
  // check if query is an object on context.cache
  // if yes, do something
  // if not, then proceed as normal
  // const [atomData, setAtom] etc.
  // useEffect...
  // return [data, loading, hasErrror]
  // write to cache {'querytext': atomData}

  const { url, cache, setCache } = useContext(AppContext);
  const loading = useRef(true);
  const hasError = useRef(false);
  const data = useRef<{ [key: string]: any; } | null>(null);

  const [atomData, setAtom] = useAtom(newAtom);
  loading.current = atomData.loading;
  hasError.current = atomData.hasError;
  data.current = atomData.data;


  useEffect(() => {
    (async () => {
      try {
        const cacheResponse = cache[query];
        if (cacheResponse) {
          // console.log('you did it!');
          loading.current = cache[query].loading;
          hasError.current = cache[query].hasError;
          data.current = cache[query].current;
        } else {
          const result = await request(url, query);
          // console.log('RESULT IS',result)
          setCache(query, {
            data: result,
            loading: false,
            hasError: false
          });
          setAtom({
            data: result,
            loading: false,
            hasError: false,
          });
        }
      } catch {
        setAtom({
          data: null,
          loading: false,
          hasError: true,
        });
      }
    })();
  }, []);

  return [data.current, loading.current, hasError.current];
};

export const GetAtom = (): AtomData => {
  const [atomData] = useAtom(newAtom);
  return atomData;
};

export default useQuery;
