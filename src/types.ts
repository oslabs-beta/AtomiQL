import { DocumentNode } from 'graphql';
import { GraphQLClient } from 'graphql-request';
import { Atom, PrimitiveAtom, WritableAtom } from 'jotai';
import { SetStateAction } from 'react';

export type ResponseData = { [key: string]: any };

export type Query = string | DocumentNode;

export interface AtomData {
  loading: boolean;
  data: null | ResponseData;
  hasError: boolean;
}

export type AtomiAtom = PrimitiveAtom<AtomData>;

export interface AtomiAtomContainer {
  originalQuery: string;
  variables: any;
  atom: AtomiAtom;
  atomData: AtomData;
  setAtom?: (update: SetStateAction<AtomData>) => void | Promise<void>;
}

export interface ReadQueryOutput {
  writeAtom: (arg1: any) => void;
  data: any;
}

export interface Resolvers {
  [key: string]: Resolvers | ((...args: any[]) => void);
}

export interface PathObject {
  resolveLocally?: any;
  [key: string]: PathObject;
}

export interface CacheContainer {
  url: string;
  readQuery: (arg1: string) => ReadQueryOutput;
  atomCache: {
    [key: string]: AtomiAtomContainer;
  };
  gqlNodeCache: {
    [key: string]: Object | null;
  };
  queryAtomMap: {
    [key: string]: Set<string>;
  };
  setCache: (arg1: string, arg2: AtomiAtomContainer) => void;
  graphQLClient: GraphQLClient;
  resolvers: Resolvers;
  resolvePathToResolvers: (
    pathToResolvers: PathObject,
    resolvers: Resolvers
  ) => void;
  getAtomiAtomContainer: (query: string) => AtomiAtomContainer;
  writeQuery: (query: string, newData: any) => void;
  typeDefs: DocumentNode;
}

export interface ServerState {
  [key: string]: ServerState;
}
