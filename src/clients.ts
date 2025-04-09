import { http, createPublicClient, fallback, walletActions } from 'viem'
import { base, mainnet, optimism } from 'viem/chains'
import { env } from '#/env.ts'

export const evmClients = {
  '8453': () =>
    createPublicClient({
      key: 'base-client',
      name: 'Base Client',
      chain: base,
      transport: fallback(
        [
          http(env.BASE_RPC_URL) 
        ],
        { rank: false }
      ),
      batch: { multicall: true }
    }).extend(walletActions),
  '10': () =>
    createPublicClient({
      key: 'optimism-client',
      name: 'Optimism Client',
      chain: optimism,
      transport: fallback(
        [
          http(env.OP_RPC_URL)
        ],
        { rank: false }
      ),
      batch: { multicall: true }
    }).extend(walletActions),
  '1': () =>
    createPublicClient({
      key: 'mainnet-client',
      name: 'Mainnet Client',
      chain: mainnet,
      transport: fallback(
        [
          http(env.ETH_RPC_URL)
        ],
        {
          rank: false
        }
      ),
      batch: { multicall: true }
    }).extend(walletActions),
}

export type EvmClient = ReturnType<(typeof evmClients)[keyof typeof evmClients]>
