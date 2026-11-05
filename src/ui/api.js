// The only browser↔host contract used by the UI.
export class ApiError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

const CHANNEL = '/skill-manage'

export function createApi(rpc, { channel = CHANNEL } = {}) {
  // DSH validates the request payload as an object. Endpoints without input
  // must still send `{}`; `undefined` is rejected as "invalid client-request
  // message" before the host route sees it.
  async function call(endpoint, payload = {}) {
    let result
    try {
      result = await rpc.call(channel, endpoint, payload ?? {})
    } catch (error) {
      throw new ApiError('connection', error?.message || 'Cannot reach the plugin.')
    }
    if (!result?.ok) throw new ApiError(result?.error?.code ?? 'failed', result?.error?.message ?? 'Request failed.')
    return result.value
  }

  return { call }
}
