import { DocumentNode } from 'graphql';
import { GraphQLClient } from 'graphql-request';
import { isEqual } from 'lodash';
import { atom } from 'jotai';
import React from 'react';
import { flattenQuery, getASTFromQuery, parseQuery, } from './AST/AST';

import {
  AtomData,
  AtomiAtom,
  AtomiAtomContainer,
  CacheContainer,
  PathObject,
  ReadQueryOutput,
  Resolvers,
  ResponseData,
} from './types';
import { getQueryResult } from './useQuery';

interface Client {
  url: string;
  resolvers?: Resolvers;
  typeDefs?: DocumentNode | string;
}
interface AtomiProviderProps {
  client: Client;
}

const MOCK_TYPE_DEF = 'type Default { name: String }';

const initialCache: CacheContainer = {
  url: '',
  // eslint-disable-next-line no-unused-vars
  readQuery: (arg1: string) => ({ data: {}, writeAtom: () => ({}) }),
  // eslint-disable-next-line no-unused-vars
  setCache: (arg1: string, arg2: AtomiAtomContainer) => ({}),
  atomCache: {},
  gqlNodeCache: {},
  queryAtomMap: {},
  graphQLClient: new GraphQLClient(''),
  resolvers: {},
  resolvePathToResolvers: () => ({}),
  getAtomiAtomContainer: () => ({
    atom: atom({}) as unknown as AtomiAtom,
    atomData: {
      loading: false,
      hasError: false,
      data: {},
    },
    setAtom: undefined,
    originalQuery: '',
    variables: {},
  }),
  writeQuery: () => ({}),
  typeDefs: getASTFromQuery(MOCK_TYPE_DEF),
};

export const AtomiContext = React.createContext(initialCache);

export class AtomiProvider extends React.Component<AtomiProviderProps> {
  cacheContainer: CacheContainer;

  constructor(props: AtomiProviderProps) {
    super(props);
    const {
      client: { url, resolvers, typeDefs },
    } = this.props;
    const graphQLClient = new GraphQLClient(url);
    const cacheContainer: CacheContainer = {
      url,
      setCache: this.setCache,
      readQuery: this.readQuery,
      atomCache: {},
      gqlNodeCache: {},
      queryAtomMap: {},
      graphQLClient,
      resolvers: resolvers || {},
      resolvePathToResolvers: this.resolvePathToResolvers,
      getAtomiAtomContainer: this.getAtomiAtomContainer,
      writeQuery: this.writeQuery,
      typeDefs: getASTFromQuery(typeDefs || MOCK_TYPE_DEF),
    };
    this.cacheContainer = cacheContainer;
  }

  // Update the pathToResolvers object with the resolved local state
  resolvePathToResolvers = (
    pathToResolvers: PathObject,
    resolvers: Resolvers
  ) => {
    // Iterate through each key-value pair in the pathToResolvers object
    for (const [pathKey, pathValue] of Object.entries(pathToResolvers)) {
      // Get the the resolverNode associated with this pathKey
      const nextResolverNode = resolvers[pathKey];
      // If the pathValue says to resolve locally, update the resolveLocally object with the resolved local value
      if (pathValue.resolveLocally && typeof nextResolverNode === 'function')
        pathValue.resolveLocally = nextResolverNode();
      // Otherwise continue recursively searching the tree for Fields to resolve locally
      else if (typeof nextResolverNode === 'object')
        this.resolvePathToResolvers(pathValue, nextResolverNode);
    }
  };

  // Store in the cache an atom container associated with a certain query
  setCache = (query: string, atomiAtomContainer: AtomiAtomContainer) => {
    // if the query does not return any data, then update the atomcache but not anything else
    if (!atomiAtomContainer.atomData.data) {
      this.setAtomCache(query, atomiAtomContainer);
      return;
    }

    // flattens query
    const flattenedQuery = flattenQuery(atomiAtomContainer.atomData.data);

    this.setQueryAtomMap(flattenedQuery, query);

    // if the cache is not empty, then check if any atoms need to be updated
    if (Object.keys(this.cacheContainer.atomCache).length) {
      this.updateAtomsFromCache(query, flattenedQuery);
    }

    // sets the cache in the atom
    this.setAtomCache(query, atomiAtomContainer);

    // sets the flattened cache
    this.setNodeCache(flattenedQuery);
  };

  // Store links between gql nodes and atoms by query key
  setQueryAtomMap = (flattenedQuery: ResponseData, query: string) => {
    for (const queryNode in flattenedQuery) {
      if (!this.cacheContainer.queryAtomMap[queryNode]) {
        this.cacheContainer.queryAtomMap[queryNode] = new Set([query]);
      } else {
        this.cacheContainer.queryAtomMap[queryNode].add(query);
      }
    }
  };

  // stores new query atom data into the cache
  setAtomCache = (query: string, atomiAtomContainer: AtomiAtomContainer) => {
    this.cacheContainer.atomCache = {
      ...this.cacheContainer.atomCache,
      [query]: atomiAtomContainer,
    };
  };

  // Store in a node cache data for each gql object received from the server
  setNodeCache = (flattenedQueryData: ResponseData | null) => {
    this.cacheContainer.gqlNodeCache = {
      ...this.cacheContainer.gqlNodeCache,
      ...flattenedQueryData,
    };
  };

  // iterates through the existing flattened node cache, performs a deep equality scan to check if any differences exist in any object, returns a list of atoms with differences, then calls requery on them
  updateAtomsFromCache = (query: string, flattenedQuery: ResponseData) => {
    const atomsToUpdate: Set<string> = new Set();
    Object.keys(flattenedQuery).forEach((queryNodeId: string) => {
      if (
        !isEqual(
          flattenedQuery[queryNodeId],
          this.cacheContainer.gqlNodeCache[queryNodeId]
        )
      ) {
        this.cacheContainer.queryAtomMap[queryNodeId].forEach((atomString) => {
          if (atomString !== query) atomsToUpdate.add(atomString);
        });
      }
    });

    atomsToUpdate.forEach((atomQuery: string) => {
      this.reQuery(atomQuery);
    });
  };

  // queries the server given a query string
  reQuery = async (query: string) => {
    const { graphQLClient, typeDefs, resolvers } = this.cacheContainer;
    if (this.cacheContainer.atomCache[query]) {
      const atomiAtomContainer = this.cacheContainer.atomCache[query];
      const { originalQuery, variables } = atomiAtomContainer;
      const {
        updatedAST,
        strippedQuery,
        pathToResolvers,
        foundClientDirective,
        sendQueryToServer,
      } = parseQuery(originalQuery);
      const res = getQueryResult(
        sendQueryToServer,
        graphQLClient,
        updatedAST,
        variables,
        foundClientDirective,
        typeDefs,
        resolvers,
        pathToResolvers,
        strippedQuery
      )
      this.writeAtom(atomiAtomContainer, res);
    }
  };

  // Get the atom container for a certain query
  getAtomiAtomContainer = (query: string): AtomiAtomContainer => {
    const atomiAtomContainer = this.cacheContainer.atomCache[query];
    // If we cannot find the atom container, throw an error
    return atomiAtomContainer;
  };

  isQueryCached = (query: string): boolean =>
    !!this.cacheContainer.atomCache[query];

  // Update the value of the atoms associated with a certain query
  writeQuery = (queryInput: string, newData: any, variables?: any) => {
    const { queryString: query } = parseQuery(queryInput);
    // Get the atom container associated with the query
    let atomiAtomContainer = this.getAtomiAtomContainer(query);
    // If the query is cached and setAtom is set
    if (atomiAtomContainer && atomiAtomContainer.setAtom) {
      // Overwrite the atom the with the new data
      // Set loading to false as we have set the data
      this.writeAtom(atomiAtomContainer, newData, false);
    } else {
      // If query does not exist in the cache, set the cache
      const newAtomData: AtomData = {
        data: newData,
        loading: false,
        hasError: false,
      };
      // AtomContainer not cached, so create it.
      atomiAtomContainer = {
        originalQuery: queryInput,
        variables,
        atom: atom(newAtomData),
        atomData: {
          loading: false,
          hasError: false,
          data: newAtomData,
        },
        setAtom: undefined,
      };
      // Store it in the cache
      this.setCache(query, atomiAtomContainer);
    }
  };

  // Use this function to write/update the value of any Atoms
  // DO NOT USE setAtom directly
  writeAtom = (
    atomiAtomContainer: AtomiAtomContainer,
    newData: any,
    loading?: boolean
  ) => {
    const { atomData, setAtom } = atomiAtomContainer;
    // Update the atomData.data value with the newData
    // We do this so that we can access the atomData without invoking the useAtom hook
    // This is because the useAtom hook can only be invoked at the top of a react function component
    atomData.data = newData;
    if (typeof loading !== 'undefined') atomData.loading = loading;
    // Then update the atom itself with the new data
    if (setAtom) {
      setAtom((oldAtomData: AtomData) => ({
        ...oldAtomData,
        loading: typeof loading === 'undefined' ? oldAtomData.loading : loading,
        data: newData,
      }));
    } else {
      console.error('Cannot writeAtom if setAtom is undefined.');
      throw new Error('Cannot writeAtom if setAtom is undefined.');
    }
  };

  // Read the data and get the writeAtom function associated with a certain query
  readQuery = (query: string): ReadQueryOutput => {
    // Parse the query into a reliable format
    const { queryString } = parseQuery(query);
    // Get the atom container
    const atomiAtomContainer = this.getAtomiAtomContainer(queryString);
    if (!atomiAtomContainer) {
      // If the query is not cached, you cannot read it
      console.error('Query not cached');
      throw new Error('Query not cached');
    }
    // Extract the data from the atom container
    const { data } = atomiAtomContainer.atomData;
    // Create the writeAtom function for this this particular atom
    const writeAtom = (newData: any) =>
      this.writeAtom(atomiAtomContainer, newData);
    // Pass the atom data and the writeAtom function to the user
    return {
      data,
      writeAtom,
    };
  };

  render() {
    const { children } = this.props;
    return (
      <AtomiContext.Provider value={this.cacheContainer}>
        {children}
      </AtomiContext.Provider>
    );
  }
}
