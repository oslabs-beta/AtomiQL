import { useState, useContext } from 'react';
// import { atom, useAtom } from 'jotai';
import { GraphQLClient } from 'graphql-request';
import { AppContext } from './atomiContext';
import { AtomData } from './useQuery';

const initialData: AtomData = {
  loading: false,
  data: null,
  hasError: false,
};
interface MutationArg {
  [key: string]: any
}

const useMutation = (query: string, callback: any): [(arg1: MutationArg) => void, AtomData] => {
  const cacheContainer = useContext(AppContext);
  const { url } = cacheContainer;
  const [response, setResponse] = useState(initialData);

  const graphQLClient = new GraphQLClient(url)

  const triggerMutation = async (mutationArg: MutationArg) => {
    setResponse({
      ...response,
      loading: true,
    });
    try {
      const result = await graphQLClient.request(query, mutationArg);
      const newResponse = {
        data: result,
        loading: false,
        hasError: false,
      };
      setResponse(newResponse);
      if (callback) callback(cacheContainer, newResponse)
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
