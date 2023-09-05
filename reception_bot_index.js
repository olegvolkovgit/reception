import 'dotenv/config';
import { Markup, Telegraf } from 'telegraf';
import dialog from './answers.js';

let user;
let userId
let isUserBot;
let receiver;
let firstMessage;

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use(Telegraf.log());

bot.start(startAction);
bot.on("message", onMessage);
bot.command('restart', onRestart);

async function startAction(msg) {
    user = await getUserName(msg);
    userId = JSON.stringify(msg?.update?.message?.from.id);
    isUserBot = JSON.stringify(msg?.update?.message?.from.is_bot);
    receiver = process.env.postBox;
    firstMessage = true;

    await msg.telegram.sendMessage(receiver, "user: { " + user + " }\n" + "user id: { " + userId + " }" + "\n" + "is user bot { " + isUserBot + " }" + "\n" + " USER MESSAGE: \n " + "User pressed start button");
    await msg.reply(dialog.intro);
}

async function onMessage(msg) {
    try {
        receiver = process.env.postBox;
        if (JSON.stringify(msg?.update?.message?.from.id) === process.env.respKey) {
            let user = msg.message.text.match(/\[(.*?)\]/)[1];
            let data = msg.message.text.replace(/\[(.*?)\]/, "");

            data && user &&
                await bot.telegram.sendMessage(user, data);

            return
        }

        if (msg?.message?.text || msg?.Context?.update?.message?.text) {
            let userMessage = msg.message.text || msg.update.message.text;
            await msg.telegram.sendMessage(receiver, "user: { " + user + " }\n" + "user id: { " + userId + " }" + "\n" + "is user bot { " + isUserBot + " }" + "\n" + " USER MESSAGE: \n " + userMessage);
        }

        if (msg?.update?.message?.photo || msg?.message?.photo || msg?.Context?.update?.message?.photo ||
            msg?.update?.message?.video || msg?.message?.video || msg?.Context?.update?.message?.video) {

            let photo = msg?.update?.message?.photo || msg?.message?.photo || msg?.Context?.update?.message?.photo;
            let video = msg?.update?.message?.video || msg?.message?.video || msg?.Context?.update?.message?.video;

            if (photo) {
                if (msg.update.message.caption) {
                    await msg.telegram.sendMessage(receiver, msg.update.message.caption);
                }
                await msg.telegram.sendPhoto(receiver, photo[0].file_id);
            }
            if (video) {
                if (msg.update.message.caption) {
                    await msg.telegram.sendMessage(receiver, msg.update.message.caption);
                }
                await msg.telegram.sendVideo(receiver, video.file_id);
            }
        }

        await msg.replyWithHTML(dialog.thanks[language], Markup.inlineKeyboard([
            [
                Markup.button.callback(dialog.button_text),
            ]
        ]));
    } catch (e) {
        console.log(e)
    }
}

async function onRestart(ctx) {
    firstMessage = false;
    await startAction();
}

async function getUserName(ctx) {
    let user = JSON.stringify(ctx?.update?.message?.from?.username) ||
        JSON.stringify(ctx?.message?.from?.username) ||
        JSON.stringify(ctx?.message?.chat?.username) ||
        JSON.stringify(ctx?.update?.message?.chat?.username) ||
        JSON.stringify(ctx?.update?.message?.sender_chat?.username) ||
        JSON.stringify(ctx.username);
    if (!user) {
        user = JSON.stringify(ctx?.update?.message?.from?.first_name) + " " + JSON.stringify(ctx?.update?.message?.from?.last_name) ||
            JSON.stringify(ctx?.message?.from?.first_name) + " " + JSON.stringify(ctx?.message?.from?.last_name) ||
            JSON.stringify(ctx?.message?.chat?.first_name) + " " + JSON.stringify(ctx?.message?.chat?.last_name) ||
            JSON.stringify(ctx?.update?.message?.chat?.first_name) + " " + JSON.stringify(ctx?.update?.message?.chat?.last_name) ||
            JSON.stringify(ctx?.update?.message?.sender_chat?.first_name) + " " + JSON.stringify(ctx?.update?.message?.sender_chat?.last_name) ||
            JSON.stringify(ctx.first_name) + " " + JSON.stringify(ctx.last_name);
    }

    return user;
}

bot.launch();

// // Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
