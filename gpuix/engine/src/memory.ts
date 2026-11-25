import { freemem } from 'node:os'
import { readFileSync } from 'node:fs'

let darwinSample: (() => number) | undefined
/** Account for reclaimable cache rather than treating all cached RAM as busy.
 * Windows freemem is available physical memory; Linux exposes MemAvailable.
 * Darwin's conservative estimate adds inactive pages to free pages, without
 * double-counting speculative or purgeable pages already in those totals. */
export function availableMemory(): number {
  if (process.platform === 'linux') {
    try {
      const value = /^MemAvailable:\s+(\d+)\s+kB$/m.exec(readFileSync('/proc/meminfo', 'utf8'))
      if (value) return Number(value[1]) * 1024
    } catch {}
  }
  if (process.platform === 'darwin') {
    try {
      if (!darwinSample) {
        const { dlopen, FFIType: t } = require('bun:ffi') as typeof import('bun:ffi')
        const api = dlopen('/usr/lib/libSystem.B.dylib', {
          mach_host_self: { args: [], returns: t.u32 },
          host_page_size: { args: [t.u32, t.ptr], returns: t.i32 },
          host_statistics: { args: [t.u32, t.i32, t.ptr, t.ptr], returns: t.i32 },
        })
        const host = api.symbols.mach_host_self()
        const page = Buffer.alloc(8)
        if (api.symbols.host_page_size(host, page) !== 0) throw new Error('cannot read host page size')
        const pageSize = Number(page.readBigUInt64LE())
        if (!pageSize) throw new Error('invalid host page size')
        darwinSample = () => {
          const data = new Uint32Array(15), count = new Uint32Array([15]) // HOST_VM_INFO / vm_statistics_data_t
          if (api.symbols.host_statistics(host, 2, data, count) !== 0 || count[0]! < 4) throw new Error('cannot sample host VM statistics')
          return (data[0]! + data[2]!) * pageSize
        }
      }
      return darwinSample()
    } catch { /* Retain the stricter free-only fallback if native sampling fails. */ }
  }
  return freemem()
}
