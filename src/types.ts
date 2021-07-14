import { DocumentNode } from 'graphql';
import { GraphQLClient } from 'graphql-request';
import {
  // OnMount,
  SetStateAction,
  // WithInitialValue,
  // Write,
  // Getter,
  // Setter,
  // Atom,
  PrimitiveAtom,
} from 'jotai';

// export type SetAtom<Update> = undefined extends Update
//   ? (update?: Update) => void | Promise<void>
//   : (update: Update) => void | Promise<void>

// export type OnUnmount = () => void
// export type OnMount<Update> = <S extends SetAtom<Update>>(
//   setAtom: S
// ) => OnUnmount | void

// export type WithInitialValue<Value> = {
//   init: Value
// }

// export type Write<Update> = (
//   get: Getter,
//   set: Setter,
//   update: Update
// ) => void | Promise<void>

export type ResponseData = { [key: string]: any };

export type Query = string | DocumentNode;

export interface AtomData {
  loading: boolean;
  data: null | ResponseData;
  hasError: boolean;
}

// export type AtomiAtom = Atom<AtomData> & {
//   write: Write<SetStateAction<AtomData>>;
//   onMount?: OnMount<SetStateAction<AtomData>>;
// } & WithInitialValue<AtomData>;

export type AtomiAtom = PrimitiveAtom<AtomData>

export interface AtomiAtomContainer {
  originalQuery: string;
  variables: any;
  atom: AtomiAtom | any; // see if this can be avoided
  atomData: AtomData;
  setAtom?: (update: SetStateAction<AtomData>) => void | Promise<void>;
}

export interface ReadQueryOutput {
  writeAtom: (arg1: any) => void;
  data: any;
}

export interface Resolvers {
  [key: string]: Resolvers | (() => void);
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
}

export interface ServerState {
  [key: string]: ServerState;
}
