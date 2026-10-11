import { randomUUID } from 'node:crypto';
import { routes } from './openapi.js';
import { ApiError } from './errors.js';

// Share the API catalogue; tools can never choose a host, arbitrary URL, or auth operation.
export const assistantTools = routes.filter(route => route.path.startsWith('/api/') &&
  (!route.path.startsWith('/api/auth/') || route.path === '/api/auth/me') &&
  !route.multipart && !(route.method === 'get' && route.path.endsWith('/avatar'))).map(route => {
  const pathNames = Array.from(route.path.matchAll(/\{([^}]+)\}/g), match => match[1]!);
  const properties: Record<string, unknown> = Object.fromEntries(pathNames.map(name => [name, { type: 'string' }]));
  const required = [...pathNames];
  if (route.query) properties.query = { type: 'object', properties: route.query, additionalProperties: false };
  if (route.body) {
    let bodySchema = route.body;
    if (route.path.endsWith('/messages') && route.method === 'post') {
      const source = route.body as { properties: Record<string, unknown>; required: string[] };
      bodySchema = { ...source, properties: Object.fromEntries(Object.entries(source.properties).filter(([name]) => name !== 'client_message_id')), required: source.required.filter(name => name !== 'client_message_id') };
    }
    properties.body = bodySchema; required.push('body');
  }
  return { ...route, name: `${route.method}_${route.path.replace(/[^a-zA-Z0-9]+/g, '_')}`,
    pathNames, declaration: { name: `${route.method}_${route.path.replace(/[^a-zA-Z0-9]+/g, '_')}`,
      description: route.summary, parametersJsonSchema: { type: 'object', properties, required, additionalProperties: false } } };
});

export type ToolCall = { name: string; args: Record<string, unknown>; id?: string };
export type ToolResult = { name: string; description?: string; ok: boolean; status: number; result: unknown };

export function prepareTool(call: ToolCall) {
  const tool = assistantTools.find(tool => tool.name === call.name);
  if (!tool) throw new ApiError(400, 'UNKNOWN_TOOL', 'This assistant action is unavailable.');
  const allowed = [...tool.pathNames, ...(tool.query ? ['query'] : []), ...(tool.body ? ['body'] : [])];
  if (Object.keys(call.args).some(key => !allowed.includes(key))) throw new ApiError(400, 'INVALID_TOOL', 'Unexpected action arguments.');
  let path = tool.path;
  for (const name of tool.pathNames) {
    const value = call.args[name];
    if (typeof value !== 'string' || !value || value === '.' || value === '..' || /[/\\?#%]/.test(value)) {
      throw new ApiError(400, 'INVALID_TOOL', 'Invalid resource identifier.');
    }
    path = path.replace(`{${name}}`, encodeURIComponent(value));
  }
  const query = new URLSearchParams();
  if (call.args.query !== undefined) {
    if (!call.args.query || typeof call.args.query !== 'object' || Array.isArray(call.args.query)) throw new ApiError(400, 'INVALID_TOOL', 'Invalid query.');
    for (const [key, value] of Object.entries(call.args.query)) {
      if (!tool.query || !(key in tool.query) || !['string','number','boolean'].includes(typeof value)) throw new ApiError(400, 'INVALID_TOOL', 'Invalid query field.');
      query.set(key, String(value));
    }
  }
  let body = call.args.body;
  if (tool.body && (!body || typeof body !== 'object' || Array.isArray(body))) throw new ApiError(400, 'INVALID_TOOL', 'This action needs a body.');
  if (tool.path.endsWith('/messages') && tool.method === 'post') {
    body = { ...body as object, client_message_id: randomUUID() };
  }
  return { tool, path: path + (query.size ? `?${query}` : ''), body };
}

export async function executeTool(call: ToolCall, port: number, token: string, signal: AbortSignal): Promise<ToolResult> {
  try {
    const { tool, path, body } = prepareTool(call);
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: tool.method.toUpperCase(), redirect: 'error', signal,
      headers: { authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    // Real routes perform schema validation, authorization and realtime events.
    const result: unknown = response.status === 204 ? null : await response.json();
    return { name: call.name, description: tool.summary, ok: response.ok, status: response.status, result };
  } catch (error) {
    return { name: call.name, ok: false, status: error instanceof ApiError ? error.status : 503,
      result: { error: error instanceof ApiError ? error.message : 'Action could not be verified. Check the app before retrying.' } };
  }
}
