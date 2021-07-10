/* eslint-disable import/prefer-default-export */
/* eslint-disable no-underscore-dangle */
const getTypeDefinitionObj = (type: any, executableSchema: any) => {
  const output = {
    [type]: {},
  };
  const outputType: { [key: string]: any } = output[type];

  const typeDefinition = executableSchema._typeMap[type];
  // Handle Enums
  if (typeDefinition.astNode) {
    if (typeDefinition.astNode.kind === "EnumTypeDefinition") {
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

const IGNORE_TYPE = {
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

const ignoreType = (type) => !!IGNORE_TYPE[type];

export const getTypeMapObj = (executableSchema) => {
  const output = {};
  const types = Object.keys(executableSchema._typeMap);
  types.forEach((type) => {
    if (!ignoreType(type))
      output[type] = getTypeDefinitionObj(type, executableSchema)[type];
  });
  return output;
};

