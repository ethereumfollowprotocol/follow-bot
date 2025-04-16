import { isAddress, getAddressFromEnsName, getEnsNameFromAddress, getBatchEnsNameFromAddress, getENSProfileFromAddressOrName, getEFPDetails, getEFPStats, fetchURL } from "#/utils"
import { RedisService } from "#/data"
import { parseListOperation, getListUser, validatePrimaryListOp, getListId } from "#/efp"
import { InlineKeyboard } from "grammy"
import { sleep } from "bun"

const redis = new RedisService()

function linkEFP(acct: string): string {
    return `<a href="https://efp.app/${acct}">${acct}</a>`
}

function linkGithub(user: string): string {
    return `<a href="https://github.com/${user}">Github</a>`
}

function linkTwitter(user: string): string {
    return `<a href="https://x.com/${user}">X</a>`
}

function linkTelegram(user: string): string {
    return `<a href="https://t.me/${user}">Telegram</a>`
}

function linkDiscord(user: string): string {
    return `<a href="https://discord.com/users/${user}">Discord</a>`
}

function linkEtherscan(address: string): string {
    return `<a href="https://etherscan.io/address/${address}">${address}</a>`
}

export async function handleEvent(bot: any, row: any): Promise<void> {
    if(row?.event_name === 'ListOp'){
        const operator = await getListUser(row?.event_args?.slot, row?.chain_id, row?.contract_address)
        const listop = parseListOperation(row.event_args?.op)
        const address = listop.recordAddress
        const operatorListId = await getListId(operator)
    
        // we don't want to notify for non-primary list operations
        const validPrimaryListOp = await validatePrimaryListOp(row, operatorListId);
        if (!validPrimaryListOp) {
            console.log(`[${operator}] Non primary list operation from slot  ${row?.event_args?.slot} for address: ${address}`);
            return;
        }

        const existingSubsTarget = (await redis.get(address)) as { chats: string[] } | null;
        const existingChatsTarget = existingSubsTarget ? existingSubsTarget.chats : [];
        const existingSubsOperator = (await redis.get(operator)) as { chats: string[] } | null;
        const existingChatsOperator = existingSubsOperator ? existingSubsOperator.chats : [];
        if (existingChatsTarget.length === 0 && existingChatsOperator.length === 0) return;

        // const targetStats = await getEFPStats(address)
        // const operatorStats = await getEFPStats(operator)
        const operatorEns = await getEnsNameFromAddress(operator)
        const operatorName = operatorEns ? operatorEns : operator;
        const targetEns = await getEnsNameFromAddress(address)
        const targetName = targetEns ? targetEns : address;
        // const message = `${linkEFP(operatorName)}(${operatorStats.following_count}, ${operatorStats.followers_count}) ${listop.recordTypeDescription} ${linkEFP(targetName)}(${targetStats.following_count}, ${targetStats.followers_count}) ${listop.tag ? `as '${listop.tag}'` : ''}`
        const message = `${linkEFP(operatorName)} ${listop.recordTypeDescription} ${linkEFP(targetName)} ${listop.tag ? `as '${listop.tag}'` : ''}`
        const logmsg = `${operatorName} ${listop.recordTypeDescription} ${targetName} ${listop.tag ? `as '${listop.tag}'` : ''}`
        for (const chatId of existingChatsTarget) {
            await bot.api.sendMessage(chatId, message, { parse_mode: "HTML", link_preview_options: {is_disabled: true} })
            console.log(`[${chatId}]: ${logmsg}`)
            await sleep(500)
        }

        for (const chatId of existingChatsOperator) {
            await bot.api.sendMessage(chatId, message, { parse_mode: "HTML", link_preview_options: {is_disabled: true} })
            console.log(`[${chatId}]: ${logmsg}`)
            await sleep(500)
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
        await ctx.reply(`Invalid address or ENS name. '${addrOrENS}' Please provide a valid Ethereum address or ENS name.`);
        return
    }
    if (!ctx.chat.id){
        await ctx.reply("This chat is not valid for subscriptions.");
        return
    }

    const chatsByAddress = (await redis.get(address)) as { chats: string[] } | null;
    const existingChats = chatsByAddress ? chatsByAddress.chats : [];
    if (existingChats.includes(ctx.chat.id)) {
        await ctx.reply(`This chat is already subscribed to updates for ${addrOrENS}.`);
        return;
    }
    existingChats.push(ctx.chat.id);    
    await redis.put(`${address}`, JSON.stringify({ chats: existingChats }));

    const subsByChat = (await redis.get(`subs:${ctx.chat.id}`)) as { subs: string[] } | null
    const existingSubs = subsByChat ? subsByChat.subs : []
    if (existingSubs.includes(address)) {
        await ctx.reply(`This chat is already subscribed to updates for ${addrOrENS}.`);
        return;
    }
    existingSubs.push(address);    
    await redis.put(`subs:${ctx.chat.id}`, JSON.stringify({ subs: existingSubs }));

    await ctx.reply(`Subscribing to ${addrOrENS}...\nThis chat is now subscribed to updates for: ${address}`);
    console.log(`[${ctx.chat.id}] subscribed to address: ${addrOrENS}`);
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
    console.log(`[${ctx.chat.id}] unsubscribed from all addresses`);
}

export async function handleDetails(ctx: any): Promise<void> {
    const addrOrENS = ctx.match
    const efpData = await getEFPDetails(addrOrENS)
    const efpStats = await getEFPStats(addrOrENS)
    const list = efpData?.primary_list ? `| #${linkEFP(efpData?.primary_list)}` : ''
    const address = efpData?.address ? `${linkEtherscan(efpData?.address)}\n` : ''
    const status = efpData?.ens?.records?.status ? `<i>${efpData?.ens?.records?.status}</i>\n` : ''
    const github = efpData?.ens?.records?.["com.github"] ? `${linkGithub(efpData?.ens?.records?.["com.github"])} |` : ''
    const twitter = efpData?.ens?.records?.["com.twitter"] ? `${linkTwitter(efpData?.ens?.records?.["com.twitter"])} |` : ''
    const telegram = efpData?.ens?.records?.["org.telegram"] ? `${linkTelegram(efpData?.ens?.records?.["org.telegram"])} |` : ''
    const discord = efpData?.ens?.records?.["com.discord"] ? `${linkDiscord(efpData?.ens?.records?.["com.discord"])} |` : ''
    let details = `
${linkEFP(efpData?.ens?.name || addrOrENS)} ${list} 
Following: ${efpStats?.following_count || 0} | Followers: ${efpStats?.followers_count || 0} \n${address}
${efpData?.ens?.records?.description || "No bio available."} \n\n`

    if(status) {
        details += `${status}\n`
    }
    if (github || twitter || telegram || discord) {
        details += `| ${twitter} ${github} ${telegram} ${discord}\n`
    }
    if(efpData?.ens?.avatar === null || efpData?.ens?.avatar === undefined) {
        await ctx.reply(details, { parse_mode: "HTML", link_preview_options: {is_disabled: true} });
        return;
    }
    const checkAvatar = await fetch(efpData?.ens?.avatar)
    if (!checkAvatar.ok) {
        await ctx.reply(details, { parse_mode: "HTML", link_preview_options: {is_disabled: true} });
        return;
    }
    await ctx.replyWithPhoto(efpData?.ens?.avatar, {
        caption: details,
        parse_mode: "HTML",
        link_preview_options: {is_disabled: true}
    })
    console.log(`[${ctx.chat.id}] requested details for address: ${addrOrENS}`);
}

export async function handleHelp(ctx: any): Promise<void> {
    const helpMessage = `
Welcome to the official EFP Follow Bot! \r\n
You can use this bot to stay up to date with who is following who on EFP.  Here are the commands you can use: \r\n
/details <address_or_ens> - Get details for a specific Ethereum address or ENS name. \r\n
/list - List all subscriptions for this chat. \r\n
/subscribe <address_or_ens> <address_or_ens> <address_or_ens> - Subscribe to updates for multiple Ethereum addresses or ENS names. \r\n
/sub <address_or_ens> <address_or_ens> <address_or_ens> - Subscribe to updates for multiple Ethereum addresses or ENS names (alias for /subscribe). \r\n
/unsubscribe <address_or_ens> - Unsubscribe from updates for a specific Ethereum address or ENS name. \r\n
/unsub <address_or_ens> - Unsubscribe from updates for a specific Ethereum address or ENS name (alias for /unsubscribe). \r\n
/unsub all - Unsubscribe from all accounts. \r\n
/help - Show this help message.`

    await ctx.reply(helpMessage);
}