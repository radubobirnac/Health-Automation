import { handleApiRequest, stripBase } from "../../scripts/api.js";

const basePath = "/.netlify/functions/api";

export const handler = async (event) => {
  const path = stripBase(event.path || "/", basePath);
  const body = event.body ? JSON.parse(event.body) : null;
  const query = event.queryStringParameters || {};

  const result = handleApiRequest({
    method: event.httpMethod,
    path,
    query,
    body
  });

  return {
    statusCode: result.status,
    headers: {
      ...result.headers,
      "Access-Control-Allow-Origin": "*"
    },
    body: result.body
  };
};
