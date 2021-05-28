import React from 'react';

interface MyProps {
  url: string;
}

interface CacheContainer {
  url: string;
  cache: { [key: string]: { [key: string]: any } };
  setCache: (arg1: string, arg2: {}) => void;
  writeCache: (arg1: string, arg2: any) => void;
  readQuery: (arg1: string) => any;
};


const initialCache: CacheContainer = {
  url: '',
  // eslint-disable-next-line no-unused-vars
  setCache: (arg1: string, arg2: { [key: string]: any }) => { },
  // eslint-disable-next-line no-unused-vars
  writeCache: (arg1: string, arg2: any) => { },
  // eslint-disable-next-line no-unused-vars
  readQuery: (arg1: string) => { },
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
    this.cacheContainer.cache = {
      ...this.cacheContainer.cache,
      [query]: {
        ...this.cacheContainer.cache.query,
        data
      }
    }
  }

  setCache = (query: string, atomData: { [key: string]: any }) => {
    this.cacheContainer.cache = {
      ...this.cacheContainer.cache,
      [query]: atomData
    }
  }

  readQuery = (query: string) => this.cacheContainer.cache[query].data

  render() {
    const { children } = this.props;
    return (
      <AppContext.Provider value={this.cacheContainer}>
        {children}
      </AppContext.Provider>
    );
  }
}
