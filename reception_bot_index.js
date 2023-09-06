import AdmZip from 'adm-zip';
import 'dotenv/config';
import fs from 'fs';
import fetch from 'node-fetch';
import { Markup, Telegraf } from 'telegraf';
import dialog from './answers.js';

let user;
let userId
let isUserBot;
let receiver;
let firstMessage;

let text = "";
let photos = [];
let videos = [];

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use(Telegraf.log());

bot.start(startAction);
bot.on("message", onMessage);
bot.command('restart', onRestart);
bot.action("formAndSend", formAndSend);

async function startAction(ctx) {
    user = await getUserName(ctx);
    userId = JSON.stringify(ctx?.update?.message?.from.id);
    isUserBot = JSON.stringify(ctx?.update?.message?.from.is_bot);
    receiver = process.env.postBox;
    firstMessage = true;

    await ctx.telegram.sendMessage(receiver, "user: { " + user + " }\n" + "user id: { " + userId + " }" + "\n" + "is user bot { " + isUserBot + " }" + "\n" + " USER MESSAGE: \n " + "User pressed start button");
    await ctx.reply(dialog.intro);
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
            text.concat(userMessage);

            //await ctx.telegram.sendMessage(receiver, "user: { " + user + " }\n" + "user id: { " + userId + " }" + "\n" + "is user bot { " + isUserBot + " }" + "\n" + " USER MESSAGE: \n " + userMessage);
        }

        if (ctx?.update?.message?.photo || ctx?.message?.photo || ctx?.Context?.update?.message?.photo ||
            ctx?.update?.message?.video || ctx?.message?.video || ctx?.Context?.update?.message?.video) {

            let photo = ctx?.update?.message?.photo || ctx?.message?.photo || ctx?.Context?.update?.message?.photo;
            let video = ctx?.update?.message?.video || ctx?.message?.video || ctx?.Context?.update?.message?.video;

            if (photo) {
                if (ctx.update.message.caption) {
                    text.concat("\n" + receiver, ctx.update.message.caption);
                }

                photos.push(photo[0].file_id);
                //await ctx.telegram.sendPhoto(receiver, photo[0].file_id);
            }
            if (video) {
                if (ctx.update.message.caption) {
                    text.concat("\n" + receiver, ctx.update.message.caption);
                }

                videos.push(video.file_id);
                //await ctx.telegram.sendVideo(receiver, video.file_id);
            }
        }

        // const keyboard = Markup.keyboard([
        //     Markup.button.contactRequest(dialog.form_and_send, false),
        // ]).resize();


        await ctx.replyWithHTML(dialog.if_end, Markup.inlineKeyboard([
            [
                Markup.button.callback(dialog.form_and_send, "formAndSend")
            ]
        ])).resize();


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

async function formAndSend(ctx) {
    ctx.reply(dialog.inDevelopment);

    const fileId = ctx.message.photo.at(-1).file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);

    // Create a zip file
    const zip = new AdmZip();

    for (let i = 0; i < photos.length; i++) {
        // Download the photo using fetch
        let response = await fetch(photos[i]);
        let buffer = Buffer.from(await response.arrayBuffer());

        // Save the downloaded photo to a temporary file
        let tempFileName = `${fileId}.jpg`;
        fs.writeFileSync(tempFileName, buffer);
        zip.addLocalFile(tempFileName);

        // Cleanup temporary files
        fs.unlinkSync(tempFileName);
    }

    // Save the zip file
    const zipFileName = `${fileId}.zip`;
    zip.writeZip(zipFileName);

    fs.unlinkSync(zipFileName);
    // Send the zip file to the chat
    ctx.replyWithDocument({ source: zipFileName });
}

bot.launch();

// // Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
