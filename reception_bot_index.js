import AdmZip from 'adm-zip';
import 'dotenv/config';
import fs from 'fs';
import { Markup, Telegraf } from 'telegraf';
import dialog from './answers.js';

let user;
let userId
let isUserBot;
let receiver;
let firstMessage;
const personalData = {};

let text = "";
let photos = [];
let videos = [];

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
    // if (!text && !personalData.photoId && !personalData.videoId) {
    //     ctx.reply('Не всі дані отримані. Будь ласка, надішліть всі необхідні дані.');
    //     return;
    // }

    // Create a ZIP archive using adm-zip
    const zip = new AdmZip();

    // Add text, photo, and video to the archive
    zip.addFile('text.txt', Buffer.from(personalData.text, 'utf8'));
    photos.forEach(photoId => { zip.addFile('photo.jpg', fs.readFileSync(photoId)) });
    personalData.videoId && zip.addFile('video.mp4', fs.readFileSync(personalData.videoId));

    // Save the ZIP archive to a file
    const zipFilePath = __dirname + '/data.zip';
    zip.writeZip(zipFilePath);

    // Send the ZIP archive to the user
    ctx.replyWithDocument({ source: zipFilePath });

    // Clear personalData for the next interaction
    personalData = {};
});

bot.launch();

// // Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))


// import archiver from 'archiver';
// import fs from 'fs';
// import { Markup, Telegraf } from 'telegraf';

// const bot = new Telegraf('6675530334:AAH85t_EJTKqmF-SRj09Gw5cUhMFtMTPnC8');

// let personalData = {};

// bot.start((ctx) => {
//     ctx.reply('надішліть дані для перевірки');
// });

// bot.on('text', (ctx) => {
//     const messageText = ctx.message.text;
//     // Store text data in a global variable
//     personalData.text = messageText;

//     ctx.replyWithHTML('якщо ви закінчили надсилання - натисніть кнопку нижче', Markup.inlineKeyboard([
//         [
//             Markup.button.callback('зформувати і надіслати', 'send')
//         ]
//     ]));

//     // ctx.reply(
//     //     'якщо ви закінчили надсилання - натисніть кнопку нижче',
//     //     Markup.button.callback('зформувати і надіслати', 'send')
//     // );
// });

// bot.on('photo', (ctx) => {
//     const photoId = ctx.message.photo[0].file_id;
//     // Store photo data in a global variable
//     personalData.photoId = photoId;
// });

// bot.on('video', (ctx) => {
//     const videoId = ctx.message.video.file_id;
//     // Store video data in a global variable
//     personalData.videoId = videoId;
// });

// bot.action('send', (ctx) => {
// Check if all required data is available
// if (!personalData.text && !personalData.photoId && !personalData.videoId) {
//     ctx.reply('Не всі дані отримані. Будь ласка, надішліть всі необхідні дані.');
//     return;
// }

// // Create a ZIP archive
// const archive = archiver('zip', {
//     zlib: { level: 9 },
// });

// const output = fs.createWriteStream(__dirname + '/data.zip');

// // Add text, photo, and video to the archive
// archive.append(personalData.text, { name: 'text.txt' });
// archive.append(personalData.photoId, { name: 'photo.jpg' });
// archive.append(personalData.videoId, { name: 'video.mp4' });

// // Finalize the archive and send it to the user
// archive.pipe(output);
// archive.finalize();

// ctx.reply('Формування ZIP-архіву та відправлення...');
// ctx.telegram.sendDocument(ctx.from.id, {
//     source: __dirname + '/data.zip',
// });

// // Clear personalData for the next interaction
// personalData = {};
// });

// bot.launch();