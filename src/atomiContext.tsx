import React from 'react';

export const AppContext = React.createContext({
  url: ''
});

type MyProps = { children: React.ReactNode; url: string; };
type MyState = { url: string };

export default class AtomiProvider extends React.Component<MyProps, MyState> {
  constructor(props: MyProps) {
    super(props)
    this.state = {
      url: props.url
    }
  }

  render() {
    const { url } = this.state;
    return (
      <AppContext.Provider value={{url}}>
        {this.props.children}
      </AppContext.Provider>
    );
  }
}
