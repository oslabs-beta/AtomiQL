import { GraphQLClient } from 'graphql-request';
import { atom } from 'jotai';
import React from 'react';
import { parseQuery } from './AST';
import {
  AtomData,
  AtomiAtomContainer,
  CacheContainer,
  PathObject,
  ReadQueryOutput,
  Resolvers,
} from './types';

interface MyProps {
  url: string;
  resolvers?: Resolvers;
}

const initialCache: CacheContainer = {
  url: '',
  // eslint-disable-next-line no-unused-vars
  readQuery: (arg1: string) => ({ data: {}, writeAtom: () => ({}) }),
  // eslint-disable-next-line no-unused-vars
  setCache: (arg1: string, arg2: AtomiAtomContainer) => ({}),
  cache: {},
  graphQLClient: new GraphQLClient(''),
  resolvers: {},
  resolvePathToResolvers: () => ({}),
  getAtomiAtomContainer: () => ({
    atom: atom({}),
    atomData: {
      loading: false,
      hasError: false,
      data: {}
    },
    setAtom: undefined,
  }),
  writeQuery: () => ({})
};

export const AtomiContext = React.createContext(initialCache);

export class AtomiProvider extends React.Component<MyProps> {
  cacheContainer: CacheContainer;

  constructor(props: MyProps) {
    super(props);
    const { url, resolvers } = this.props;
    const graphQLClient = new GraphQLClient(url);
    const cacheContainer: CacheContainer = {
      url,
      setCache: this.setCache,
      readQuery: this.readQuery,
      cache: {},
      graphQLClient,
      resolvers: resolvers || {},
      resolvePathToResolvers: this.resolvePathToResolvers,
      getAtomiAtomContainer: this.getAtomiAtomContainer,
      writeQuery: this.writeQuery,
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
    this.cacheContainer.cache = {
      ...this.cacheContainer.cache,
      [query]: atomiAtomContainer,
    };
  };

  // Get the atom container for a certain query
  getAtomiAtomContainer = (query: string): AtomiAtomContainer => {
    const atomiAtomContainer = this.cacheContainer.cache[query];
    // If we cannot find the atom container, throw an error
    return atomiAtomContainer;
  };

  isQueryCached = (query: string): boolean => !!this.cacheContainer.cache[query];

  // Update the value of the atoms associated with a certain query
  writeQuery = (queryInput: string, newData: any) => {
    const {queryString: query} = parseQuery(queryInput)
    // Get the atom container associated with the query
    let atomiAtomContainer = this.getAtomiAtomContainer(query);
    if (atomiAtomContainer && atomiAtomContainer.setAtom) {
      // Overwrite the atom the with the new data
      // Set loading to false as we have set the data
      this.writeAtom(atomiAtomContainer, newData, false);
    } else {
      const newAtomData: AtomData = {
        data: newData,
        loading: false,
        hasError: false,
      };
      // AtomContainer not cached, so create it.
      atomiAtomContainer = {
        atom: atom(newAtomData),
        atomData: {
          loading: false,
          hasError: false,
          data: newAtomData
        },
        setAtom: undefined
      }
      // Store it in the cache
      this.setCache(query, atomiAtomContainer);
    }
  };



  // Use this function to write/update the value of any Atoms
  // DO NOT USE setAtom directly
  writeAtom = (atomiAtomContainer: AtomiAtomContainer, newData: any, loading: boolean | undefined = undefined) => {
    const { atomData, setAtom } = atomiAtomContainer;
    // Update the atomData.data value with the newData
    // We do this so that we can access the atomData without invoking the useAtom hook
    // This is because the useAtom hook can only be invoked at the top of a react function component
    atomData.data = newData;
    if (typeof loading !== 'undefined') atomData.loading = loading;
    // Then update the atom itself with the new data
    if (setAtom) {
      if (typeof loading === 'undefined') {
        setAtom((oldAtomData: AtomData) => ({
          ...oldAtomData,
          data: newData,
        }));
      } else {
        setAtom((oldAtomData: AtomData) => ({
          ...oldAtomData,
          loading,
          data: newData,
        }));
      }

    } else {
      console.error('Cannot writeAtom if setAtom is undefined.')
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
