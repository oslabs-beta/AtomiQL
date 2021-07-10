// eslint-disable-next-line import/no-extraneous-dependencies
import { makeExecutableSchema } from '@graphql-tools/schema';
import { graphql, visit, parse, print } from 'graphql'

const { getTypeMapObj } = require("./getTypeMapObj");

const getQueryField = (executableSchema, queryName) =>
  executableSchema._queryType._fields[queryName];

const isNamedTypeNode = (node) => node.kind === "NamedType";
const typeNodeHasType = (node) => !!node.type;

const getQueryResponseTypeCustomObj = (executableSchema, queryName) => {
  const queryField = getQueryField(executableSchema, queryName);
  const queryResponseType = queryField.astNode;
  const output = { isResponseDefinition: true };
  const recurseType = (node) => {
    if (isNamedTypeNode(node)) {
      output.name = node.name.value;
    }
    if (typeNodeHasType(node)) {
      output[node.kind] = true;
      recurseType(node.type);
    }
  };
  recurseType(queryResponseType.type);
  return output;
};

const generateQueryResolver = (
  resolvers,
  executableSchema,
  queries,
  serverResponse
) => {
  const newResolver = {
    Query: {},
  };
  queries.forEach((query) => {
    const queryResponseTypeCustomObj = getQueryResponseTypeCustomObj(
      executableSchema,
      query
    );
    newResolver.Query = {
      ...newResolver.Query,
      [query]() {
        if (serverResponse) return serverResponse[query];
        if (queryResponseTypeCustomObj.ListType) return [{}];
        else return {};
      },
    };
  });
  if (resolvers.Query) {
    newResolver.Query = {
      // Switch these around to give priority to remote query resolvers
      ...newResolver.Query,
      ...resolvers.Query,
    };
  }
  return newResolver;
};

const generateFieldResolvers = (resolvers, pathToResolvers, typeMapObj) => {
  const newResolver = {};
  const recurse = (pathToNode, typeDefNode, typeName) => {
    for (const [key, val] of Object.entries(pathToNode)) {
      if (val.resolveLocally) {
        newResolver[typeName] = {
          ...newResolver[typeName],
          [key]: resolvers[typeName][key],
        };
      } else {
        const typeName = getTypeName(typeDefNode[key]);
        recurse(val, typeMapObj[typeName], typeName);
      }
    }
  };
  for (const [key, value] of Object.entries(pathToResolvers)) {
    const typeName = getTypeName(typeMapObj.Query[key]);
    const typeDef = typeMapObj[typeName];
    if (!value.resolveLocally) {
      recurse(value, typeDef, typeName);
    }
  }
  return newResolver;
};

const generateOneOffResolver = (
  resolvers,
  pathToResolvers,
  executableSchema,
  serverResponse
) => {
  const typeMapObj = getTypeMapObj(executableSchema);
  const queries = Object.keys(pathToResolvers);
  const queryResolver = generateQueryResolver(
    resolvers,
    executableSchema,
    queries,
    serverResponse
  );
  const fieldResolvers = generateFieldResolvers(
    resolvers,
    pathToResolvers,
    typeMapObj
  );
  return { ...queryResolver, ...fieldResolvers };
};

const getTypeName = (responseType) => {
  if (responseType.name) return responseType.name;
  return getTypeName(responseType.ofType);
};

const createLocalExecutableSchema = (
  typeDefs,
  resolvers,
  pathToResolvers,
  executableSchema,
  serverResponse
) => {
  const generatedResolver = generateOneOffResolver(
    resolvers,
    pathToResolvers,
    executableSchema,
    serverResponse
  );
  return makeExecutableSchema({
    typeDefs,
    resolvers: generatedResolver,
  });
};

export const resolveQueryWithLocalFields = async (
  typeDefs,
  resolvers,
  pathToResolvers,
  serverResponse,
  query
) => {
  const executableSchema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });
  console.log(`executableSchema`, executableSchema)
  const newExecutableSchema = createLocalExecutableSchema(
    typeDefs,
    resolvers,
    pathToResolvers,
    executableSchema,
    serverResponse
  );
  console.log(`newExecutableSchema`, newExecutableSchema)
  return (await graphql(newExecutableSchema, query)).data;
};