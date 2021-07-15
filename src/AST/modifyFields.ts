/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/* eslint-disable import/prefer-default-export */

import {
  DocumentNode,
  FieldNode,
  SelectionNode,
  SelectionSetNode,
  visit,
} from 'graphql';

export function addFields(
  query: DocumentNode,
  fieldNames: ReadonlyArray<string>
): DocumentNode {
  // When using visit() to edit an AST, the original AST will not be modified,
  // and a new version of the AST with the changes applied will be returned from the visit function.
  return visit(query, {
    SelectionSet: {
      leave(
        node: SelectionSetNode
        // _key: string,
        // _parent: ASTNode,
        // _path: ReadonlyArray<string | number>
      ): {} | undefined {
        // @return
        //   undefined: no action
        //   false: no action
        //   visitor.BREAK: stop visiting altogether
        //   null: delete this node
        //   any value: replace this node with the returned value

        // // Don't add to the top-level selection-set
        // if (parent && parent.kind === Kind.OPERATION_DEFINITION) {
        //   return undefined;
        // }

        const fieldsToAdd: Array<FieldNode> = [];
        for (const fieldName of fieldNames) {
          if (!hasField(fieldName)(node.selections)) {
            const fieldToAdd = createField(fieldName);
            fieldsToAdd.push(fieldToAdd);
          }
        }
        if (fieldsToAdd.length > 0) {
          const newNode = {
            ...node,
            selections: [...node.selections, ...fieldsToAdd],
          };
          return newNode;
        }
        return false;
      },
    },
  });
}

function hasField(
  name: string
): (selectionSet: ReadonlyArray<SelectionNode>) => boolean {
  type Some = (
    value: SelectionNode,
    index: number,
    array: SelectionNode[]
  ) => unknown;
  const some = ({ name: { value } }: FieldNode) => value === name;
  const someFunc = some as Some;

  return (selectionSet) =>
    selectionSet.filter((s) => s.kind === 'Field').some(someFunc);
}

function createField(name: string): FieldNode {
  return {
    kind: 'Field',
    alias: undefined,
    name: {
      kind: 'Name',
      value: name,
    },
    // tslint:disable-next-line:no-arguments
    arguments: [],
    directives: [],
    selectionSet: undefined,
  };
}

export function removeFields(
  query: DocumentNode,
  fieldsToRemove: ReadonlyArray<string>
): DocumentNode {
  return visit(query, {
    // tslint:disable-next-line:function-name
    Field: {
      enter(node: any) {
        return fieldsToRemove.indexOf(node.name.value) > -1 ? null : undefined;
      },
    },
  });
}
