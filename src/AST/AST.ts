import {
  DocumentNode,
  parse,
  visit,
  FieldNode,
  DirectiveNode,
  print,
} from 'graphql';
import { PathObject, Query, ResponseData } from '../types';
import { addFields } from './modifyFields';

export type Directives = readonly DirectiveNode[];

export interface UpdatedASTResponse {
  updatedAST: DocumentNode;
  pathToResolvers: PathObject;
  foundClientDirective: boolean;
  sendQueryToServer: boolean;
}
export interface ParseQueryResponse {
  updatedAST: DocumentNode;
  queryString: string;
  pathToResolvers: PathObject;
  foundClientDirective: boolean;
  sendQueryToServer: boolean;
  strippedQuery: string;
}

export const getASTFromQuery = (query: Query): DocumentNode =>
  typeof query === 'string' ? parse(query) : query;

const nodeHasDirectives = (node: FieldNode): boolean =>
  !!node.directives && node.directives.length > 0;

const directiveIsType = (type: string, directives?: Directives) =>
  !!directives && directives[0].name.value === type;

const nodeHasClientDirective = (node: FieldNode) =>
  nodeHasDirectives(node) && directiveIsType('client', node.directives);

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
  const selectionSetLengths: { end?: number; start?: number }[] = [];
  let i = 0;
  const updatedAST = visit(AST, {
    Field: {
      enter(node: FieldNode) {
        // Track in pathToResolvers each Field in the query and move  it one level deeper
        pathToResolvers = updatePathToResolversOnEnter(pathToResolvers, node);

        const { selectionSet } = node;

        if (selectionSet) {
          // Save the number of child Fields this Field has
          // in the format { start: number-of-child-fields }
          selectionSetLengths.push({ start: selectionSet.selections.length });
          i += 1;
        }
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

        const { selectionSet } = node;

        // Save the number of child Fields this Field now has after editing the AST
        // in the format { end: number-of-child-fields }
        if (selectionSet) {
          i -= 1;
          const selection = selectionSetLengths[i];
          selection.end = selectionSet.selections.length;

          // If at the start this Field had child Fields, and now it has None
          // Remove this Field from the Query so the Query remains valid
          if (selection.start && !selection.end) return null;
        }
      },
    },
  });
  // If @client directive found remove the links from each node to its parent in pathToResolvers
  if (foundClientDirective) removeParentFieldsFromTree(pathToResolvers);

  let sendQueryToServer = true;
  const rootSelectionSet = selectionSetLengths[0];

  // If the root Field has no child Fields, do not send the request to the server
  if (!!rootSelectionSet && rootSelectionSet.start && !rootSelectionSet.end) {
    sendQueryToServer = false;
  }

  return {
    updatedAST,
    pathToResolvers,
    foundClientDirective,
    sendQueryToServer,
  };
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

export const stripClientDirectivesFromQuery = (query: Query): string => {
  const queryAST = getASTFromQuery(query);

  const strippedQuery = visit(queryAST, {
    Directive: {
      leave(node) {
        if (node.name.value === 'client') return null;
      },
    },
  });
  return print(strippedQuery);
};

export const parseQuery = (query: Query): ParseQueryResponse => {
  // Get the AST from the Query
  const AST = addFields(getASTFromQuery(query), ['__typename']);
  const strippedQuery = stripClientDirectivesFromQuery(AST);
  // The updated AST has had all fields with @client directives removed
  // pathToResolvers is an object that describes the path to the resolvers for any @client directives
  const {
    updatedAST,
    pathToResolvers,
    foundClientDirective,
    sendQueryToServer,
  } = removeFieldsWithClientDirectiveAndCreatePathToResolvers(AST);
  return {
    updatedAST,
    pathToResolvers,
    queryString: print(AST),
    foundClientDirective,
    sendQueryToServer,
    strippedQuery,
  };
};

export const flattenQuery = (atomData: ResponseData) => {
  const output: ResponseData = {};

  const flattenRecursive = (queryResult: any) => {
    if (Array.isArray(queryResult)) {
      queryResult.forEach((result) => {
        flattenRecursive(result);
      });
    } else {
      if (queryResult.__typename && queryResult.id) {
        const uniqueId: string = `${queryResult.__typename}-${queryResult.id}`;
        output[uniqueId] = queryResult;
      }
      Object.keys(queryResult).forEach((queryKey) => {
        if (typeof queryResult[queryKey] === 'object') {
          flattenRecursive(queryResult[queryKey]);
        }
      });
    }
  };

  flattenRecursive(atomData);

  return output;
};
