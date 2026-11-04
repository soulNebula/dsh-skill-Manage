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
  async function call(endpoint, payload) {
    let result
    try {
      result = await rpc.call(channel, endpoint, payload)
    } catch {
      throw new ApiError('connection', 'Cannot reach the plugin.')
    }
    if (!result?.ok) throw new ApiError(result?.error?.code ?? 'failed', result?.error?.message ?? 'Request failed.')
    return result.value
  }

  return { call }
}
