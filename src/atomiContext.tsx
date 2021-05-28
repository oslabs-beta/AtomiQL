import { Atom } from 'jotai';
import { OnMount, SetStateAction, WithInitialValue, Write } from 'jotai/core/types';
import React, { Suspense } from 'react';
import { AtomData } from './useQuery';

interface MyProps {
  url: string;
}

export type AtomiAtom = Atom<AtomData> & {
  write: Write<SetStateAction<AtomData>>;
  onMount?: OnMount<SetStateAction<AtomData>> | undefined;
} & WithInitialValue<AtomData>

interface CacheContainer {
  url: string;
  cache: { [key: string]: AtomiAtom };
  setCache: (arg1: string, arg2: AtomiAtom) => void;
};

const initialCache: CacheContainer = {
  url: '',
  // eslint-disable-next-line no-unused-vars
  setCache: (arg1: string, arg2: AtomiAtom ) => { },
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
      cache: {}
    }
    this.cacheContainer = cacheContainer;
  }

  setCache = (query: string, atom: AtomiAtom) => {
    this.cacheContainer.cache = {
      ...this.cacheContainer.cache,
      [query]: atom
    }
  }

  render() {
    const { children } = this.props;
    return (
      <AppContext.Provider value={this.cacheContainer}>
        <Suspense fallback='loading...'>
          {children}
        </Suspense>
      </AppContext.Provider>
    );
  }
}
