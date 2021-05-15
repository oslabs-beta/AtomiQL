import { useEffect, useContext } from 'react';
import { request } from 'graphql-request'
import { atom, useAtom } from 'jotai';
import { AppContext } from './atomiContext';

const newAtom = atom({
  loading: true,
  data: null,
  hasError: false
});

const useQuery = (query: string): [any, boolean, boolean] => {
  const [atomData, setAtom] = useAtom(newAtom)
  const { url } = useContext(AppContext)
  const { loading, hasError, data } = atomData;

  useEffect(() => {
    (async () => {
      try {
        const result = await request(url, query)
        setAtom({
          data: result,
          loading: false,
          hasError: false
        })
      } catch {
        setAtom({
          data: null,
          loading: false,
          hasError: true
        })
      }
    })()
  }, []);

  return [data, loading, hasError]
};

export default useQuery;