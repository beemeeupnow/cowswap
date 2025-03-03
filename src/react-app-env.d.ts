/// <reference types="react-scripts" />

declare module '@metamask/jazzicon' {
  export default function (diameter: number, seed: number): HTMLElement
}

declare module 'fortmatic'

interface Window {
  console: Console & { force: Console }
  walletLinkExtension?: any
  ethereum?: {
    isMetaMask?: true
    isTally?: true
    on?: (...args: any[]) => void
    removeListener?: (...args: any[]) => void
    autoRefreshOnNetworkChange?: boolean
    setSelectedProvider: (any) => void
    providers: [any]
  }
  tally?: {
    isTally?: true
  }
  web3?: Record<string, unknown>
}

interface Console extends Node.Console {
  force: Node.Console
}

declare module 'content-hash' {
  declare function decode(x: string): string
  declare function getCodec(x: string): string
}

declare module 'multihashes' {
  declare function decode(buff: Uint8Array): { code: number; name: string; length: number; digest: Uint8Array }
  declare function toB58String(hash: Uint8Array): string
}
