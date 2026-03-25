import { describe, expect, it } from 'vitest'
import { toNodeBuffer } from './bufferUtils'

describe('toNodeBuffer', () => {
  it('converts ArrayBuffer', () => {
    const ab = new Uint8Array([1, 2, 3, 4]).buffer
    const b = toNodeBuffer(ab)
    expect(Buffer.compare(b, Buffer.from([1, 2, 3, 4]))).toBe(0)
  })

  it('converts Uint8Array', () => {
    const u8 = new Uint8Array([10, 20])
    const b = toNodeBuffer(u8)
    expect(Buffer.compare(b, Buffer.from([10, 20]))).toBe(0)
  })

  it('throws on unsupported input', () => {
    expect(() => toNodeBuffer('string')).toThrow(/Expected ArrayBuffer/)
  })
})
