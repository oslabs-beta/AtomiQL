import React from 'react';

export const AppContext = React.createContext<Partial<MyProps>>({});

type MyProps = { children: React.ReactNode; url: string | any; cache?: any; setCache?: any };
type MyState = { 
  url: string, 
  cache?: object,
  setCache?: any
};

export default class AtomiProvider extends React.Component<MyProps, MyState> {
  cacheContainer: any;
  cache: any;
  constructor(props: MyProps) {
    super(props);
    this.cacheContainer = {
      url: this.props.url,
      setCache: this.setCache,
      cache: {}
    }
  }



  setCache = (query: string, atomData: object) => {
    this.cacheContainer.cache = {
      ...this.cache,
      [query]: atomData
    }
  }

  render() {
    return (
      <AppContext.Provider value={this.cacheContainer}> 
        {this.props.children}
      </AppContext.Provider>
    );
  }
}
