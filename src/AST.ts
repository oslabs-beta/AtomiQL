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
  foundClientDirective: boolean;
}
export interface ParseQueryResponse {
  updatedAST: DocumentNode;
  queryString: string;
  pathToResolver: any;
  foundClientDirective: boolean;
}

export const getASTFromQuery = (query: Query): DocumentNode =>
  typeof query === 'string' ? parse(query) : query;

const nodeHasDirectives = (node: FieldNode): boolean =>
  !!node.directives && node.directives.length > 0;

const directiveIsType = (directives: Directives, type: string) =>
  !!directives && directives[0].name.value === type;

const nodeHasClientDirective = (node: FieldNode) =>
  nodeHasDirectives(node) && directiveIsType(node.directives, 'client');

const updatePathToResolverOnEnter = (pathToResolver: any, node: FieldNode) => {
  const name: string = node.name.value;
  // Add a key of each Field name to pathToResolver
  pathToResolver[name] = {};
  // Add a link from each child Field its parent
  pathToResolver[name].parent = pathToResolver;
  // Return the pathToResolver at the next level of depth
  return pathToResolver[name];
};

const updatePathToResolverOnLeave = (pathToResolver: any, node: FieldNode) => {
  // Move pathResolver one level up towards its root
  pathToResolver = pathToResolver.parent;
  const name: string = node.name.value;
  // If this Field has an @client directive tell it to resolveLocally
  if (nodeHasClientDirective(node)) pathToResolver[name].resolveLocally = true;
  return pathToResolver;
};

export const removeFieldsWithClientDirectiveAndCreatePathToResolver = (
  AST: DocumentNode
): UpdatedASTResponse => {
  let foundClientDirective = false;
  let pathToResolver: any = {};
  const updatedAST = visit(AST, {
    Field: {
      enter(node: FieldNode) {
        // Track in pathToResolver each Field in the query and move  it one level deeper
        pathToResolver = updatePathToResolverOnEnter(pathToResolver, node);
      },
      leave(node: FieldNode) {
        // Update and move pathResolver back up one level towards its root
        pathToResolver = updatePathToResolverOnLeave(pathToResolver, node);

        // If this Field has an @client directive remove it from the AST
        if (nodeHasClientDirective(node)) {
          foundClientDirective = true;
          // Returning null removes this field from the AST
          return null;
        }
      },
    },
  });

  // If @client directive found remove the links from each node to its parent in pathToResolver
  if (foundClientDirective) removeParentFieldsFromTree(pathToResolver);

  return { updatedAST, pathToResolver, foundClientDirective };
};

// removeParentFieldsFromTree removes all key -> child pairs with the key name 'parent' from a tree
export const removeParentFieldsFromTree = (pathToResolver: any) => {
  for (const [key, value] of Object.entries(pathToResolver)) {
    if (key === 'parent') delete pathToResolver[key];
    else removeParentFieldsFromTree(value);
  }
  // This is an optimization that removes any empty fields from the tree. In this case
  // that is each Field on the Query that does not have an @client directive. This
  // improves efficiency as further tree traversals don't have to check these nodes.
  removeEmptyFields(pathToResolver);
};

// Remove every value of {} in a tree
export const removeEmptyFields = (pathToResolver: any) => {
  for (const [key, value] of Object.entries(pathToResolver)) {
    if (JSON.stringify(value) === '{}') delete pathToResolver[key];
    else removeEmptyFields(value);
  }
};

// Use this function to get a simple definition of the structure of a graphQL query
export const getQueryStructure = (AST: DocumentNode): UpdatedASTResponse => {
  const queryStructure: any = {};
  let pathToResolver = queryStructure;
  visit(AST, {
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
  // Get the AST from the Query
  const AST = getASTFromQuery(query);
  // The updated AST has had all fields with @client directives removed
  // pathToResolver is an object that describes the path to the resolvers for any @client directives
  const { updatedAST, pathToResolver, foundClientDirective } =
    removeFieldsWithClientDirectiveAndCreatePathToResolver(AST);
  return {
    updatedAST,
    pathToResolver,
    queryString: print(AST),
    foundClientDirective,
  };
};
