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
  pathToResolver: any;
}
export interface ParseQueryResponse {
  updatedAST: DocumentNode;
  queryString: string;
  pathToResolver: any;
}

export const getASTFromQuery = (query: Query): DocumentNode =>
  typeof query === 'string' ? parse(query) : query;

const nodeHasDirectives = (node: FieldNode): boolean =>
  !!node.directives && node.directives.length > 0;

const directiveIsType = (directives: Directives, type: string) =>
  !!directives && directives[0].name.value === type;

const updatePathToResolverOnFieldEnter = (
  pathToResolver: any,
  node: FieldNode
) => {
  const name: string = node.name.value;
  const hasChildren = !!node.selectionSet;
  // Add a key of each Field name to pathToResolver
  pathToResolver[name] = {};
  // Add a link from each child Field its parent
  pathToResolver[name].parent = pathToResolver;
  // Add a boolean to each Field whether it has child fields
  pathToResolver[name].hasChildren = hasChildren;
  // Return the pathToResolver at the next level of depth
  return pathToResolver[name];
};

export const removeFieldsWithClientDirective = (
  ast: DocumentNode
): UpdatedASTResponse => {
  let foundClientDirective = false;
  let pathToResolver: any = {};
  const updatedAST = visit(ast, {
    Field: {
      enter(node: FieldNode) {
        // Track in pathToResolver each Field in the query
        pathToResolver = updatePathToResolverOnFieldEnter(pathToResolver, node);
      },
      leave(node: FieldNode) {
        // Move pathResolver one level up towards its root
        pathToResolver = pathToResolver.parent;
        const name: string = node.name.value;
        const { directives } = node;
        // Check if this field has an @client directive
        if (nodeHasDirectives(node) && directiveIsType(directives, 'client')) {
          foundClientDirective = true;
          // Let pathToResolver know to resolve this Filed locally
          pathToResolver[name].resolveLocally = true;
          // Returning null removes this field from the AST
          return null;
        }
      },
    },
  });
  if (foundClientDirective) cleanUpPathToResolver(pathToResolver);
  else pathToResolver = false;

  return { updatedAST, pathToResolver };
};

export const cleanUpPathToResolver = (pathToResolver: any) => {
  for (const [key, value] of Object.entries(pathToResolver)) {
    if (key === 'hasChildren') delete pathToResolver[key];
    else if (key === 'parent') delete pathToResolver[key];
    else cleanUpPathToResolver(value);
  }
  removeEmptyFields(pathToResolver);
};

export const removeEmptyFields = (pathToResolver: any) => {
  for (const [key, value] of Object.entries(pathToResolver)) {
    if (JSON.stringify(value) === '{}') delete pathToResolver[key];
    else removeEmptyFields(value);
  }
};

export const getQueryStructure = (ast: DocumentNode): UpdatedASTResponse => {
  const queryStructure: any = {};
  let pathToResolver = queryStructure;
  visit(ast, {
    Field: {
      enter(node) {
        const name: string = node.name.value;
        pathToResolver[name] = {};
        pathToResolver[name].parent = pathToResolver;
        pathToResolver = pathToResolver[name];
      },
      leave(node) {
        pathToResolver = pathToResolver.parent;
      },
    },
  });
  return queryStructure;
};

export const parseQuery = (query: Query): ParseQueryResponse => {
  const AST = getASTFromQuery(query);
  const queryString = print(AST);
  const { updatedAST, pathToResolver } = removeFieldsWithClientDirective(AST);
  return {
    updatedAST,
    queryString,
    pathToResolver,
  };
};
