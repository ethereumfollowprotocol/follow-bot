import { env } from "#/env";

export function isAddress(addrOrENS: string): boolean {
    if (/^0x[a-fA-F0-9]{40}$/.test(addrOrENS)) {
        return true
    }
    return false
}

export function getAddressFromEnsName(ensName: string): Promise<string | null> {
    return new Promise((resolve) => {
        try {
            const url = `${env.ENS_WORKER_URL}/u/${ensName}`
            fetch(url)
                .then(response => response.json())
                .then(data => {
                    if (data.address) {
                        resolve(data.address.toLowerCase())
                    } else {
                        resolve(null)
                    }
                })
                .catch(() => resolve(null))
        } catch (error) {
            resolve(null)
        }
    });
}

export function getEnsNameFromAddress(address: string): Promise<string | null> {
    return new Promise((resolve) => {
        try {
            const url = `${env.ENS_WORKER_URL}/a/${address}`
            fetch(url)
                .then(response => response.json())
                .then(data => {
                    if (data.name) {
                        resolve(data.name)
                    } else {
                        resolve(null)
                    }
                })
                .catch(() => resolve(null))
        } catch (error) {
            resolve(null)
        }
    });
}