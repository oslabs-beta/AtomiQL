import {
  DocumentNode,
  parse,
  visit,
  FieldNode,
  DirectiveNode,
  print,
} from 'graphql';
import { PathObject, Query } from './types';

export type Directives = readonly DirectiveNode[] | undefined;

export interface UpdatedASTResponse {
  updatedAST: DocumentNode;
  pathToResolvers: PathObject;
  foundClientDirective: boolean;
}
export interface ParseQueryResponse {
  updatedAST: DocumentNode;
  queryString: string;
  pathToResolvers: PathObject;
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

const updatePathToResolversOnEnter = (
  pathToResolvers: PathObject,
  node: FieldNode
) => {
  const name: string = node.name.value;
  // Add a key of each Field name to pathToResolvers
  pathToResolvers[name] = {};
  // Add a link from each child Field its parent
  pathToResolvers[name].parent = pathToResolvers;
  // Return the pathToResolvers at the next level of depth
  return pathToResolvers[name];
};

const updatePathToResolversOnLeave = (
  pathToResolvers: PathObject,
  node: FieldNode
) => {
  // Move pathResolver one level up towards its root
  pathToResolvers = pathToResolvers.parent;
  const name: string = node.name.value;
  // If this Field has an @client directive tell it to resolveLocally
  if (nodeHasClientDirective(node)) pathToResolvers[name].resolveLocally = true;
  return pathToResolvers;
};

export const removeFieldsWithClientDirectiveAndCreatePathToResolvers = (
  AST: DocumentNode
): UpdatedASTResponse => {
  let foundClientDirective = false;
  let pathToResolvers: PathObject = {};
  const updatedAST = visit(AST, {
    Field: {
      enter(node: FieldNode) {
        // Track in pathToResolvers each Field in the query and move  it one level deeper
        pathToResolvers = updatePathToResolversOnEnter(pathToResolvers, node);
      },
      leave(node: FieldNode) {
        // Update and move pathResolver back up one level towards its root
        pathToResolvers = updatePathToResolversOnLeave(pathToResolvers, node);

        // If this Field has an @client directive remove it from the AST
        if (nodeHasClientDirective(node)) {
          foundClientDirective = true;
          // Returning null removes this field from the AST
          return null;
        }
      },
    },
  });

  // If @client directive found remove the links from each node to its parent in pathToResolvers
  if (foundClientDirective) removeParentFieldsFromTree(pathToResolvers);

  return { updatedAST, pathToResolvers, foundClientDirective };
};

// removeParentFieldsFromTree removes all key -> child pairs with the key name 'parent' from a tree
export const removeParentFieldsFromTree = (pathToResolvers: PathObject) => {
  for (const [key, value] of Object.entries(pathToResolvers)) {
    if (key === 'parent') delete pathToResolvers[key];
    else removeParentFieldsFromTree(value);
  }
  // This is an optimization that removes any empty fields from the tree. In this case
  // that is each Field on the Query that does not have an @client directive. This
  // improves efficiency as further tree traversals don't have to check these nodes.
  removeEmptyFields(pathToResolvers);
};

// Remove every value of {} in a tree
export const removeEmptyFields = (pathToResolvers: PathObject) => {
  for (const [key, value] of Object.entries(pathToResolvers)) {
    if (JSON.stringify(value) === '{}') delete pathToResolvers[key];
    else removeEmptyFields(value);
  }
};

// Use this function to get a simple definition of the structure of a graphQL query
export const getQueryStructure = (AST: DocumentNode): PathObject => {
  const queryStructure: PathObject = {};
  let pathToResolvers = queryStructure;
  visit(AST, {
    Field: {
      enter(node) {
        const name: string = node.name.value;
        pathToResolvers[name] = {};
        pathToResolvers[name].parent = pathToResolvers;
        pathToResolvers = pathToResolvers[name];
      },
      leave() {
        pathToResolvers = pathToResolvers.parent;
      },
    },
  });
  return queryStructure;
};

export const parseQuery = (query: Query): ParseQueryResponse => {
  // Get the AST from the Query
  const AST = getASTFromQuery(query);
  // The updated AST has had all fields with @client directives removed
  // pathToResolvers is an object that describes the path to the resolvers for any @client directives
  const { updatedAST, pathToResolvers, foundClientDirective } =
    removeFieldsWithClientDirectiveAndCreatePathToResolvers(AST);
  return {
    updatedAST,
    pathToResolvers,
    queryString: print(AST),
    foundClientDirective,
  };
};
