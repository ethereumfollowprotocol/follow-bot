interface EnvironmentVariables {
    readonly ACCOUNT_METADATA: `0x${string}`;
    readonly LIST_REGISTRY: `0x${string}`;
    readonly DATABASE_URL: string;
    readonly REDIS_URL: string;
    readonly TG_BOT_TOKEN: string;
    readonly BASE_RPC_URL: string;
    readonly OP_RPC_URL: string;
    readonly ETH_RPC_URL: string;
    readonly ENS_WORKER_URL: string;
}

declare module "bun" {
	interface Env extends EnvironmentVariables {}
}

declare namespace NodeJs {
	interface ProcessEnv extends EnvironmentVariables {}
}
