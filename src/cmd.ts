import { isAddress, getAddressFromEnsName, getEnsNameFromAddress, arrayToChunks, getBatchEnsNameFromAddress } from "#/utils"
import { RedisService } from "#/data"
import { parseListOperation, getListUser } from "#/efp"
import { InlineKeyboard } from "grammy"

const redis = new RedisService()

function efpLink(acct: string): string {
    return `<a href="https://efp.app/${acct}">${acct}</a>`
}

export async function handleEvent(bot: any, row: any): Promise<void> {
    if(row?.event_name === 'ListOp'){
        const operator = await getListUser(row?.event_args?.slot, row?.chain_id, row?.contract_address)
        const listop = parseListOperation(row.event_args?.op)
        const address = listop.recordAddress
        const existingSubsTarget = (await redis.get(address)) as { chats: string[] } | null;
        const existingChatsTarget = existingSubsTarget ? existingSubsTarget.chats : [];
        const existingSubsOperator = (await redis.get(operator)) as { chats: string[] } | null;
        const existingChatsOperator = existingSubsOperator ? existingSubsOperator.chats : [];
        if (existingChatsTarget.length === 0 && existingChatsOperator.length === 0) return;

        const operatorEns = await getEnsNameFromAddress(operator)
        const operatorName = operatorEns ? operatorEns : operator;
        const targetEns = await getEnsNameFromAddress(address)
        const targetName = targetEns ? targetEns : address;
        const message = `${efpLink(operatorName)} ${listop.recordTypeDescription} ${efpLink(targetName)} ${listop.tag ? `as '${listop.tag}'` : ''}`
        const logmsg = `${operatorName} ${listop.recordTypeDescription} ${targetName} ${listop.tag ? `as '${listop.tag}'` : ''}`
        for (const chatId of existingChatsTarget) {
            await bot.api.sendMessage(chatId, message, { parse_mode: "HTML", link_preview_options: {is_disabled: true} })
            console.log(`[${chatId}]: ${logmsg}`)
        }

        for (const chatId of existingChatsOperator) {
            await bot.api.sendMessage(chatId, message, { parse_mode: "HTML", link_preview_options: {is_disabled: true} })
            console.log(`[${chatId}]: ${logmsg}`)
        }
    }
}

export async function handleListSubs(ctx: any): Promise<void> {
    const subsByChat = (await redis.get(`subs:${ctx.chat.id}`)) as { subs: string[] } | null
    if (!subsByChat || !subsByChat.subs || subsByChat.subs.length === 0) {
        await ctx.reply("This chat has no subscriptions.")
        return
    }

    let response = "This chat is subscribed to the following addresses:\n"
    const names = await getBatchEnsNameFromAddress(subsByChat.subs)
    const subs = names.map((record) =>  `- ${record}\n`)
    await ctx.reply(response + subs.join(''));
    console.log(`list all subscriptions for chat: ${ctx.chat.id}`);
}

export async function handleSubscribe(ctx: any, addrOrENS: string | null): Promise<void> {
    let address = addrOrENS
    if(!isAddress(addrOrENS as string)) {
        address = await getAddressFromEnsName(addrOrENS as string)
    } 
    if (!address) {
        await ctx.reply("Invalid address or ENS name. Please provide a valid Ethereum address or ENS name.");
        return
    }
    if (!ctx.chat.id){
        await ctx.reply("This chat is not valid for subscriptions.");
        return
    }

    const chatsByAddress = (await redis.get(address)) as { chats: string[] } | null;
    const existingChats = chatsByAddress ? chatsByAddress.chats : [];
    if (existingChats.includes(ctx.chat.id)) {
        await ctx.reply("This chat is already subscribed to updates for this address.");
        return;
    }
    existingChats.push(ctx.chat.id);    
    await redis.put(`${address}`, JSON.stringify({ chats: existingChats }));

    const subsByChat = (await redis.get(`subs:${ctx.chat.id}`)) as { subs: string[] } | null
    const existingSubs = subsByChat ? subsByChat.subs : []
    if (existingSubs.includes(address)) {
        await ctx.reply("This chat is already subscribed to updates for this address.");
        return;
    }
    existingSubs.push(address);    
    await redis.put(`subs:${ctx.chat.id}`, JSON.stringify({ subs: existingSubs }));

    await ctx.reply(`This chat is now subscribed to updates for: ${address}`);
    console.log(`[${ctx.chat.id}] subscribed to address: ${address}`);
}

export async function handleUnsubscribe(ctx: any): Promise<void> {
    const addrOrENS = ctx.match
    if(ctx.match === 'all'){
        // double check with user before proceeding
        const inlineKeyboard = new InlineKeyboard().text("Yes", "confirm_unsubscribe_all").text("No", "cancel_unsubscribe_all");
        await ctx.reply("Are you sure you want to unsubscribe from ALL accounts?", { reply_markup: inlineKeyboard });
        return
    }
    let address = addrOrENS
    if(!isAddress(addrOrENS)) {
        address = await getAddressFromEnsName(addrOrENS)
    }
    if (!address) {
        await ctx.reply("Invalid address or ENS name. Please provide a valid Ethereum address or ENS name.");
        return;
    }

    const chatsByAddress = (await redis.get(address)) as { chats: string[] } | null;
    const existingChats = chatsByAddress ? chatsByAddress.chats : [];
    if (existingChats.includes(ctx.chat.id)) {
        existingChats.splice(existingChats.indexOf(ctx.chat.id), 1);
        await redis.put(`${address}`, JSON.stringify({ chats: existingChats }));    
    }

    const subsByChat = (await redis.get(`subs:${ctx.chat.id}`)) as { subs: string[] } | null
    const existingSubs = subsByChat ? subsByChat.subs : []
    if (existingSubs.includes(address)) {
        existingSubs.splice(existingSubs.indexOf(address), 1);  
        await redis.put(`subs:${ctx.chat.id}`, JSON.stringify({ subs: existingSubs }));
    }

    await ctx.reply(`This chat is now unsubscribed from updates for: ${address}.`);
    console.log(`[${ctx.chat.id}] unsubscribed from address: ${address}`);
}

export async function unsubscribeAll(ctx: any): Promise<void> {
    const subsByChat = (await redis.get(`subs:${ctx.chat.id}`)) as { subs: string[] } | null
    if (!subsByChat || !subsByChat.subs || subsByChat.subs.length === 0) {
        await ctx.reply("This chat has no subscriptions to unsubscribe from.");
        return;
    }
    
    for (const address of subsByChat.subs) {
        const chatsByAddress = (await redis.get(address)) as { chats: string[] } | null;
        const existingChats = chatsByAddress ? chatsByAddress.chats : [];
        if (existingChats.includes(ctx.chat.id)) {
            existingChats.splice(existingChats.indexOf(ctx.chat.id), 1);
            await redis.put(`${address}`, JSON.stringify({ chats: existingChats }));
        }
    }
    
    await redis.put(`subs:${ctx.chat.id}`, JSON.stringify({ subs: [] }));
    // await ctx.reply("This chat is now unsubscribed from all addresses.");
    console.log(`[${ctx.chat.id}] unsubscribed from all addresses`);
}

export async function handleHelp(ctx: any): Promise<void> {
    const helpMessage = `
Welcome to the official EFP Follow Bot! \r\n
You can use this bot to stay up to date with who is following who on EFP.  Here are the commands you can use: \r\n
/subscribe <address_or_ens> - Subscribe to updates for a specific Ethereum address or ENS name. \r\n
/sub <address_or_ens> - Subscribe to updates for a specific Ethereum address or ENS name (alias for /subscribe). \r\n
/unsubscribe <address_or_ens> - Unsubscribe from updates for a specific Ethereum address or ENS name. \r\n
/unsub <address_or_ens> - Unsubscribe from updates for a specific Ethereum address or ENS name (alias for /unsubscribe). \r\n
/unsub all - Unsubscribe from all accounts. \r\n
/list - List all subscriptions for this chat. \r\n
/help - Show this help message.`

    await ctx.reply(helpMessage);
}