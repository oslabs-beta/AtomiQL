import { GraphQLClient } from 'graphql-request';
import { isEqual } from 'lodash';
import React from 'react';
import { parseQuery, flattenQuery } from './AST';

import {
  AtomData,
  AtomiAtomContainer,
  CacheContainer,
  PathObject,
  ReadQueryOutput,
  Resolvers,
  ResponseData,
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
  atomCache: {},
  gqlNodeCache: {},
  queryAtomMap: {},
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
      atomCache: {},
      gqlNodeCache: {},
      queryAtomMap: {},
      graphQLClient,
      resolvers: resolvers || {},
      resolvePathToResolvers: this.resolvePathToResolvers,
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
<<<<<<< HEAD
    const flattenedQuery = flattenQuery(atomiAtomContainer.atomData.data);

    if (Object.keys(this.cacheContainer.atomCache).length) {
      this.setQueryAtomMap(flattenedQuery, query);
      this.updateAtomsFromCache(flattenedQuery);
    }

=======
>>>>>>> 830b5b2ce32f019e1f8fb5dd79805924c0210cd3
    this.cacheContainer.atomCache = {
      ...this.cacheContainer.atomCache,
      [query]: atomiAtomContainer,
    };

    console.log('atomCache in setCache', this.cacheContainer.atomCache);
    console.log('atomiAtomContainer in setCache', atomiAtomContainer);

<<<<<<< HEAD
=======
    const flattenedQuery = flattenQuery(atomiAtomContainer.atomData.data);

    this.setQueryAtomMap(flattenedQuery, query);

    this.updateAtomsFromCache(flattenedQuery);

>>>>>>> 830b5b2ce32f019e1f8fb5dd79805924c0210cd3
    this.setNodeCache(flattenedQuery);

    console.log('cachedFlatNodes in setCache', flattenedQuery);
    console.log('queryAtomMap in setCache', this.cacheContainer.queryAtomMap);
  };

  // Store links between gql nodes and atoms by query key
  setQueryAtomMap = (flattenedQuery: ResponseData, query: string) => {
    const queryAtomMap: { [key: string]: Set<string> } = {};

    for (const queryNode in flattenedQuery) {
      if (queryAtomMap[queryNode]) {
        queryAtomMap[queryNode].add(query);
      } else {
        queryAtomMap[queryNode] = new Set([query]);
      }
    }

    console.log('queryAtomMap in setQueryAtomMap', queryAtomMap);

    this.cacheContainer.queryAtomMap = {
      ...this.cacheContainer.queryAtomMap,
      ...queryAtomMap,
    };
  };

  // Store in a node cache data for each gql object received from the server
  setNodeCache = (flattenedQueryData: ResponseData | null) => {
    this.cacheContainer.gqlNodeCache = {
      ...this.cacheContainer.gqlNodeCache,
      ...flattenedQueryData,
    };
    console.log(
      'gqlNodeCache after flatten merge',
      this.cacheContainer.gqlNodeCache
    );
  };

  updateAtomsFromCache = (flattenedQuery: ResponseData) => {
    const atomsToUpdate: Array<string> = [];
    Object.keys(flattenedQuery).forEach((queryNodeId: string) => {
      if (
        !isEqual(
          flattenedQuery[queryNodeId],
          this.cacheContainer.gqlNodeCache[queryNodeId]
        )
      ) {
        console.log('difference found in updateAtomsFromCache');
        atomsToUpdate.push(queryNodeId);
      }
    });

    // const testObj1 = { a : [ 2, 3 ], b : [ 4 ] }
    // const testObj2 = { a : [ 4, 3 ], b : [ 4 ] }
    // console.log('deepequal test', isEqual(testObj1, testObj2))

<<<<<<< HEAD
    atomsToUpdate.forEach( (queryNodeId:string) => {
      console.log('queryNodeId', queryNodeId);
      
    })

  }
=======
    atomsToUpdate.forEach((queryNodeId: string) => {
      // this.writeAtom()
    });
  };
>>>>>>> 830b5b2ce32f019e1f8fb5dd79805924c0210cd3

  // Get the atom container for a certain query
  getAtomiAtomContainer = (query: string): AtomiAtomContainer => {
    const atomiAtomContainer = this.cacheContainer.atomCache[query];
    // If we cannot find the atom container, throw an error
    if (!atomiAtomContainer) {
      console.error('Query not cached');
      throw new Error('Query not cached');
    }
    return atomiAtomContainer;
  };

  // Update the value of the atoms associated with a certain query
  writeQuery = (query: string, newData: any) => {
    // Get the atom container associated with the query
    const atomiAtomContainer = this.getAtomiAtomContainer(query);
    // Overwrite the atom the with the new data
    this.writeAtom(atomiAtomContainer, newData);
  };

  // Use this function to write/update the value of any Atoms
  // DO NOT USE setAtom directly
  writeAtom = (atomiAtomContainer: AtomiAtomContainer, newData: any) => {
    const { atomData, setAtom } = atomiAtomContainer;
    // Update the atomData.data value with the newData
    // We do this so that we can access the atomData without invoking the useAtom hook
    // This is because the useAtom hook can only be invoked at the top of a react function component
    atomData.data = newData;
    // Then update the atom itself with the new data
    setAtom((oldAtomData: AtomData) => ({
      ...oldAtomData,
      data: newData,
    }));
  };

  // Read the data and get the writeAtom function associated with a certain
  readQuery = (query: string): ReadQueryOutput => {
    // Parse the query into a reliable format
    const { queryString } = parseQuery(query);
    // Get the atom container
    const atomiAtomContainer = this.getAtomiAtomContainer(queryString);
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
