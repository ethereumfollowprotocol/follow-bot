import { Bot, GrammyError, HttpError } from "grammy";
import postgres from "postgres";
import { handleEvent, handleHelp, handleListSubs, handleSubscribe, handleUnsubscribe, unsubscribeAll } from "#/cmd.ts";
import { env } from "#/env.ts";

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
        handleEvent(bot,row)
    },
    () => {
        console.log(`Connected to EFP Global Publication`)
    }
)

bot.command("start", async (ctx) => {
    await ctx.reply("Welcome! This bot is ready to send messages.  Please use /sub or /subscribe to start receiving updates. Type /help for more information.");
});

bot.command(["sub", "subscribe"], async (ctx) => {
    const terms = ctx.match.split(" ")
    for (const term of terms) {
        await handleSubscribe(ctx, term)
    }
});

bot.command(["unsub", "unsubscribe"], async (ctx) => {
    await handleUnsubscribe(ctx)
});

bot.command(["h", "help"], async (ctx) => {
    await handleHelp(ctx)
});

bot.command("list", async (ctx) => {
    await handleListSubs(ctx)
});

bot.callbackQuery("confirm_unsubscribe_all", async (ctx) => {
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