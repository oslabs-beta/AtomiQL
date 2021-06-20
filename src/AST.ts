import {
  DocumentNode,
  parse,
  visit,
  FieldNode,
  DirectiveNode,
  print,
} from 'graphql';
import { Query } from './types';

export type Directives = readonly DirectiveNode[] | undefined;

export interface UpdatedASTResponse {
  updatedAST: DocumentNode;
  pathToLocalResolver: any;
}
export interface ParseQueryResponse {
  updatedAST: DocumentNode;
  queryString: string;
  pathToLocalResolver: any;
}

export const getASTFromQuery = (query: Query): DocumentNode =>
  typeof query === 'string' ? parse(query) : query;

const nodeHasDirectives = (node: FieldNode): boolean =>
  !!node.directives && node.directives.length > 0;

const directiveIsType = (directives: Directives, type: string) =>
  !!directives && directives[0].name.value === type;

const updatePathToLocalResolverOnFieldEnter = (
  pathToLocalResolver: any,
  node: FieldNode
) => {
  const name: string = node.name.value;
  const hasChildren = !!node.selectionSet;
  // Add a key of the Field name to pathToLocalResolver
  pathToLocalResolver[name] = {};
  pathToLocalResolver[name].parent = pathToLocalResolver;
  pathToLocalResolver[name].hasChildren = hasChildren;
  return pathToLocalResolver[name];
};

export const removeFieldsWithClientDirective = (
  ast: DocumentNode
): UpdatedASTResponse => {
  let foundClientDirective = false;
  let pathToLocalResolver: any = {};
  const updatedAST = visit(ast, {
    Field: {
      enter(node: FieldNode) {
        // Track in pathToLocalResolver each Field in the query
        pathToLocalResolver = updatePathToLocalResolverOnFieldEnter(
          pathToLocalResolver,
          node
        );
      },
      leave(node: FieldNode) {
        pathToLocalResolver = pathToLocalResolver.parent;
        const name: string = node.name.value;
        const { directives } = node;
        // If the Field has an @client directive, remove this Field
        if (nodeHasDirectives(node) && directiveIsType(directives, 'client')) {
          pathToLocalResolver[name].resolveLocally = true;
          foundClientDirective = true;
          return null;
        }
        if (!pathToLocalResolver[name].hasChildren)
          delete pathToLocalResolver[name];

        return node;
      },
    },
  });
  if (foundClientDirective) cleanUpPathToLocalResolver(pathToLocalResolver);
  else pathToLocalResolver = false;

  return { updatedAST, pathToLocalResolver };
};

export const cleanUpPathToLocalResolver = (pathToLocalResolver: any) => {
  for (const [key, value] of Object.entries(pathToLocalResolver)) {
    if (key === 'hasChildren') delete pathToLocalResolver[key];
    else if (key === 'parent') delete pathToLocalResolver[key];
    else cleanUpPathToLocalResolver(value);
  }
  removeEmptyFields(pathToLocalResolver);
};

export const removeEmptyFields = (pathToLocalResolver: any) => {
  for (const [key, value] of Object.entries(pathToLocalResolver)) {
    if (JSON.stringify(value) === '{}') delete pathToLocalResolver[key];
    else removeEmptyFields(value);
  }
};

export const getQueryStructure = (ast: DocumentNode): UpdatedASTResponse => {
  const queryStructure: any = {};
  let pathToLocalResolver = queryStructure;
  visit(ast, {
    Field: {
      enter(node) {
        const name: string = node.name.value;
        pathToLocalResolver[name] = {};
        pathToLocalResolver[name].parent = pathToLocalResolver;
        pathToLocalResolver = pathToLocalResolver[name];
      },
      leave(node) {
        pathToLocalResolver = pathToLocalResolver.parent;
      },
    },
  });
  return queryStructure;
};

export const parseQuery = (query: Query): ParseQueryResponse => {
  const AST = getASTFromQuery(query);
  const queryString = print(AST);
  const { updatedAST, pathToLocalResolver } =
    removeFieldsWithClientDirective(AST);
  return {
    updatedAST,
    queryString,
    pathToLocalResolver,
  };
};
