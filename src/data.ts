import { createClient } from 'redis'
import type { RedisClientType } from 'redis'
import { env } from "#/env.ts";

export interface IRedisService {
    get(key: string): Promise<{} | null>
    put(key: string, value: string, exp: number): Promise<void>
}

export class RedisService implements IRedisService {
    #client: RedisClientType

    constructor() {
        this.#client = this.createRedisClient()
    }

    createRedisClient(): RedisClientType {
        const client: RedisClientType = createClient({
            url: env.REDIS_URL
        })
        client.on('error', (err: Error) => {
            console.log(`Error: ${err}`)
            client.quit()
        })
        client.connect()
        return client
    }

    closeClient(): void {
        this.#client.quit()
    }

    async get(key: string): Promise<{} | null> {
        if(!this.#client){
            this.#client = this.createRedisClient()
        }
        const result = await (this.#client as RedisClientType).get(key)
        return JSON.parse(result as string) as any
    }

    async put(key: string, value: string): Promise<void> {
        if(!this.#client){
            this.#client = this.createRedisClient()
        }
        await this.#client.set(key, value, { } as any)
    }
}