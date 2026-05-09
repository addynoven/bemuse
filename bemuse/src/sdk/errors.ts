export type MSErrorCode =
  | 'NO_LYRICS'
  | 'VIDEO_BLOCKED'
  | 'PROXY_TIMEOUT'
  | 'AUDIO_DECODE'
  | 'NETWORK'
  | 'UNKNOWN'

export interface MSErrorDetails {
  code: MSErrorCode
  userMessage: string
  action?: string
  cause?: unknown
}

export class MSError extends Error implements MSErrorDetails {
  readonly code: MSErrorCode
  readonly userMessage: string
  readonly action?: string
  // `cause` typed as unknown for safety. Avoiding `override` since the project's
  // lib target may not declare Error.cause yet (ES2022 addition).
  readonly cause?: unknown

  constructor(details: MSErrorDetails) {
    super(details.userMessage)
    this.name = 'MSError'
    this.code = details.code
    this.userMessage = details.userMessage
    this.action = details.action
    this.cause = details.cause
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export function noLyricsError(cause?: unknown): MSError {
  return new MSError({
    code: 'NO_LYRICS',
    userMessage: "We couldn't find lyrics for this song.",
    action: 'Try another song',
    cause,
  })
}

export function videoBlockedError(cause?: unknown): MSError {
  return new MSError({
    code: 'VIDEO_BLOCKED',
    userMessage: 'This video is blocked in your region.',
    action: 'Try another song',
    cause,
  })
}

export function proxyTimeoutError(cause?: unknown): MSError {
  return new MSError({
    code: 'PROXY_TIMEOUT',
    userMessage: 'Loading took too long.',
    action: 'Retry',
    cause,
  })
}

export function audioDecodeError(cause?: unknown): MSError {
  return new MSError({
    code: 'AUDIO_DECODE',
    userMessage: 'Audio format not supported.',
    action: 'Retry',
    cause,
  })
}

export function networkError(cause?: unknown): MSError {
  return new MSError({
    code: 'NETWORK',
    userMessage: 'Network error. Check your connection.',
    action: 'Retry',
    cause,
  })
}

export function unknownError(cause?: unknown): MSError {
  return new MSError({
    code: 'UNKNOWN',
    userMessage: 'Something went wrong.',
    action: 'Retry',
    cause,
  })
}

export function fromFetchResponse(res: Response): MSError {
  const status = res.status

  if (status === 404) return noLyricsError()
  if (status === 403 || status === 451) return videoBlockedError()
  if (status === 408 || status === 504) return proxyTimeoutError()
  if (status >= 500) return proxyTimeoutError()
  return unknownError()
}

export function fromFetchError(err: unknown): MSError {
  if (isMSError(err)) return err
  if (err instanceof Error) {
    if (err.name === 'AbortError') return proxyTimeoutError(err)
    if (err instanceof TypeError) return networkError(err)
  }
  return unknownError(err)
}

export function isMSError(e: unknown): e is MSError {
  return e instanceof MSError
}
