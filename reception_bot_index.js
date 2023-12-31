import 'dotenv/config';
import { Markup, Telegraf } from 'telegraf';
import dialog from './answers.js';

let user;
let userId
let isUserBot;
let receiver;
let mediaGroupId = "";

let personalData = {
    text: "",
    photoId: [],
    videoId: [],
};

const bot = new Telegraf(process.env.BOT_CALL_NAME);

bot.use(Telegraf.log());

bot.start(startAction);
bot.command('restart', startAction);

bot.on("message", dataProcessorMiddleware, onMessage);

async function dataProcessorMiddleware(ctx, next) {
    try {
        if (JSON.stringify(ctx?.update?.message?.from.id) === process.env.rootUser && ctx?.message?.tex) {
            let user = ctx.message.text.match(/\[(.*?)\]/)[1];
            let data = ctx.message.text.replace(/\[(.*?)\]/, "");

            data && user &&
                await bot.telegram.sendMessage(user, data);

            return
        }

        if (ctx?.message?.text || ctx?.Context?.update?.message?.text) {
            let userMessage = ctx.message.text || ctx.update.message.text;
            personalData.text += userMessage + " ";
        }

        if (ctx?.update?.message?.photo || ctx?.message?.photo || ctx?.Context?.update?.message?.photo ||
            ctx?.update?.message?.video || ctx?.message?.video || ctx?.Context?.update?.message?.video) {

            let photo = ctx?.update?.message?.photo || ctx?.message?.photo || ctx?.Context?.update?.message?.photo;
            let video = ctx?.update?.message?.video || ctx?.message?.video || ctx?.Context?.update?.message?.video;

            if (photo) {
                const photoData = ctx.message.photo.at(-1);
                photoData.file_id && personalData.photoId.push(photoData.file_id);
            }
            if (video) {
                if (ctx.update.message.caption) {
                    text.concat(" " + ctx.update.message.caption);
                }

                personalData.videoId.push(video.file_id);
            }
        }

        if (!ctx?.update?.message?.media_group_id) {
            next();
            return;
        }

        if (ctx?.update?.message?.media_group_id && ctx?.update?.message?.media_group_id !== mediaGroupId) {
            mediaGroupId = ctx?.update?.message?.media_group_id;
            next();
            return;
        }

    } catch (e) {
        ctx.reply(dialog.error_caused);
        ctx.telegram.sendMessage(receiver, JSON.stringify(e));
        console.log(e);
    }

}

async function startAction(ctx) {
    user = await getUserName(ctx);
    userId = JSON.stringify(ctx?.update?.message?.from.id);
    isUserBot = JSON.stringify(ctx?.update?.message?.from.is_bot);
    receiver = process.env.postBox;
    mediaGroupId = "";

    personalData = {
        text: "",
        photoId: [],
        videoId: [],
    };

    await ctx.reply(dialog.intro);
    await ctx.telegram.sendMessage(receiver, "user: { " + user + " }\n" + "user id: { " + userId + " }" + "\n" + "is user bot { " + isUserBot + " }" + "\n" + " USER MESSAGE: \n " + "User pressed start button");
}

async function onMessage(ctx) {
    try {
        await ctx.replyWithHTML(dialog.if_end, Markup.inlineKeyboard([
            [
                Markup.button.callback(dialog.form_and_send, "formAndSend")
            ]
        ]));
    } catch (e) {
        ctx.reply(dialog.error_caused);
        ctx.telegram.sendMessage(receiver, JSON.stringify(e))
        console.log(e);
    }
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
    try {

        if (!personalData?.text?.length || (!personalData?.photoId?.length && !personalData?.videoId?.length)) {
            ctx.reply(dialog.not_enough_data);
            return;
        }

        const performedMediaGroup = personalData.photoId.map((photoId) => {
            return {
                type: 'photo',
                media: photoId,
            }
        });

        const performedVideoGroup = personalData.videoId.map((videoId) => {
            return {
                type: 'video',
                media: videoId
            }
        });

        // Send the media group as an album
        if (performedMediaGroup.length) { performedMediaGroup[0].caption = personalData.text }
        else
            if (performedVideoGroup.length) { performedVideoGroup[0].caption = personalData.text }

        const resultPerformedMediaGroup = performedMediaGroup.concat(performedVideoGroup);

        ctx.telegram.sendMediaGroup(process.env.postBox, resultPerformedMediaGroup);
        ctx.editMessageText(dialog.thank_you);

        // Clear personalData for the next interaction
        mediaGroupId = "";
        personalData = {
            text: "",
            photoId: [],
            videoId: [],
        };

    } catch (e) {
        ctx.reply(dialog.error_caused);
        ctx.telegram.sendMessage(receiver, JSON.stringify(e))
        console.log(e);
    };
});

bot.launch();

// // Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
