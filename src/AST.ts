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

export const removeFieldsWithClientDirective = (
  ast: DocumentNode
): UpdatedASTResponse => {
  let foundClientDirective = false;
  let pathToLocalResolver: any = {};
  let queryLevel = pathToLocalResolver;
  const updatedAST = visit(ast, {
    Field: {
      enter(node) {
        const name: string = node.name.value
        const hasChildren = !!node.selectionSet
        queryLevel[name] = {};
        queryLevel[name].parent = queryLevel;
        queryLevel[name].hasChildren = hasChildren;
        queryLevel = queryLevel[name]
      },
      leave(node) {
        const name: string = node.name.value
        queryLevel = queryLevel.parent;
        const { directives } = node;
        // If the Field has an @client directive, remove this Field
        if (nodeHasDirectives(node) && directiveIsType(directives, 'client')) {
          queryLevel[name].resolveLocally = true;
          foundClientDirective = true;
          return null;
        }
        if (!queryLevel[name].hasChildren) delete queryLevel[name]

        return node;
      }
    }
  });
  if (foundClientDirective) cleanUpPathToLocalResolver(pathToLocalResolver);
  else pathToLocalResolver = false;

  return { updatedAST, pathToLocalResolver };
};

export const cleanUpPathToLocalResolver = (pathToLocalResolver: any) => {
  for (const [key, value] of Object.entries(pathToLocalResolver)) {
    if (key === 'hasChildren') delete pathToLocalResolver[key];
    else if (key === 'parent') delete pathToLocalResolver[key];
    else cleanUpPathToLocalResolver(value)
  }
  return pathToLocalResolver;
}

export const getQueryStructure = (
  ast: DocumentNode
): UpdatedASTResponse => {
  const queryStructure: any = {};
  let queryLevel = queryStructure;
  visit(ast, {
    Field: {
      enter(node) {
        const name: string = node.name.value
        queryLevel[name] = {};
        queryLevel[name].parent = queryLevel;
        queryLevel = queryLevel[name]
      },
      leave(node) {
        queryLevel = queryLevel.parent;
      }
    }
  });
  return queryStructure;
};

export const parseQuery = (query: Query): ParseQueryResponse => {
  const AST = getASTFromQuery(query);
  const queryString = print(AST);
  const { updatedAST, pathToLocalResolver } = removeFieldsWithClientDirective(AST);
  return { updatedAST, queryString, pathToLocalResolver };
};
