import React from 'react';
import { AtomData, AtomiAtomContainer, CacheContainer, ReadQueryOutput } from './types';

interface MyProps {
  url: string;
}

const initialCache: CacheContainer = {
  url: '',
  // eslint-disable-next-line no-unused-vars
  writeCache: (arg1: string, arg2: any) => { },
  // eslint-disable-next-line no-unused-vars
  readQuery: (arg1: string) => ({ data: {}, writeAtom: () => { } }),
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
    const atomiAtomContainer = this.readQuery(query)
    const { writeAtom } = atomiAtomContainer;
    writeAtom((atomData: AtomData) => ({
      ...atomData,
      data
    }));
    return data;
  }

  setCache = (query: string, atomiAtomContainer: AtomiAtomContainer) => {
    this.cacheContainer.cache = {
      ...this.cacheContainer.cache,
      [query]: atomiAtomContainer
    }
  }

  readQuery = (query: string): ReadQueryOutput => {
    const atomiAtomContainer = this.cacheContainer.cache[query];
    if (!atomiAtomContainer) throw new Error('Query not cached');
    const { writeAtom, atomData: { data } } = atomiAtomContainer;
    const writeAtomWrapper = (newData: any) => {
      writeAtom((atomData: AtomData) => ({
        ...atomData,
        data: newData,
      })
      )
    }
    return {
      data,
      writeAtom: writeAtomWrapper
    }
  }

  render() {
    const { children } = this.props;
    return (
      <AppContext.Provider value={this.cacheContainer}>
        {children}
      </AppContext.Provider>
    );
  }
}
