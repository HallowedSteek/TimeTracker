/**
 * Normalize renderer IPC payloads (ArrayBuffer, TypedArray, or Buffer) to a Node Buffer.
 * Electron structured clone may deliver ArrayBuffer or Uint8Array depending on version.
 */
export function toNodeBuffer(data: unknown): Buffer {
  if (Buffer.isBuffer(data)) return data
  if (data instanceof ArrayBuffer) return Buffer.from(data)
  if (ArrayBuffer.isView(data)) {
    const v = data as ArrayBufferView
    return Buffer.from(v.buffer, v.byteOffset, v.byteLength)
  }
  throw new TypeError(
    `Expected ArrayBuffer or TypedArray for file buffer, got ${typeof data}`
  )
}
