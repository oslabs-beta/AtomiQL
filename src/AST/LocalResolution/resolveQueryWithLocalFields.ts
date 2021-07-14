/* eslint-disable import/prefer-default-export */
// eslint-disable-next-line import/no-extraneous-dependencies
import { makeExecutableSchema } from '@graphql-tools/schema';
import { graphql, DocumentNode } from 'graphql';
import { PathObject, Resolvers } from '../../types';
import { GraphQLSchemaFull, TypeMapObj } from './getTypeMapObj';

const { getTypeMapObj } = require('./getTypeMapObj');

const getQueryField = (
  executableSchema: GraphQLSchemaFull,
  queryName: string
): GraphQLSchemaFull => executableSchema._queryType._fields[queryName];

const isNamedTypeNode = (node: { kind: string }) => node.kind === 'NamedType';
const typeNodeHasType = (node: { type: any }) => !!node.type;

interface QueryResponseTypeCustomObj {
  isResponseDefinition: boolean;
  name?: any;
  [key: string]: any;
  [key: number]: any;
}

const getQueryResponseTypeCustomObj = (
  executableSchema: GraphQLSchemaFull,
  queryName: string
) => {
  const queryField = getQueryField(executableSchema, queryName);
  console.log(`queryField`, queryField);
  const queryResponseType = queryField.astNode as GraphQLSchemaFull;
  const output: QueryResponseTypeCustomObj = { isResponseDefinition: true };
  const recurseType = (node: GraphQLSchemaFull) => {
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
  resolvers: Resolvers,
  executableSchema: GraphQLSchemaFull,
  queries: string[],
  serverResponse: any
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

interface TypeDefNode {
  [key: string]: ResponseType;
}

const generateFieldResolvers = (
  resolvers: Resolvers,
  pathToResolvers: PathObject,
  typeMapObj: TypeMapObj
) => {
  const newResolver: Resolvers = {};
  const recurse = (
    pathToNode: PathObject,
    typeDefNode: TypeDefNode,
    typeName: string
  ) => {
    for (const [key, val] of Object.entries(pathToNode)) {
      if (val.resolveLocally) {
        const resolver = resolvers[typeName] as Resolvers;
        newResolver[typeName] = {
          ...newResolver[typeName],
          [key]: resolver[key],
        };
      } else {
        const newTypeName = getTypeName(typeDefNode[key]);
        recurse(val, typeMapObj[newTypeName], newTypeName);
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
  resolvers: Resolvers,
  pathToResolvers: PathObject,
  executableSchema: GraphQLSchemaFull,
  serverResponse: any
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

interface ResponseType {
  ofType: ResponseType;
  name: string;
}

const getTypeName = (responseType: ResponseType): string => {
  if (responseType.name) return responseType.name;
  return getTypeName(responseType.ofType);
};

const createLocalExecutableSchema = (
  typeDefs: DocumentNode,
  resolvers: Resolvers,
  pathToResolvers: PathObject,
  executableSchema: GraphQLSchemaFull,
  serverResponse: any
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
  typeDefs: DocumentNode,
  resolvers: Resolvers,
  pathToResolvers: PathObject,
  serverResponse: any,
  query: string
) => {
  const executableSchema = makeExecutableSchema({
    typeDefs,
    resolvers,
  }) as GraphQLSchemaFull;

  const newExecutableSchema = createLocalExecutableSchema(
    typeDefs,
    resolvers,
    pathToResolvers,
    executableSchema,
    serverResponse
  );

  return (await graphql(newExecutableSchema, query)).data;
};
