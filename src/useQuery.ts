import { atom, useAtom } from 'jotai';
import { useEffect, useContext } from 'react';
import { AtomiContext } from './atomiContext';
import { AtomData, AtomiAtom, ResponseData } from './types';

type AtomDataArray = [null | ResponseData, boolean, boolean];

const initialAtomData: AtomData = {
  loading: true,
  data: null,
  hasError: false,
};

// eslint-disable-next-line no-unused-vars
const useQuery = (query: string, input?: any): AtomDataArray => {
  const { cache, setCache, graphQLClient } = useContext(AtomiContext);
  const cachedAtom = cache[query] ? cache[query].atom : null;
  const activeAtom: AtomiAtom = cachedAtom || atom(initialAtomData)

  const [atomData, setAtom] = useAtom(activeAtom);

  useEffect(() => {
    (async () => {
      if (!cachedAtom) {
        const newAtomData: AtomData = {
          data: null,
          loading: false,
          hasError: false,
        }
        try {
          const result = await graphQLClient.request(query, input);
          newAtomData.data = result;
          setCache(query, {
            atom: activeAtom,
            atomData: newAtomData,
            writeAtom: setAtom
          });
          setAtom(newAtomData);
        } catch {
          newAtomData.hasError = true;
          setCache(query, {
            atom: activeAtom,
            atomData: newAtomData,
            writeAtom: setAtom
          });
          setAtom(newAtomData);
        }
      }
    })();
    /* eslint react-hooks/exhaustive-deps:0 */
  }, []);

  return [atomData.data, atomData.loading, atomData.hasError];
};

export const GetAtom = (): AtomData => {
  const [atomData] = useAtom(atom(initialAtomData));
  return atomData;
};

export default useQuery;
