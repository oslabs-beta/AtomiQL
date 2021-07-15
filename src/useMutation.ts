import { useState, useContext } from 'react';
import { AtomData, CacheContainer, Query } from './types';
import { AtomiContext } from './atomiContext';
import { parseQuery } from './AST/AST';

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
  // Parse the users Query to convert it into reliable format
  const { queryString } = parseQuery(query);
  // Access the cache
  const cacheContainer = useContext(AtomiContext);
  const { graphQLClient } = cacheContainer;
  const [response, setResponse] = useState(initialData);

  // Define the function the user can use to execute their mutation
  const triggerMutation = async (mutationArg: MutationArg) => {
    // Set loading to true in the response data
    setResponse({
      ...response,
      loading: true,
    });
    try {
      // Send Mutation to the server
      const result = await graphQLClient.request(queryString, mutationArg);
      const newResponse: AtomData = {
        data: result,
        loading: false,
        hasError: false,
      };
      // Update the response with the server result
      setResponse(newResponse);
      // If the user passed in a callback into useMutation execute it now the request is complete
      if (callback) callback(cacheContainer, newResponse);
    } catch {
      // If there is an error set loading to false and hasError to true
      setResponse({
        data: null,
        loading: false,
        hasError: true,
      });
    }
  };

  // Send to the user the triggerMutation function and response data
  return [triggerMutation, response];
};

export default useMutation;
