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
  const [atomData, setAtom] = useAtom(newAtom);
  const { loading, hasError, data } = atomData;
  const { url } = useContext(AppContext);

  useEffect(() => {
    (async () => {
      try {
        const result = await request(url, query);
        setAtom({
          data: result,
          loading: false,
          hasError: false,
        });
      } catch {
        setAtom({
          data: null,
          loading: false,
          hasError: true,
        });
      }
    })();
  }, []);

  return [data, loading, hasError];
};

export const getAtom = ():any => {
  const [atomData] = useAtom(newAtom)
  return atomData
}

export default useQuery;
