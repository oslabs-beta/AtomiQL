import { atom, useAtom } from 'jotai';
import { useEffect, useContext } from 'react';
import { GraphQLClient } from 'graphql-request';
import { DocumentNode } from 'graphql';
import { AtomiContext } from './atomiContext';
import {
  AtomData,
  AtomiAtom,
  Query,
  ResponseData,
  PathObject,
  Resolvers,
} from './types';
import { parseQuery } from './AST/AST';
import { resolveQueryWithLocalFields } from './AST/LocalResolution/resolveQueryWithLocalFields';

type AtomDataArray = [null | ResponseData, boolean, boolean];

const initialAtomData: AtomData = {
  loading: true,
  data: null,
  hasError: false,
};

interface UseQueryInput {
  variables?: any;
  isLocal?: boolean;
}

type Result = { [key: string]: any };

export const getQueryResult = async (
  sendQueryToServer: boolean,
  graphQLClient: GraphQLClient,
  updatedAST: DocumentNode,
  variables: any,
  foundClientDirective: boolean,
  typeDefs: DocumentNode,
  resolvers: Resolvers,
  pathToResolvers: PathObject,
  strippedQuery: string
) => {
  let result: Result = {};
  // Query the server if Query is valid
  if (sendQueryToServer) {
    result = await graphQLClient.request(updatedAST, variables);
  }
  // If there are @client directives in the query, merge the result from
  // the server with local state from the resolvers for those Fields
  if (foundClientDirective) {
    // resolvePathToResolvers(pathToResolvers, resolvers);
    // mergeServerAndLocalState(result, pathToResolvers);
    result = (await resolveQueryWithLocalFields(
      typeDefs,
      resolvers,
      pathToResolvers,
      result,
      strippedQuery
    )) as Result;
  }
  return result;
};

const useQuery = (query: Query, input?: UseQueryInput): AtomDataArray => {
  const isLocal = input && input.isLocal;
  // Parse the graphQL query
  const {
    updatedAST,
    strippedQuery,
    queryString: originalQuery,
    pathToResolvers,
    foundClientDirective,
    sendQueryToServer,
  } = parseQuery(query);
  let queryString = originalQuery;
  if (input && input.variables) queryString += JSON.stringify(input.variables);
  // Access the cache
  const {
    setCache,
    graphQLClient,
    resolvers,
    getAtomiAtomContainer,
    typeDefs,
  } = useContext(AtomiContext);
  // Look for a cachedAtomContainer
  const cachedAtomContainer = getAtomiAtomContainer(queryString);
  const cachedAtom = cachedAtomContainer ? cachedAtomContainer.atom : null;
  // If there is no cached atom, set the active atom to be a new atom
  const activeAtom: AtomiAtom = cachedAtom || atom(initialAtomData);
  // Hooke into the activeAtom
  const [atomData, setAtom] = useAtom(activeAtom);

  const variables = input ? input.variables : undefined;

  const setCacheContents = {
    originalQuery,
    variables,
    atom: activeAtom,
    setAtom,
  };

  useEffect(() => {
    (async () => {
      // If the atom is cached or it is a local only query do not query the server
      if (!cachedAtom && !isLocal) {
        const newAtomData: AtomData = {
          data: null,
          loading: false,
          hasError: false,
        };
        try {
          const result = await getQueryResult(
            sendQueryToServer,
            graphQLClient,
            updatedAST,
            variables,
            foundClientDirective,
            typeDefs,
            resolvers,
            pathToResolvers,
            strippedQuery
          );
          newAtomData.data = result;
          // Set the response in the cache
          setCache(queryString, {
            ...setCacheContents,
            atomData: newAtomData,
          });
          // Update the value of the Jotai atom
          setAtom(newAtomData);
        } catch {
          // Catch any errors
          newAtomData.hasError = true;
          // Set the cache
          setCache(queryString, {
            ...setCacheContents,
            atomData: newAtomData,
          });
          // Update the value of the Jotai atom
          setAtom(newAtomData);
        }
      }
      // If atom is cached but setAtom function is not defined
      if (cachedAtomContainer && !cachedAtomContainer.setAtom) {
        // Save the setAtom function so it becomes accessible
        setCache(queryString, {
          ...setCacheContents,
          atomData,
        });
      }
      // If the query is Local and there is no cache hit
      if (isLocal && !cachedAtom) {
        // Set the cache with data null so that writeQuery
        // will update this atom and effect state changes
        const newAtomData: AtomData = {
          data: null,
          loading: true,
          hasError: false,
        };
        setCache(queryString, {
          ...setCacheContents,
          atomData: newAtomData,
        });
      }
    })();
    /* eslint react-hooks/exhaustive-deps:0 */
  }, []);

  // If the atom is empty, assume the values of loading and hasError
  if (isAtomEmpty(atomData)) return [null, true, false];

  // Return to the user data about and response from their request
  return [atomData.data, atomData.loading, atomData.hasError];
};

const isAtomEmpty = (atomData: any) =>
  typeof atomData.loading === 'undefined' &&
  typeof atomData.loading === 'undefined';

export const GetAtom = (): AtomData => {
  const [atomData] = useAtom(atom(initialAtomData));
  return atomData;
};

export default useQuery;
