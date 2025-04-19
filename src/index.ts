import { Bot, GrammyError, HttpError } from "grammy";
import postgres from "postgres";
import { handleDetails, handleEvent, handleHelp, handleListSubs, handleSubscribe, handleUnsubscribe, unsubscribeAll } from "#/cmd.ts";
import { env } from "#/env.ts";
import { sleep } from "bun";

const bot = new Bot(env.TG_BOT_TOKEN); 

const client = postgres(env.DATABASE_URL, {
    publications: 'global_publication',
    types: {
        bigint: postgres.BigInt
    }
})

client.subscribe(
    'events',
    async (row, { command, relation }) => {
        await handleEvent(bot,row)
    },
    () => {
        console.log(`Connected to EFP Global Publication`)
    }
)

bot.command("start", async (ctx) => {
    await ctx.reply("Welcome! This bot is ready to send messages.  Please use /sub or /subscribe to start receiving updates. Type /help for more information.");
});

bot.command(["sub", "subscribe"], async (ctx) => {
    await ctx.replyWithChatAction("typing")
    const terms = ctx.match.split(" ")
    for (const term of terms) {
        await handleSubscribe(ctx, term)
        await sleep(300)
    }
});

bot.command(["unsub", "unsubscribe"], async (ctx) => {
    await handleUnsubscribe(ctx)
});

bot.command(["h", "help"], async (ctx) => {
    await handleHelp(ctx)
});

bot.command(["d", "details"], async (ctx) => {
    await handleDetails(ctx)
});

bot.command("list", async (ctx) => {
    await ctx.replyWithChatAction("typing")
    await handleListSubs(ctx)
});

bot.callbackQuery("confirm_unsubscribe_all", async (ctx) => {
    await ctx.replyWithChatAction("typing")
    // handle confirmation of unsubscribe all command
    await unsubscribeAll(ctx)
    await ctx.editMessageReplyMarkup()
    await ctx.editMessageText("This chat is now unsubscribed from all addresses.");

    await ctx.answerCallbackQuery({
      text: "This chat is now unsubscribed from all addresses.",
    });
});

bot.on("callback_query:data", async (ctx) => {
    console.log("Unknown button event with payload", ctx.callbackQuery.data);
    await ctx.answerCallbackQuery(); 
});

bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
      console.error("Error in request:", e.description);
    } else if (e instanceof HttpError) {
      console.error("Could not contact Telegram:", e);
    } else {
      console.error("Unknown error:", e);
    }
});

bot.start();

let heartbeat = 0
for (;;) {
    await sleep(1000)
    console.log(`waiting for events...`)
    heartbeat++
    if (heartbeat > 300 && env.HEARTBEAT_URL && env.HEARTBEAT_URL !== 'unset') {
    // call snitch
    try {
        const response = await fetch(`${env.HEARTBEAT_URL}`)
        const text = await response.text()
        console.log(`Heartbeat registered`)
        heartbeat = 0
    } catch (err) {
        console.log(`Failed to register heartbeat `)
    }
    }
}