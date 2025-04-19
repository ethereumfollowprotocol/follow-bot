export function raise(error: unknown): never {
	throw typeof error === "string" ? new Error(error) : error;
}

export const env = Object.freeze({
    TG_BOT_TOKEN: getEnvVariable("TG_BOT_TOKEN"),
    REDIS_URL: getEnvVariable("REDIS_URL"),
    DATABASE_URL: getEnvVariable("DATABASE_URL"),
    BASE_RPC_URL: getEnvVariable("BASE_RPC_URL"),
    OP_RPC_URL: getEnvVariable("OP_RPC_URL"),
    ETH_RPC_URL: getEnvVariable("ETH_RPC_URL"),
    ACCOUNT_METADATA: getEnvVariable("ACCOUNT_METADATA"),
    LIST_REGISTRY: getEnvVariable("LIST_REGISTRY"),
    ENS_WORKER_URL: getEnvVariable("ENS_WORKER_URL"),
    HEARTBEAT_URL: getEnvVariable("HEARTBEAT_URL"),
});

function getEnvVariable<T extends keyof EnvironmentVariables>(name: T) {
    return process.env[name] ?? raise(`environment variable ${name} not found`);
}
