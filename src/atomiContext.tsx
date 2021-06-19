import { GraphQLClient } from 'graphql-request';
import React from 'react';
import {
  AtomData,
  AtomiAtomContainer,
  CacheContainer,
  ReadQueryOutput,
} from './types';

interface MyProps {
  url: string;
  resolvers: any;
}

const initialCache: CacheContainer = {
  url: '',
  // eslint-disable-next-line no-unused-vars
  readQuery: (arg1: string) => ({ data: {}, writeAtom: () => {} }),
  // eslint-disable-next-line no-unused-vars
  setCache: (arg1: string, arg2: AtomiAtomContainer) => {},
  cache: {},
  graphQLClient: new GraphQLClient(''),
  resolvers: {},
  resolveLocalState: () => {},
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
      resolvers,
      resolveLocalState: this.resolveLocalState,
    };
    this.cacheContainer = cacheContainer;
  }

  resolveLocalState = (pathToLocalResolver: any) => {
    const { resolvers } = this.cacheContainer;
    let currentResolverLevel = resolvers;

    const recurseThroughPath = (resolverPathNode: any) => {
      if (!resolverPathNode) return;
      let nextLevel: any;
      // eslint-disable-next-line no-restricted-syntax
      for (const [key, value] of Object.entries(resolverPathNode)) {
        if (value.resolveLocally) {
          const resolverFunction = currentResolverLevel[key];
          value.resolveLocally = resolverFunction()
          return;
        }
        currentResolverLevel = currentResolverLevel[key];
        nextLevel = value;
      }
      recurseThroughPath(nextLevel);
    };

    recurseThroughPath(pathToLocalResolver);
    return currentResolverLevel();
  };

  setCache = (query: string, atomiAtomContainer: AtomiAtomContainer) => {
    this.cacheContainer.cache = {
      ...this.cacheContainer.cache,
      [query]: atomiAtomContainer,
    };
  };

  getAtomiAtomContainer = (query: string): AtomiAtomContainer => {
    const atomiAtomContainer = this.cacheContainer.cache[query];
    if (!atomiAtomContainer) throw new Error('Query not cached');
    return atomiAtomContainer;
  };

  writeQuery = (query: string, newData: any) => {
    const atomiAtomContainer = this.getAtomiAtomContainer(query);
    this.updateAtom(atomiAtomContainer, newData);
  };

  updateAtom = (atomiAtomContainer: AtomiAtomContainer, newData: any) => {
    const { atomData, writeAtom } = atomiAtomContainer;
    atomData.data = newData;
    writeAtom((oldAtomData: AtomData) => ({
      ...oldAtomData,
      data: newData,
    }));
  };

  readQuery = (query: string): ReadQueryOutput => {
    const atomiAtomContainer = this.getAtomiAtomContainer(query);
    const { data } = atomiAtomContainer.atomData;
    const writeAtom = (newData: any) =>
      this.updateAtom(atomiAtomContainer, newData);

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
