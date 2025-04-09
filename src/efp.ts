import { env } from '#/env'
import { evmClients } from '#/clients'
import { efpAccountMetadataAbi, efpListRecordsAbi } from '#/abi'
import type { ListStorageLocation, Operation } from '#/types';

/**
 * Fetches the list user role of a slot from the list records contract
 * 
 * @param slot - The slot to fetch the list user role for.
 * @param chainId - The chain ID of the list storage location.
 * @param contract - The list records contract address.
 * @returns A string representing the list user role of the slot.
 */

export async function getListUser(slot: bigint, chainId: string, contract: `0x${string}`): Promise<`0x${string}`> {
    const listUser = await evmClients[chainId as keyof typeof evmClients]().readContract({
        address: contract as `0x${string}`,
        abi: efpListRecordsAbi,
        functionName: 'getListUser',
        args: [ slot ]
    })
    return listUser.toLowerCase() as `0x${string}`
}

/**
 * Fetches the list ID of a user from the account metadata contract.
 * 
 * @param user - The user address to fetch the list ID for.
 * @returns A bigint representing the list ID of the user.
 */

export async function getListId(user: `0x${string}`): Promise<bigint | null> {
    const listId = await evmClients['8453']().readContract({
        address: env.ACCOUNT_METADATA as `0x${string}`,
        abi: efpAccountMetadataAbi,
        functionName: 'getValue',
        args: [ user, 'primary-list' ]
    })
    return listId != '0x' ? BigInt(listId) : null
}

/**
 * Parses a List Operation string and returns an Operation object.
 * 
 * @param op - The operation string to parse.
 * @returns An Operation object with parsed data.
 */
export function parseListOperation(op: string): Operation {
    const listOpVersion = op.slice(2, 4); // Extract the first byte after the 0x (2 hex characters = 1 byte)
    const listOpCode = op.slice(4, 6); // Extract the second byte
    const listRecordVersion = op.slice(6, 8); // Extract the third byte
    const listRecordType = op.slice(8, 10); // Extract the fourth byte
    const listRecordAddress = '0x'+op.slice(10, 50); // Extract the address (40 hex characters = 20 bytes)

    let tagString:string = '';
    let opDescription:string = '';

    switch (listOpCode) {
        case '01':
            opDescription = 'followed';
            break;
        case '02':
            opDescription = 'unfollowed';
            break;
        case '03':
            const tagHex = op.slice(50); 
            tagString = Buffer.from(tagHex, 'hex').toString('utf-8');
            opDescription = 'tagged';
            break;
        case '04':
            const untagHex = op.slice(50); 
            tagString = Buffer.from(untagHex, 'hex').toString('utf-8');
            opDescription = 'untagged';
            break;
        default:

    }

    return {
        version: listOpVersion,
        opcode: listOpCode,
        recordVersion: listRecordVersion,
        recordType: listRecordType,
        recordTypeDescription: opDescription,
        recordAddress: listRecordAddress as `0x${string}`,
        tag: tagString  ?? undefined
    };
}

/**
 * Parses a List Storage Location string and returns a ListStorageLocation object.
 * 
 * @param lsl - The List Storage Location string to parse.
 * @returns A ListStorageLocation object with parsed data.
 */
export function parseListStorageLocation(lsl: string): ListStorageLocation {
    if (lsl.length < 174) {
        return {
            version: '',
            type: '',
            chainId: BigInt(0),
            listRecordsContract: '',
            slot: BigInt(0)
        };
    }
    const lslVersion = lsl.slice(2, 4); // Extract the first byte after the 0x (2 hex characters = 1 byte)
    const lslType = lsl.slice(4, 6); // Extract the second byte
    const lslChainId = BigInt('0x'+lsl.slice(6, 70)); // Extract the next 32 bytes to get the chain id
    const lslListRecordsContract = '0x'+lsl.slice(70, 110); // Extract the address (40 hex characters = 20 bytes)
    const lslSlot = BigInt('0x'+lsl.slice(110, 174)); // Extract the slot
    return {
        version: lslVersion,
        type: lslType,
        chainId: lslChainId,
        listRecordsContract: lslListRecordsContract,
        slot: lslSlot
    }
}
