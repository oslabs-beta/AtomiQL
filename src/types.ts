import {
  OnMount,
  SetStateAction,
  WithInitialValue,
  Write,
  Atom,
} from 'jotai/core/types';

export type ResponseData = { [key: string]: any };

export interface AtomData {
  loading: boolean;
  data: null | ResponseData;
  hasError: boolean;
}

export type AtomiAtom = Atom<AtomData> & {
  write: Write<SetStateAction<AtomData>>;
  onMount?: OnMount<SetStateAction<AtomData>> | undefined;
} & WithInitialValue<AtomData>;

export type AtomiAtomContainer = {
  atom: AtomiAtom;
  atomData: AtomData;
  writeAtom: (update: SetStateAction<AtomData>) => void | Promise<void>;
};

export interface ReadQueryOutput {
  writeAtom: (arg1: any) => void;
  data: any;
}
export interface CacheContainer {
  url: string;
  readQuery: (arg1: string) => ReadQueryOutput;
  cache: {
    [key: string]: AtomiAtomContainer;
  };
  setCache: (arg1: string, arg2: AtomiAtomContainer) => void;
}