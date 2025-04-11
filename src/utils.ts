import { env } from "#/env";

export function isAddress(addrOrENS: string): boolean {
    if (/^0x[a-fA-F0-9]{40}$/.test(addrOrENS)) {
        return true
    }
    return false
}

export function arrayToChunks<T>(array: T[], chunkSize: number): T[][] {
    const chunks = []
    for (let index = 0; index < array.length; index += chunkSize) {
        chunks.push(array.slice(index, index + chunkSize))
    }
    return chunks
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

export async function getBatchEnsNameFromAddress(addresses: string[]): Promise<(string | null)[]> {
    const chunks = arrayToChunks(addresses, 10)
    const batches = chunks.map(batch => batch.map(id => `queries[]=${id}`).join('&'))
    const responses = await Promise.all(
        batches.map(async batch => {
          return await fetch(`${env.ENS_WORKER_URL}/bulk/u?${batch}`)
        })
    )
    for (let i = 0; i < responses.length; i++) {
        const response = responses[i]
        if (!response.ok) {
            return addresses.map(() => null)
        }
    }
    const data = await Promise.all(responses.map(response => response.json()))
    const fetchedRecords = data.flatMap(datum => datum.response)
    const results = addresses.map(addr => {
        const entry = fetchedRecords.find((item: any) => item?.type !== 'error' && item?.address.toLowerCase() === addr.toLowerCase());
        return entry ? entry.name : addr;
    });
    return results
}

export async function getENSProfileFromAddressOrName(addrOrENS: string): Promise<any> {
    return new Promise((resolve) => {
        try {
            const url = `${env.ENS_WORKER_URL}/u/${addrOrENS}`
            fetch(url)
                .then(response => response.json())
                .then(data => {
                    if (data.name) {
                        resolve(data)
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

export async function fetchURL(url: string): Promise<any> {
    try {
        const response = await fetch(url)
        if (!response.ok) {
            console.error(`Failed to fetch ${url}: ${response.statusText}`)
            return null
        }
        return await response.json()
    } catch (error) {
        console.error(`Error fetching ${url}:`, error)
        return null
    }
}

export async function getEFPDetails(addrOrENS: string): Promise<any> {
    const url = `https://data.ethfollow.xyz/api/v1/users/${addrOrENS}/details`
    try {
        const response = await fetchURL(url)
        return response
    } catch (error) {
        return null
    }
}

export async function getEFPStats(addrOrENS: string): Promise<any> {
    const url = `https://data.ethfollow.xyz/api/v1/users/${addrOrENS}/stats`
    try {
        const response = await fetchURL(url)
        return response
    } catch (error) {
        return null
    }
}