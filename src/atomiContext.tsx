import React from 'react';

export const AppContext = React.createContext<Partial<MyProps>>({});

type MyProps = { children: React.ReactNode; url: string | any; cache?: any; setCache?: any };
type MyState = { 
  url: string, 
  cache?: object,
  setCache?: any
};

export default class AtomiProvider extends React.Component<MyProps, MyState> {
  constructor(props: MyProps) {
    super(props);
    this.state = {
      url: props.url,
      cache: {},
      setCache: this.setCache
    }
  }

  setCache = (query: string, atomData: object) => {
    this.setState(
      {
        cache: {[query]: atomData, ...this.state.cache}
      }
    )
  }

  render() {
    return (
      <AppContext.Provider value={this.state}> 
        {this.props.children}
      </AppContext.Provider>
    );
  }
}
