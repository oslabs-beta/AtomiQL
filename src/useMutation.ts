import { useState, useContext } from 'react';
// import { atom, useAtom } from 'jotai';
import { request, GraphQLClient } from 'graphql-request';
import { AppContext } from './atomiContext';
import { AtomData } from './useQuery';

const initialData: AtomData = {
  loading: false,
  data: null,
  hasError: false,
};

interface MutationArg {
  variables?: {
    [key: string]: any
  }
}

const useMutation = (query: string): [(arg1: MutationArg) => void, AtomData] => {
  const { url } = useContext(AppContext);
  const [response, setResponse] = useState(initialData);

  const graphQLClient = new GraphQLClient(url)

  const triggerMutation = async (mutationArg: MutationArg) => {
    console.log(`mutationArg`, mutationArg)
    setResponse({
      ...response,
      loading: true,
    });
    try {
      // const result = await request(url, query);
      const result = await graphQLClient.request(query, mutationArg.variables);
      setResponse({
        data: result,
        loading: false,
        hasError: false,
      });
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
