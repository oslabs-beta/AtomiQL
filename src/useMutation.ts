import { useState, useContext } from 'react';
import { AtomData, CacheContainer, Query } from './types';
import { AtomiContext } from './atomiContext';
import { parseQuery } from './AST';

const initialData: AtomData = {
  loading: false,
  data: null,
  hasError: false,
};
interface MutationArg {
  [key: string]: any;
}

type MutationCallback = (arg1: CacheContainer, arg2: AtomData) => void;

const useMutation = (
  query: Query,
  callback?: MutationCallback
): [(arg1: MutationArg) => void, AtomData] => {
  const { queryString } = parseQuery(query)
  const cacheContainer = useContext(AtomiContext);
  const { graphQLClient } = cacheContainer;
  const [response, setResponse] = useState(initialData);

  const triggerMutation = async (mutationArg: MutationArg) => {
    setResponse({
      ...response,
      loading: true,
    });
    try {
      const result = await graphQLClient.request(queryString, mutationArg);
      const newResponse: AtomData = {
        data: result,
        loading: false,
        hasError: false,
      };
      setResponse(newResponse);
      if (callback) callback(cacheContainer, newResponse);
    } catch {
      setResponse({
        data: null,
        loading: false,
        hasError: true,
      });
    }
  };
  return [triggerMutation, response];
};

export default useMutation;
