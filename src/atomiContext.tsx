import React from 'react';

interface MyProps {
  url: string;
}

interface CacheContainer {
  url: string;
  cache: { [key: string]: { [key: string]: any } };
  setCache: (arg1: string, arg2: {}) => void;
};


const initialCache: CacheContainer = {
  url: '',
  // eslint-disable-next-line no-unused-vars
  setCache: (arg1: string, arg2: { [key: string]: any }) => { },
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

  setCache = (query: string, atom: { [key: string]: any }) => {
    this.cacheContainer.cache = {
      ...this.cacheContainer.cache,
      [query]: atom
    }
    console.log('cache', this.cacheContainer.cache);
    // console.log('read', this.cacheContainer.cache[query].read( (atomdata: any) => console.log(atomdata)))
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
