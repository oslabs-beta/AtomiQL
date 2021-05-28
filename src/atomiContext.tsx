import { Atom } from 'jotai';
import React, { Suspense } from 'react';
import { AtomData } from './useQuery';

interface MyProps {
  url: string;
}

interface CacheContainer {
  url: string;
  cache: { [key: string]: Atom<AtomData> };
  setCache: (arg1: string, arg2: Atom<AtomData>) => void;
};

const initialCache: CacheContainer = {
  url: '',
  // eslint-disable-next-line no-unused-vars
  setCache: (arg1: string, arg2: Atom<AtomData> ) => { },
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

  setCache = (query: string, atom: Atom<AtomData>) => {
    this.cacheContainer.cache = {
      ...this.cacheContainer.cache,
      [query]: atom
    }
    console.log('cache in context setCache', this.cacheContainer.cache);
    // console.log('read', this.cacheContainer.cache[query].read( (atomdata: any) => console.log(atomdata)))
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
