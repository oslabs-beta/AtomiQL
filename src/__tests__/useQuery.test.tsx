import React, { useContext } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import { gql } from 'graphql-request';
import useQuery, { GetAtom } from '../useQuery';
import { AtomiProvider, AtomiContext } from '../atomiContext';

describe('AtomiContext', () => {
  afterEach(() => {
    cleanup();
  });

  test('Component under AtomiProvider should render', () => {
    render(
      <AtomiProvider url="https://graphql-pokemon2.vercel.app">
        <div>Test Render</div>
      </AtomiProvider>
    );
    expect(screen.getByText('Test Render')).toBeInTheDocument();
  });

  test('URL should be available to context API store via the useContext hook', async () => {
    function CheckContext() {
      const result = useContext(AtomiContext);
      return <div>{result.url}</div>;
    }
    const url = 'https://graphql-pokemon2.vercel.app';

    render(
      <AtomiProvider url={url}>
        <CheckContext />
      </AtomiProvider>
    );

    expect(screen.getByText(url)).toBeInTheDocument();
  });
});

describe('UseQuery', () => {
  afterEach(() => {
    cleanup();
  });

  test('Data should load from useQuery hook', async () => {
    const query = gql`
      query {
        pokemons(first: 3) {
          id
          name
        }
      }
    `;
    const wrapper: React.ComponentType = ({ children }): React.ReactElement => (
      <AtomiProvider url="https://graphql-pokemon2.vercel.app">
        {children}
      </AtomiProvider>
    );

    const { result, waitForNextUpdate } = renderHook(() => useQuery(query), {
      wrapper,
    });
    await waitForNextUpdate();

    expect(result?.current[0]?.pokemons.length).toBe(3);
  });

  test('Data should be available in the Jotai atom', async () => {
    const query = gql`
      query {
        pokemons(first: 3) {
          id
          name
        }
      }
    `;
    const wrapper: React.ComponentType = ({ children }): React.ReactElement => (
      <AtomiProvider url="https://graphql-pokemon2.vercel.app">
        {children}
      </AtomiProvider>
    );

    const { waitForNextUpdate } = renderHook(() => useQuery(query), {
      wrapper,
    });
    await waitForNextUpdate();

    const { result } = renderHook(() => GetAtom(), { wrapper });
    expect(result?.current?.data?.pokemons.length).toBe(3);
  });

  test('Ensure query is being stored on the cache', async () => {
    expect(1).toBe(0);
  });

  test('If query is ran more than once, it should be retrieved from cache', async () => {
    expect(1).toBe(0);
  });
});
