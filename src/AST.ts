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
  removedNodes: FieldNode[];
}
export interface ParseQueryResponse {
  updatedAST: DocumentNode;
  queryString: string;
  removedNodes: FieldNode[];
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
  const removedNodes: FieldNode[] = [];
  const updatedAST = visit(ast, {
    Field(node) {
      const { directives } = node;
      // If the Field has an @client directive, remove this Field
      if (nodeHasDirectives(node) && directiveIsType(directives, 'client')) {
        removedNodes.push(node);
        return null;
      }
      return node;
    },
  });
  return { updatedAST, removedNodes };
};

export const parseQuery = (query: Query): ParseQueryResponse => {
  const AST = getASTFromQuery(query);
  const queryString = print(AST);
  const { updatedAST, removedNodes } = removeFieldsWithClientDirective(AST);
  return { updatedAST, queryString, removedNodes };
};
