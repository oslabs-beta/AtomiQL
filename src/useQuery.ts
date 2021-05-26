import { atom, useAtom } from 'jotai';
import { request } from 'graphql-request';
import { useEffect, useContext } from 'react';
import { AppContext } from './atomiContext';

const newAtom = atom({
  loading: true,
  data: null,
  hasError: false,
});


const useQuery = (query: string): [any, boolean, boolean] => {
  // pull cache from context
    // check if query is an object on context.cache
    // if yes, do something
    // if not, then proceed as normal
  // const [atomData, setAtom] etc.
    // useEffect...
    // return [data, loading, hasErrror]
    // write to cache {'querytext': atomData}

  const { url, cache, setCache } = useContext(AppContext);
  console.log('url', url);
  console.log('cache', cache);

  if (cache[query]) {
    console.log('you did it!');
    const { loading, hasError, data } = cache[query];
    return [data, loading, hasError];
    
  }
  const [atomData, setAtom] = useAtom(newAtom)
  const { loading, hasError, data } = atomData;
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
  }, []);

  useEffect(() => {
    console.log('AtomData: ', atomData);
    if (!loading) setCache(query, atomData);
  }, [atomData]);

  return [data, loading, hasError];
};

export const getAtom = ():any => {
  const [atomData] = useAtom(newAtom)
  return atomData
}

export default useQuery;
