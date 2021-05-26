import { atom, useAtom } from 'jotai';
import { request } from 'graphql-request';
import { useEffect, useContext, useRef } from 'react';
import { AppContext } from './atomiContext';

interface AtomData {
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
  console.log('url', url);
  console.log('cache', cache);

  const cacheResponse = cache[query];
  const [atomData, setAtom] = useAtom(newAtom);
  loading.current = atomData.loading;
  hasError.current = atomData.hasError;
  data.current = atomData.data;

  useEffect(() => {
    (async () => {
      try {
        if (cacheResponse) {
          console.log('you did it!');
          loading.current = cache[query].loading;
          hasError.current = cache[query].hasError;
          data.current = cache[query].current;
        } else {
          const result = await request(url, query);
          console.log('result', result);
          setAtom({
            data: result,
            loading: false,
            hasError: false,
          });
        }
      } catch {
        console.log('catch');
        setAtom({
          data: null,
          loading: false,
          hasError: true,
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    console.log('AtomData: ', atomData);
    if (!loading) setCache(query, atomData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atomData]);

  return [data.current, loading.current, hasError.current];
};

export const getAtom = (): AtomData => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [atomData] = useAtom(newAtom);
  return atomData;
};

export default useQuery;
