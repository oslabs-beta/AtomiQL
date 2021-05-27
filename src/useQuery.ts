/* eslint no-console:0 */

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
}

const useQuery = (query: string): AtomDataArray => {
  const newAtomRef = useRef(atom(initialAtomData));
  // const newAtom = atom(initialAtomData);
  console.log('newAtomRef', newAtomRef);

  const { url, cache, setCache } = useContext(AppContext);
  console.log('url', url);
  // console.log('cache', cache);

  const cacheResponse = cache[query];

  if (cacheResponse) {
    console.log('you did it!');
    // const [atomData, setAtom] = cache[query];
    // const { loading, hasError, data } = atomData;
    // return [data, loading, hasError];
    
  }

  /*
  if (cacheRespone) {
    console.log('you did it!');
    const { loading, hasError, data } = cache[query];
    return [data, loading, hasError];
  }
  */
  
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [atomData, setAtom] = useAtom(newAtomRef.current);
  const { loading, hasError, data } = atomData;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    (async () => {
      try {
        const result = await request(url, query)
        console.log('result', result);
        setAtom({
          data: result,
          loading: false,
          hasError: false
        });
      } catch {
        console.log('catch');
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
    // console.log('AtomData: ', atomData);
    console.log('newAtom', newAtomRef);
    if (!loading) setCache(query, newAtomRef.current);

    // if new query (new atom, no cache), setAtom (above) and store atom in cache
    // if cached query (existing atom in cache), just update the atom but no need to edit cache

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atomData]);

  return [data, loading, hasError];
};

export const getAtom = (): AtomData => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [atomData] = useAtom(atom(initialAtomData))
  return atomData
}

export default useQuery;
