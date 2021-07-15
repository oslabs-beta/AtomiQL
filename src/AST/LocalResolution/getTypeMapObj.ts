import { GraphQLSchema } from 'graphql';
/* eslint-disable import/prefer-default-export */
/* eslint-disable no-underscore-dangle */

interface TypeDefinition {
  value: string;
  astNode: {
    kind: any;
  };
  _nameLookup: any;
  name: any;
  _fields: {
    [key: string]: {
      type: any;
    };
  };
}

export type GraphQLSchemaFull = GraphQLSchema & {
  _typeMap: {
    [key: string]: TypeDefinition;
  };
  _queryType: {
    _fields: any;
  };
  type: any;
  name: any;
  kind: any;
};

export interface TypeMapObj {
  [key: string]: any;
}

const getTypeDefinitionObj = (
  type: string,
  executableSchema: GraphQLSchemaFull
) => {
  const output = {
    [type]: {},
  };
  const outputType: TypeMapObj = output[type];

  const typeDefinition = executableSchema._typeMap[type];
  // Handle Enums
  if (typeDefinition.astNode) {
    if (typeDefinition.astNode.kind === 'EnumTypeDefinition') {
      output[type] = Object.keys(typeDefinition._nameLookup);
      return output;
    }
  }
  // Handle inbuilt types
  if (!typeDefinition._fields) {
    output[type] = typeDefinition.name;
    return output;
  }
  // Handle user types
  for (const [key, value] of Object.entries(typeDefinition._fields)) {
    outputType[key] = value.type;
  }
  return output;
};

interface IgnoreType {
  [key: string]: boolean | undefined;
}

const IGNORE_TYPE: IgnoreType = {
  Boolean: true,
  ID: true,
  Int: true,
  String: true,
  __Directive: true,
  __DirectiveLocation: true,
  __EnumValue: true,
  __Field: true,
  __InputValue: true,
  __Schema: true,
  __Type: true,
  __TypeKind: true,
};

const ignoreType = (type: string) => !!IGNORE_TYPE[type];

export const getTypeMapObj = (
  executableSchema: GraphQLSchemaFull
): TypeMapObj => {
  const output: TypeMapObj = {};
  const types = Object.keys(executableSchema._typeMap);
  types.forEach((type) => {
    if (!ignoreType(type))
      output[type] = getTypeDefinitionObj(type, executableSchema)[type];
  });
  return output;
};
