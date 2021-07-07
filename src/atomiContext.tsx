import { GraphQLClient } from 'graphql-request';
import { isEqual } from 'lodash';
import { atom } from 'jotai';
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
  QueryAtomMap
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
  getAtomiAtomContainer: () => ({
    atom: atom({}),
    atomData: {
      loading: false,
      hasError: false,
      data: {},
    },
    setAtom: undefined,
  }),
  writeQuery: () => ({}),
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
      atomCache: {},
      gqlNodeCache: {},
      queryAtomMap: {},
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
    /*
    goals:
      1. store the query string and the atomData into atomCache object
      2. flatten the query into an object
      3. store links between gqlNodes and queryStrings (atoms) into queryAtomMap
      4. from queryAtomMap, pull the list of atoms contain that data
      5. from that list, figure out which atoms contain different data
      6. update each different atom with the updated data3ee

    */


    console.log('query in setCache', query);
    console.log('atomiAtomContainer in setCache', atomiAtomContainer);

    // if the query does not return any data, then update the atomcache but not anything else
    if (!atomiAtomContainer.atomData.data) {
      this.setAtomCache(query, atomiAtomContainer);
      return;
    }

    // flattens query 
    const flattenedQuery = flattenQuery(atomiAtomContainer.atomData.data);
    // console.log('flattenedQuery in setCache', flattenedQuery);

    this.setQueryAtomMap(flattenedQuery, query);

    // uncomment setNodeCache to test findDiffs
    // this.setNodeCache(flattenedQuery);

    if (Object.keys(this.cacheContainer.atomCache).length) {
      this.updateAtomsFromCache(query, atomiAtomContainer, flattenedQuery);
    };

    this.setAtomCache(query, atomiAtomContainer);
    console.log('queryAtomMap in setCache', this.cacheContainer.queryAtomMap);
    console.log('atomCache in setCache', this.cacheContainer.atomCache);
    // console.log('cachedFlatNodes in setCache', flattenedQuery);

    this.setNodeCache(flattenedQuery);
  };

  // Store links between gql nodes and atoms by query key
  setQueryAtomMap = (flattenedQuery: ResponseData, query: string) => {
    console.log('flattened query in setQueryAtomMap', flattenedQuery);
    const queryAtomMap: QueryAtomMap = {};

    // [key: string]: Set< Array<string> > 

    // Set<Array<number|string>>

    for (const queryNode in flattenedQuery) {
      // console.log('queryNode in queryQueryAtomMap', queryNode);
      if (!queryAtomMap[queryNode]) {
        queryAtomMap[queryNode] = new Set([query]);
        // console.log('if stmt in setQueryAtomMap');
      } else {
        queryAtomMap[queryNode].add(query);
        // console.log('else stmt in setQueryAtomMap')
      }
    }

    console.log('queryAtomMap in setQueryAtomMap', queryAtomMap);

    this.cacheContainer.queryAtomMap = {
      ...this.cacheContainer.queryAtomMap,
      ...queryAtomMap,
    };
  };

  setAtomCache = (query: string, atomiAtomContainer: AtomiAtomContainer) => {
    this.cacheContainer.atomCache = {
      ...this.cacheContainer.atomCache,
      [query]: atomiAtomContainer
    };
  }
  
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

  updateAtomsFromCache = (query: string, atomiAtomContainer: AtomiAtomContainer, flattenedQuery: ResponseData) => {

    console.log('update atoms called, flattenedQuery = ', flattenedQuery);
    const atomsToUpdate: Set<string> = new Set();
    Object.keys(flattenedQuery).forEach((queryNodeId: string) => {
      console.log('flattenedQuery[queryNodeId', flattenedQuery[queryNodeId]);
      console.log('this.cacheContainer.gqlNodeCache', this.cacheContainer.gqlNodeCache);
      if (
        !isEqual(
          flattenedQuery[queryNodeId],
          this.cacheContainer.gqlNodeCache[queryNodeId]
        )
      ) {
        console.log('difference found in updateAtomsFromCache', this.cacheContainer.queryAtomMap[queryNodeId]);
        console.log(this.cacheContainer.queryAtomMap[queryNodeId])
        this.cacheContainer.queryAtomMap[queryNodeId].forEach( (atomString) => {
          console.log('atomString', atomString);
          console.log('typeof atomString', typeof atomString);
          // if(atomString !== query) 
          atomsToUpdate.add(atomString)
        });
      }
    });



    console.log('atomsToUpdate', atomsToUpdate);
    // const testObj1 = { a : [ 2, 3 ], b : [ 4 ] }
    // const testObj2 = { a : [ 4, 3 ], b : [ 4 ] }
    // console.log('deepequal test', isEqual(testObj1, testObj2))

    // const newAtomData = {
    //   ...atomiAtomContainer.atomData,

    // }
    // atomsToUpdate.forEach((atomQuery: string) => {
    //   console.log('atomQuery', atomQuery);
    //   this.writeAtom(this.getAtomiAtomContainer(query), )

    // });
  };

  reQuery = (query: string) => {
    
  }


  // Get the atom container for a certain query
  getAtomiAtomContainer = (query: string): AtomiAtomContainer => {
    const atomiAtomContainer = this.cacheContainer.atomCache[query];
    // If we cannot find the atom container, throw an error
    return atomiAtomContainer;
  };

  isQueryCached = (query: string): boolean =>
    !!this.cacheContainer.atomCache[query];

  // Update the value of the atoms associated with a certain query
  writeQuery = (queryInput: string, newData: any) => {
    console.log('newData in writeQuery', newData);
    const { queryString: query } = parseQuery(queryInput);
    // Get the atom container associated with the query
    let atomiAtomContainer = this.getAtomiAtomContainer(query);
    // If the query is cached and setAtom is set
    if (atomiAtomContainer && atomiAtomContainer.setAtom) {
      // Overwrite the atom the with the new data
      // Set loading to false as we have set the data

      console.log('writingAtom from writeQuery');
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
        atom: atom(newAtomData),
        atomData: {
          loading: false,
          hasError: false,
          data: newAtomData,
        },
        setAtom: undefined,
      };
      // Store it in the cache
      console.log('calling setCache, atomiAtomContainer from writeQuery', atomiAtomContainer);
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
