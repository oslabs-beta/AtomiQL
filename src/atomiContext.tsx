import { GraphQLClient } from 'graphql-request';
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
};

export const AtomiContext = React.createContext(initialCache);

export default class AtomiProvider extends React.Component<MyProps> {
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
    };
    this.cacheContainer = cacheContainer;
  }

  // Update the path to resolvers object with the resolved local state
  resolvePathToResolvers = (pathToResolver: PathObject, resolvers: Resolvers) => {
    for (const [pathKey, pathValue] of Object.entries(pathToResolver)) {
      const nextResolverNode = resolvers[pathKey]
      if (pathValue.resolveLocally && typeof nextResolverNode === 'function')
        pathValue.resolveLocally = nextResolverNode()
      else if (typeof nextResolverNode === 'object') this.resolvePathToResolvers(pathValue, nextResolverNode);
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
    if (!atomiAtomContainer) {
      console.error('Query not cached');
      throw new Error('Query not cached');
    }
    return atomiAtomContainer;
  };

  // Update the value of the atoms associated with a certain query
  writeQuery = (query: string, newData: any) => {
    const atomiAtomContainer = this.getAtomiAtomContainer(query);
    this.writeAtom(atomiAtomContainer, newData);
  };

  // Use this function to update the value of any Atoms
  // DO NOT USE setAtom directly
  writeAtom = (atomiAtomContainer: AtomiAtomContainer, newData: any) => {
    const { atomData, setAtom } = atomiAtomContainer;
    atomData.data = newData;
    setAtom((oldAtomData: AtomData) => ({
      ...oldAtomData,
      data: newData,
    }));
  };

  // Read the data and get the writeAtom function associated with a certain
  readQuery = (query: string): ReadQueryOutput => {
    const { queryString } = parseQuery(query)
    const atomiAtomContainer = this.getAtomiAtomContainer(queryString);
    const { data } = atomiAtomContainer.atomData;
    const writeAtom = (newData: any) =>
      this.writeAtom(atomiAtomContainer, newData);

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
