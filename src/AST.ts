import { DocumentNode, parse, visit, FieldNode, DirectiveNode } from 'graphql';

type Directives = readonly DirectiveNode[] | undefined;

interface UpdatedASTResponse {
  updatedAST: DocumentNode;
  removedNodes: FieldNode[];
}

export const getASTFromQuery = (query: string | DocumentNode): DocumentNode =>
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
      if (nodeHasDirectives(node) && directiveIsType(directives, 'client')) {
        removedNodes.push(node);
        return null;
      }
      return node;
    },
  });
  return { updatedAST, removedNodes };
};
