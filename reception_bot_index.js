import 'dotenv/config';
import { Markup, Telegraf } from 'telegraf';
import dialog from './answers.js';

let user;
let userId
let isUserBot;
let receiver;

const personalData = {
    text: "",
    photoId: [""],
    videoId: [""],
};

const bot = new Telegraf(process.env.BOT_CALL_NAME);

bot.use(Telegraf.log());

bot.start(startAction);
bot.on("message", onMessage);
bot.command('restart', onRestart);

async function startAction(ctx) {
    user = await getUserName(ctx);
    userId = JSON.stringify(ctx?.update?.message?.from.id);
    isUserBot = JSON.stringify(ctx?.update?.message?.from.is_bot);
    receiver = process.env.postBox;

    await ctx.reply(dialog.intro);
    await ctx.telegram.sendMessage(receiver, "user: { " + user + " }\n" + "user id: { " + userId + " }" + "\n" + "is user bot { " + isUserBot + " }" + "\n" + " USER MESSAGE: \n " + "User pressed start button");
}

async function onMessage(ctx) {
    try {
        receiver = process.env.postBox;
        if (JSON.stringify(ctx?.update?.message?.from.id) === process.env.respKey) {
            let user = ctx.message.text.match(/\[(.*?)\]/)[1];
            let data = ctx.message.text.replace(/\[(.*?)\]/, "");

            data && user &&
                await bot.telegram.sendMessage(user, data);

            return
        }

        if (ctx?.message?.text || ctx?.Context?.update?.message?.text) {
            let userMessage = ctx.message.text || ctx.update.message.text;
            personalData.text += userMessage;

            //await ctx.telegram.sendMessage(receiver, "user: { " + user + " }\n" + "user id: { " + userId + " }" + "\n" + "is user bot { " + isUserBot + " }" + "\n" + " USER MESSAGE: \n " + userMessage);
        }

        if (ctx?.update?.message?.photo || ctx?.message?.photo || ctx?.Context?.update?.message?.photo ||
            ctx?.update?.message?.video || ctx?.message?.video || ctx?.Context?.update?.message?.video) {

            let photo = ctx?.update?.message?.photo || ctx?.message?.photo || ctx?.Context?.update?.message?.photo;
            let video = ctx?.update?.message?.video || ctx?.message?.video || ctx?.Context?.update?.message?.video;

            if (photo) {
                if (ctx.update.message.caption) {
                    text.concat("\n" + ctx.update.message.caption);
                }

                personalData.photoId.push(photo[0].file_id);
                //await ctx.telegram.sendPhoto(receiver, photo[0].file_id);
            }
            if (video) {
                if (ctx.update.message.caption) {
                    text.concat("\n" + ctx.update.message.caption);
                }

                personalData.videoId.push(video.file_id);
                //await ctx.telegram.sendVideo(receiver, video.file_id);
            }
        }

        await ctx.replyWithHTML(dialog.if_end, Markup.inlineKeyboard([
            [
                Markup.button.callback(dialog.form_and_send, "formAndSend")
            ]
        ]));


        await ctx.replyWithHTML(dialog.if_end, keyboard);
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

bot.action('formAndSend', (ctx) => {
    // Check if all required data is available
    console.log(personalData.text.length, "=> personalData.text.length");
    console.log(personalData.photoId.length, "=> personalData.photoId.length");

    if (!personalData.text.length || !personalData.photoId.length) {
        ctx.reply('Не всі дані отримані. Будь ласка, надішліть всі необхідні дані.');
        return;
    }

    // Create an array of media objects (photos, videos, etc.)
    const mediaGroup = []

    for (let element in personalData.photoId) {
        mediaGroup.push({
            type: 'photo',
            media: personalData[element],
        });
    }

    for (let element in personalData.videoId) {
        mediaGroup.push({
            type: 'video',
            media: personalData[element],
        })
    }

    mediaGroup.push({
        type: 'text',
        media: personalData.text,
    })
    // Add more media objects as needed

    // Send the media group as an album
    ctx.telegram.sendMediaGroup(process.env.postBox, mediaGroup);

    // Clear personalData for the next interaction
    personalData = {
        text: "",
        photoId: [""],
        videoId: [""],
    };
});

bot.launch();

// // Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
