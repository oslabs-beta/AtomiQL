import { atom, useAtom } from 'jotai';
import { request } from 'graphql-request';
import { useEffect, useContext } from 'react';
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
}

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

  const cacheRespone = cache[query];

  if (cacheRespone) {
    const { loading, hasError, data } = cache[query];
    return [data, loading, hasError];
    
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [atomData, setAtom] = useAtom(newAtom)
  const { loading, hasError, data } = atomData;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    (async () => {
      try {
        const result = await request(url, query)
        setAtom({
          data: result,
          loading: false,
          hasError: false
        });
      } catch {
        setAtom({
          data: null,
          loading: false,
          hasError: true
        })
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!loading) setCache(query, atomData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atomData]);

  return [data, loading, hasError];
};

export const getAtom = (): AtomData => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [atomData] = useAtom(newAtom)
  return atomData
}

export default useQuery;
