import { Atom } from 'jotai';
import { OnMount, SetStateAction, WithInitialValue, Write } from 'jotai/core/types';
import React from 'react';
import { AtomData } from './useQuery';

interface MyProps {
  url: string;
}

export type AtomiAtom = Atom<AtomData> & {
  write: Write<SetStateAction<AtomData>>;
  onMount?: OnMount<SetStateAction<AtomData>> | undefined;
} & WithInitialValue<AtomData>

export type AtomiAtomContainer = {
  atom: AtomiAtom;
  atomData: AtomData;
  writeAtom: (update: SetStateAction<AtomData>) => void | Promise<void>;
}

interface CacheContainer {
  url: string;
  // cache: { [key: string]: { [key: string]: any } };
  // setCache: (arg1: string, arg2: {}) => void;
  writeCache: (arg1: string, arg2: any) => void;
  readQuery: (arg1: string) => any;
  cache: {
    [key: string]: AtomiAtomContainer
  };
  setCache: (arg1: string, arg2: AtomiAtomContainer) => void;
};

const initialCache: CacheContainer = {
  url: '',
  // eslint-disable-next-line no-unused-vars
  // setCache: (arg1: string, arg2: { [key: string]: any }) => { },
  // eslint-disable-next-line no-unused-vars
  writeCache: (arg1: string, arg2: any) => { },
  // eslint-disable-next-line no-unused-vars
  readQuery: (arg1: string) => { },
  // eslint-disable-next-line no-unused-vars
  setCache: (arg1: string, arg2: AtomiAtomContainer) => { },
  cache: {}
}

export const AppContext = React.createContext(initialCache)

export default class AtomiProvider extends React.Component<MyProps> {
  cacheContainer: CacheContainer;

  constructor(props: MyProps) {
    super(props);
    const { url } = this.props;
    const cacheContainer: CacheContainer = {
      url,
      setCache: this.setCache,
      writeCache: this.writeCache,
      readQuery: this.readQuery,
      cache: {}
    }
    this.cacheContainer = cacheContainer;
  }

  writeCache = (query: string, data: any) => {
    // this.cacheContainer.cache = {
    //   ...this.cacheContainer.cache,
    //   [query]: {
    //     ...this.cacheContainer.cache.query,
    //     data
    //   }
    // }
    // const initialAtomData: AtomData = {
    //   loading: true,
    //   hasError: false,
    //   data,
    // };    
    // const newAtom = atom(initialAtomData);
    // const cacheResponse = this.cacheContainer.cache[query];
    // const activeAtom: AtomiAtom = cacheResponse || newAtom;
    // const [atomData, setAtom] = useAtom(activeAtom)
  }

  // setCache = (query: string, atomData: { [key: string]: any }) => {
  setCache = (query: string, atomiAtomContainer: AtomiAtomContainer) => {
    this.cacheContainer.cache = {
      ...this.cacheContainer.cache,
      [query]: atomiAtomContainer
    }
  }

  readQuery = (query: string) => this.cacheContainer.cache[query]

  render() {
    const { children } = this.props;
    return (
      <AppContext.Provider value={this.cacheContainer}>
          {children}
      </AppContext.Provider>
    );
  }
}
