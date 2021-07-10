import {
  DocumentNode,
  parse,
  visit,
  FieldNode,
  DirectiveNode,
  print,
  ListTypeNode,
  NonNullTypeNode,
  NamedTypeNode,
  TypeNode,
} from 'graphql';
import { PathObject, Query } from '../types';
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
          i++;
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
          i--;
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

const getQueryFromSchema = (schema: DocumentNode) => {
  return visit(schema, {
    ObjectTypeDefinition: {
      enter(node) {
        if (node.name.value === 'Query') {
          return node;
        } else return null;
      },
    },
  });
};

const typeNodeHasType = (
  variableToCheck: any
): variableToCheck is ListTypeNode | NonNullTypeNode =>
  (variableToCheck as ListTypeNode | NonNullTypeNode).kind === 'ListType' ||
  (variableToCheck as ListTypeNode | NonNullTypeNode).kind === 'NonNullType';

const isNamedTypeNode = (
  variableToCheck: any
): variableToCheck is NamedTypeNode =>
  (variableToCheck as NamedTypeNode).kind === 'NamedType';

export const getQueryResponseType = (
  schema: DocumentNode,
  queryName: string
) => {
  const query = getQueryFromSchema(schema);
  const output: { kinds: string[]; name: string } = { kinds: [], name: '' };
  visit(query, {
    FieldDefinition: {
      enter(node) {
        if (node.name.value === queryName) {
          const recurseType = (node: TypeNode) => {
            if (isNamedTypeNode(node)) {
              output.name = node.name.value;
            }
            if (typeNodeHasType(node)) {
              output.kinds.push(node.kind);
              recurseType(node.type);
            }
          };
          recurseType(node.type);
        }
      },
    },
  });
  return output;
};

// Use this function to get a simple definition of the structure of a graphQL query
const getQueryStructure = (AST: DocumentNode): PathObject => {
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
  const AST = addFields(getASTFromQuery(query), ['__typename']);
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
  };
};
