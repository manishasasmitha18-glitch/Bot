const {
  default: makeWASocket,
  getAggregateVotesInPollMessage,
  useMultiFileAuthState,
  DisconnectReason,
  getDevice,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
  getContentType,
  Browsers,
  makeInMemoryStore,
  makeCacheableSignalKeyStore,
  downloadContentFromMessage,
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  generateForwardMessageContent,
  proto,
} = require("manaofc-baileys");

const { version } = require("./package.json");
const fs = require("fs-extra");
const path = require("path");
const yts = require("yt-search");
const EventEmitter = require("events");
const P = require("pino");
const axios = require("axios");
const crypto = require("crypto");
const cheerio = require("cheerio");
const config = require("./config");
const figlet = require("figlet");
const FileType = require("file-type");
const NodeCache = require("node-cache");
const util = require("util");
const { File } = require("megajs");
const os = require("os");
const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);
const moment = require("moment-timezone");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const l = console.log;

EventEmitter.defaultMaxListeners = Infinity;

//========= msg.js =========
const downloadMediaMessage = async (m, filename) => {
    if (m.type === 'viewOnceMessage') {
        m.type = m.msg.type
    }
    if (m.type === 'imageMessage') {
        var nameJpg = filename ? filename + '.jpg' : 'undefined.jpg'
        const stream = await downloadContentFromMessage(m.msg, 'image')
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        fs.writeFileSync(nameJpg, buffer)
        return fs.readFileSync(nameJpg)
    } else if (m.type === 'videoMessage') {
        var nameMp4 = filename ? filename + '.mp4' : 'undefined.mp4'
        const stream = await downloadContentFromMessage(m.msg, 'video')
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        fs.writeFileSync(nameMp4, buffer)
        return fs.readFileSync(nameMp4)
    } else if (m.type === 'audioMessage') {
        var nameMp3 = filename ? filename + '.mp3' : 'undefined.mp3'
        const stream = await downloadContentFromMessage(m.msg, 'audio')
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        fs.writeFileSync(nameMp3, buffer)
        return fs.readFileSync(nameMp3)
    } else if (m.type === 'stickerMessage') {
        var nameWebp = filename ? filename + '.webp' : 'undefined.webp'
        const stream = await downloadContentFromMessage(m.msg, 'sticker')
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        fs.writeFileSync(nameWebp, buffer)
        return fs.readFileSync(nameWebp)
    } else if (m.type === 'documentMessage') {
        var ext = m.msg.fileName.split('.')[1].toLowerCase().replace('jpeg', 'jpg').replace('png', 'jpg').replace('m4a', 'mp3')
        var nameDoc = filename ? filename + '.' + ext : 'undefined.' + ext
        const stream = await downloadContentFromMessage(m.msg, 'document')
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        fs.writeFileSync(nameDoc, buffer)
        return fs.readFileSync(nameDoc)
    }
}

const sms = (conn, m) => {
    if (m.key) {
        m.id = m.key.id
        m.chat = m.key.remoteJid
        m.fromMe = m.key.fromMe
        m.isGroup = m.chat.endsWith('@g.us')
        m.sender = m.fromMe ? conn.user.id.split(':')[0] + '@s.whatsapp.net' : m.isGroup ? m.key.participant : m.key.remoteJid
    }
    if (m.message) {
        m.type = getContentType(m.message)
        m.msg = (m.type === 'viewOnceMessage') ? m.message[m.type].message[getContentType(m.message[m.type].message)] : m.message[m.type]
        if (m.msg) {
            if (m.type === 'viewOnceMessage') {
                m.msg.type = getContentType(m.message[m.type].message)
            }
            var quotedMention = m.msg.contextInfo != null ? m.msg.contextInfo.participant : ''
            var tagMention = m.msg.contextInfo != null ? m.msg.contextInfo.mentionedJid : []
            var mention = typeof(tagMention) == 'string' ? [tagMention] : tagMention
            mention != undefined ? mention.push(quotedMention) : []
            m.mentionUser = mention != undefined ? mention.filter(x => x) : []
            m.body = (m.type === 'conversation') ? m.msg : (m.type === 'extendedTextMessage') ? m.msg.text : (m.type == 'imageMessage') && m.msg.caption ? m.msg.caption : (m.type == 'videoMessage') && m.msg.caption ? m.msg.caption : (m.type == 'templateButtonReplyMessage') && m.msg.selectedId ? m.msg.selectedId : (m.type == 'buttonsResponseMessage') && m.msg.selectedButtonId ? m.msg.selectedButtonId : ''
            m.quoted = m.msg.contextInfo != undefined ? m.msg.contextInfo.quotedMessage : null
            if (m.quoted) {
                m.quoted.type = getContentType(m.quoted)
                m.quoted.id = m.msg.contextInfo.stanzaId
                m.quoted.sender = m.msg.contextInfo.participant
                m.quoted.fromMe = m.quoted.sender.split('@')[0].includes(conn.user.id.split(':')[0])
                m.quoted.msg = (m.quoted.type === 'viewOnceMessage') ? m.quoted[m.quoted.type].message[getContentType(m.quoted[m.quoted.type].message)] : m.quoted[m.quoted.type]
                if (m.quoted.type === 'viewOnceMessage') {
                    m.quoted.msg.type = getContentType(m.quoted[m.quoted.type].message)
                }
                var quoted_quotedMention = m.quoted.msg.contextInfo != null ? m.quoted.msg.contextInfo.participant : ''
                var quoted_tagMention = m.quoted.msg.contextInfo != null ? m.quoted.msg.contextInfo.mentionedJid : []
                var quoted_mention = typeof(quoted_tagMention) == 'string' ? [quoted_tagMention] : quoted_tagMention
                quoted_mention != undefined ? quoted_mention.push(quoted_quotedMention) : []
                m.quoted.mentionUser = quoted_mention != undefined ? quoted_mention.filter(x => x) : []
                m.quoted.fakeObj = proto.WebMessageInfo.fromObject({
                    key: {
                        remoteJid: m.chat,
                        fromMe: m.quoted.fromMe,
                        id: m.quoted.id,
                        participant: m.quoted.sender
                    },
                    message: m.quoted
                })
                m.quoted.download = (filename) => downloadMediaMessage(m.quoted, filename)
                m.quoted.delete = () => conn.sendMessage(m.chat, {
                    delete: m.quoted.fakeObj.key
                })
                m.quoted.react = (emoji) => conn.sendMessage(m.chat, {
                    react: {
                        text: emoji,
                        key: m.quoted.fakeObj.key
                    }
                })
            }
        }
        m.download = (filename) => downloadMediaMessage(m, filename)
    }

    m.reply = (teks, id = m.chat, option = {
        mentions: [m.sender]
    }) => conn.sendMessage(id, {
        text: teks,
        contextInfo: {
            mentionedJid: option.mentions
        }
    }, {
        quoted: m
    })
    m.replyS = (stik, id = m.chat, option = {
        mentions: [m.sender]
    }) => conn.sendMessage(id, {
        sticker: stik,
        contextInfo: {
            mentionedJid: option.mentions
        }
    }, {
        quoted: m
    })
    m.replyImg = (img, teks, id = m.chat, option = {
        mentions: [m.sender]
    }) => conn.sendMessage(id, {
        image: img,
        caption: teks,
        contextInfo: {
            mentionedJid: option.mentions
        }
    }, {
        quoted: m
    })
    m.replyVid = (vid, teks, id = m.chat, option = {
        mentions: [m.sender],
        gif: false
    }) => conn.sendMessage(id, {
        video: vid,
        caption: teks,
        gifPlayback: option.gif,
        contextInfo: {
            mentionedJid: option.mentions
        }
    }, {
        quoted: m
    })
    m.replyAud = (aud, id = m.chat, option = {
        mentions: [m.sender],
        ptt: false
    }) => conn.sendMessage(id, {
        audio: aud,
        ptt: option.ptt,
        mimetype: 'audio/mpeg',
        contextInfo: {
            mentionedJid: option.mentions
        }
    }, {
        quoted: m
    })
    m.replyDoc = (doc, id = m.chat, option = {
        mentions: [m.sender],
        filename: 'undefined.pdf',
        mimetype: 'application/pdf'
    }) => conn.sendMessage(id, {
        document: doc,
        mimetype: option.mimetype,
        fileName: option.filename,
        contextInfo: {
            mentionedJid: option.mentions
        }
    }, {
        quoted: m
    })
    m.replyContact = (name, info, number) => {
        var vcard = 'BEGIN:VCARD\n' + 'VERSION:3.0\n' + 'FN:' + name + '\n' + 'ORG:' + info + ';\n' + 'TEL;type=CELL;type=VOICE;waid=' + number + ':+' + number + '\n' + 'END:VCARD'
        conn.sendMessage(m.chat, {
            contacts: {
                displayName: name,
                contacts: [{
                    vcard
                }]
            }
        }, {
            quoted: m
        })
    }
    m.react = (emoji) => conn.sendMessage(m.chat, {
        react: {
            text: emoji,
            key: m.key
        }
    })

    return m
}

// =========== functions.js =======
const getGroupAdmins = (participants) => {
    var admins = []
    for (let i of participants) {
        i.admin !== null ? admins.push(i.id) : ''
    }
    return admins
}

const runtime = (seconds) => {
    seconds = Number(seconds)
    var d = Math.floor(seconds / (3600 * 24))
    var h = Math.floor(seconds % (3600 * 24) / 3600)
    var m = Math.floor(seconds % 3600 / 60)
    var s = Math.floor(seconds % 60)
    var dDisplay = d > 0 ? d + (d == 1 ? ' day, ' : ' days, ') : ''
    var hDisplay = h > 0 ? h + (h == 1 ? ' hour, ' : ' hours, ') : ''
    var mDisplay = m > 0 ? m + (m == 1 ? ' minute, ' : ' minutes, ') : ''
    var sDisplay = s > 0 ? s + (s == 1 ? ' second' : ' seconds') : ''
    return dDisplay + hDisplay + mDisplay + sDisplay;
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getSriLankaTimestamp() {
    return moment().tz('Asia/Colombo').format('YYYY-MM-DD HH:mm:ss');
}

// FIX: getRandom was used but never defined
const getRandom = (ext) => `${Math.floor(Math.random() * 10000)}${ext}`;

// FIX: isAnti was used but never defined
const isAnti = (value) => value === true || value === 'true' || value === 'on';

// ========== DATABASE HELPERS =============

const basePath = path.join(__dirname, "buttondata");
const settingsPath = path.join(basePath, "settings");
const nonBtnPath = path.join(basePath, "Non-Btn");
const settingsFile = path.join(settingsPath, "settings.json");
const nonBtnFile = path.join(nonBtnPath, "data.json");

// Create folders
if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, { recursive: true });
}

if (!fs.existsSync(settingsPath)) {
    fs.mkdirSync(settingsPath, { recursive: true });
}

if (!fs.existsSync(nonBtnPath)) {
    fs.mkdirSync(nonBtnPath, { recursive: true });
}

// ================= DEFAULT SETTINGS =================
// FIX: added missing keys that the code references (ANTI_LINK, ANTI_BAD,
// ANTI_BOT, AUTO_BLOCK, MOROCCO_BLOCK, READ_MESSAGE, AUTO_STATUS_REPLY,
// AUTO_REACT_STATUS, DELETEMSGSENDTO, MAX_SIZE)
const defaultSettings = {
    AUTO_VIEW_STATUS: 'false',
    AUTO_LIKE_STATUS: 'false',
    PRESENCE: 'composing',
    AUTO_LIKE_EMOJI: ['💥', '👍', '😍', '💗', '🎈', '🎉', '🥳', '😎', '🚀', '🔥'],
    AUTO_STATUS_SAVER: 'false',
    PREFIX: '.',
    MAX_RETRIES: 3,
    IMAGE_PATH: 'https://files.catbox.moe/i33owf.png',
    OWNER_NUMBER: '94759934522',
    WORK_TYPE: 'public',
    ANTIDELETE: 'true',
    ANTICALL: 'false',
    BOT_NAME: 'MANISHA-MD',
    FOOTER: '> _*Powered By Manaofc*_',
    ANTICALL_MSG: '📵 Calls are not allowed! Please send a message instead.',
    NON_BUTTON: false,
    ANTI_LINK: 'false',
    ANTI_BAD: 'false',
    ANTI_BOT: 'false',
    AUTO_BLOCK: 'false',
    MOROCCO_BLOCK: 'off',
    READ_MESSAGE: 'false',
    AUTO_STATUS_REPLY: 'off',
    AUTO_REACT_STATUS: 'off',
    DELETEMSGSENDTO: '',
    MAX_SIZE: 100
};

// ================= JSON FUNCTIONS =================

function createJSON(file, data) {
    try {
        if (!fs.existsSync(file)) {
            fs.writeFileSync(
                file,
                JSON.stringify(data, null, 2),
                "utf8"
            );
        }
    } catch (error) {
        console.error("JSON create error:", error);
    }
}

function readJSONFile(file, defaultData) {
    try {
        createJSON(file, defaultData);

        const data = fs.readFileSync(file, "utf8");

        if (!data.trim()) {
            return defaultData;
        }

        return JSON.parse(data);
    } catch (error) {
        console.error("JSON read error:", error);
        return defaultData;
    }
}

function writeJSONFile(file, data) {
    try {
        fs.writeFileSync(
            file,
            JSON.stringify(data, null, 2),
            "utf8"
        );

        return true;
    } catch (error) {
        console.error("JSON write error:", error);
        return false;
    }
}

// Create database files
createJSON(settingsFile, defaultSettings);
createJSON(nonBtnFile, []);

// ================= CMD STORE FUNCTIONS =================

async function updateCMDStore(MsgID, CmdID) {
    try {
        const olds = readJSONFile(nonBtnFile, []);

        olds.push({
            [MsgID]: CmdID
        });

        return writeJSONFile(nonBtnFile, olds);
    } catch (error) {
        console.error("updateCMDStore error:", error);
        return false;
    }
}

async function isbtnID(MsgID) {
    try {
        const olds = readJSONFile(nonBtnFile, []);

        return olds.some(
            (item) =>
                Object.prototype.hasOwnProperty.call(item, MsgID)
        );
    } catch (error) {
        console.error("isbtnID error:", error);
        return false;
    }
}

async function getCMDStore(MsgID) {
    try {
        const olds = readJSONFile(nonBtnFile, []);

        for (const item of olds) {
            if (
                Object.prototype.hasOwnProperty.call(item, MsgID)
            ) {
                return item[MsgID];
            }
        }

        return null;
    } catch (error) {
        console.error("getCMDStore error:", error);
        return null;
    }
}

function getCmdForCmdId(CMD_ID_MAP, cmdId) {
    if (!CMD_ID_MAP) return null;
    const result = CMD_ID_MAP.find(
        (entry) => entry.cmdId === cmdId
    );

    return result ? result.cmd : null;
}

// ================= DATABASE ECT =================

async function connectdb() {
    try {
        createJSON(settingsFile, defaultSettings);
        createJSON(nonBtnFile, []);

        console.log("Local database connected 💜");
        return true;
    } catch (error) {
        console.error("Database ection error:", error);
        return false;
    }
}

// ================= UPDATE SETTING =================

async function input(setting, data) {
    try {
        const settings = readJSONFile(
            settingsFile,
            defaultSettings
        );

        if (!Object.prototype.hasOwnProperty.call(settings, setting)) {
            console.warn(`Setting "${setting}" is not recognized.`);
            return false;
        }

        settings[setting] = data;

        // Update runtime config
        config[setting] = data;

        // Save locally
        return writeJSONFile(settingsFile, settings);

    } catch (error) {
        console.error("input error:", error);
        return false;
    }
}

// ================= GET SETTING =================

async function get(setting) {
    try {
        const settings = readJSONFile(
            settingsFile,
            defaultSettings
        );

        if (!Object.prototype.hasOwnProperty.call(settings, setting)) {
            console.warn(`Setting "${setting}" is not recognized.`);
            return null;
        }

        return settings[setting];

    } catch (error) {
        console.error("get error:", error);
        return null;
    }
}

// ================= UPDATE CONFIG =================

async function updateDB() {
    try {
        const settings = readJSONFile(
            settingsFile,
            defaultSettings
        );

        // Update config from local database
        config.AUTO_VIEW_STATUS = settings.AUTO_VIEW_STATUS;
        config.AUTO_LIKE_STATUS = settings.AUTO_LIKE_STATUS;
        config.AUTO_LIKE_EMOJI = settings.AUTO_LIKE_EMOJI;
        config.AUTO_STATUS_SAVER = settings.AUTO_STATUS_SAVER;
        config.MAX_RETRIES = Number(settings.MAX_RETRIES);
        config.IMAGE_PATH = settings.IMAGE_PATH;
        config.OWNER_NUMBER = settings.OWNER_NUMBER;
        config.WORK_TYPE = settings.WORK_TYPE;
        config.BOT_NAME = settings.BOT_NAME;
        config.FOOTER = settings.FOOTER;
        config.ANTICALL_MSG = settings.ANTICALL_MSG;
        config.NON_BUTTON = settings.NON_BUTTON;
        config.ANTIDELETE = settings.ANTIDELETE;
        config.ANTICALL = settings.ANTICALL;
        // FIX: sync the extra keys too
        config.ANTI_LINK = settings.ANTI_LINK;
        config.ANTI_BAD = settings.ANTI_BAD;
        config.ANTI_BOT = settings.ANTI_BOT;
        config.AUTO_BLOCK = settings.AUTO_BLOCK;
        config.MOROCCO_BLOCK = settings.MOROCCO_BLOCK;
        config.READ_MESSAGE = settings.READ_MESSAGE;
        config.AUTO_STATUS_REPLY = settings.AUTO_STATUS_REPLY;
        config.AUTO_REACT_STATUS = settings.AUTO_REACT_STATUS;
        config.DELETEMSGSENDTO = settings.DELETEMSGSENDTO;

        console.log("Local database updated ✅");

        return true;

    } catch (error) {
        console.error("updb error:", error);
        return false;
    }
}

// ================= RESET DATABASE =================

async function updfb() {
    try {
        writeJSONFile(
            settingsFile,
            defaultSettings
        );

        // Update runtime config
        Object.keys(defaultSettings).forEach((key) => {
            config[key] = defaultSettings[key];
        });

        config.MAX_SIZE = Number(defaultSettings.MAX_SIZE);

        console.log("Local database reset ✅");

        return true;

    } catch (error) {
        console.error("updfb error:", error);
        return false;
    }
}

// ================= RESET BUTTON DATABASE =================

async function upresbtn() {
    try {
        writeJSONFile(nonBtnFile, []);

        console.log("Button database cleared ✅");

        return true;

    } catch (error) {
        console.error("upresbtn error:", error);
        return false;
    }
}

// ================= IMAGE HELPERS =================

// Helper: Download image buffer from URL
async function getBuffer(url) {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000
        });
        return Buffer.from(response.data);
    } catch (e) {
        throw new Error("Failed to download image: " + e.message);
    }
}

// Helper: Generate image using Pollinations AI (FREE - No API Key)
async function generatePollinationsImage(prompt, options = {}) {
    const {
        width = 1024,
        height = 1024,
        seed = Math.floor(Math.random() * 1000000),
        model = 'flux',
        nologo = true
    } = options;

    // Pollinations AI - Completely FREE, No API Key needed
    const encodedPrompt = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&model=${model}&nologo=${nologo}`;

    return await getBuffer(url);
}

//===================SESSION============================
const sessionPath = path.join(__dirname, "file", "session")

// Ensure session folder exists before downloading/writing creds.json
if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
}

if (!fs.existsSync(path.join(sessionPath, 'creds.json'))) {
    if (config.SESSION_ID) {
        const sessdata = config.SESSION_ID;
        const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);
        filer.download((err, data) => {
            if (err) {
                console.error("Session download error:", err);
                return;
            }
            fs.writeFileSync(path.join(sessionPath, 'creds.json'), data);
            console.log("💕Session Download Completed.💕");
            console.log("⚡Please Wait 5-10 Minutes For Run.⚡");
        });
    }
}

// <<==========PORTS===========>>
const express = require("express");
const app = express();
const port = process.env.PORT || 3034;

//====================================
//====== COMMAND REGISTRATION ========
// FIX: commands array + cmd() moved OUT of the messages.upsert handler.
// Previously they were re-created (and all commands re-registered,
// including 28 logo commands) on EVERY incoming message.
//====================================
const commands = [];

function cmd(info, func) {
    var data = info;
    data.function = func;
    if (!data.dontAddCommandList) data.dontAddCommandList = false;
    if (!info.desc) info.desc = '';
    if (!data.fromMe) data.fromMe = false;
    if (!info.category) info.category = 'misc';
    if (!info.filename) info.filename = "Not Provided";
    commands.push(data);
    return data;
}

//====================================
//====== SETTINGS COMMAND ============
//====================================
cmd({
    pattern: "settings",
    react: "⚙️",
    alias: ["setup", "changesettings"],
    desc: "Show bot settings menu",
    category: "settings",
    use: ".settings",
    filename: __filename
},
async (manaofc, mek, m, { from, prefix, reply, isOwner, config }) => {
    try {
        if (!isOwner) return reply("❌ *Only owner can use this!*");

        const sections = [
            {
                title: "🔤 PREFIX",
                rows: [
                    { title: "🔹 Prefix ( . )", rowId: prefix + "set prefix ." },
                    { title: "🔹 Prefix ( ! )", rowId: prefix + "set prefix !" },
                    { title: "🔹 Prefix ( # )", rowId: prefix + "set prefix #" },
                    { title: "🔹 Prefix ( / )", rowId: prefix + "set prefix /" },
                    { title: "🔹 Prefix ( * )", rowId: prefix + "set prefix *" },
                    { title: "🔹 Prefix ( $ )", rowId: prefix + "set prefix $" },
                ],
            },
            {
                title: "🔧 WORK TYPE",
                rows: [
                    { title: "👥 Public", rowId: prefix + "set worktype public" },
                    { title: "👤 Only Me (Private)", rowId: prefix + "set worktype private" },
                ],
            },
            {
                title: "🤖 BOT PRESENCE",
                rows: [
                    { title: "💬 Auto Typing", rowId: prefix + "set presence composing" },
                    { title: "🎙️ Auto Recording", rowId: prefix + "set presence recording" },
                    { title: "🔋 Always Online", rowId: prefix + "set presence available" },
                    { title: "🪫 Always Offline", rowId: prefix + "set presence unavailable" },
                ],
            },
            {
                title: "👁️ AUTO VIEW STATUS",
                rows: [
                    { title: "✅ Turn ON", rowId: prefix + "set autoview on" },
                    { title: "❎ Turn OFF", rowId: prefix + "set autoview off" },
                ],
            },
            {
                title: "❤️ AUTO LIKE STATUS",
                rows: [
                    { title: "✅ Turn ON", rowId: prefix + "set autolike on" },
                    { title: "❎ Turn OFF", rowId: prefix + "set autolike off" },
                ],
            },
            {
                title: "💾 AUTO STATUS SAVER",
                rows: [
                    { title: "✅ Turn ON", rowId: prefix + "set autosave on" },
                    { title: "❎ Turn OFF", rowId: prefix + "set autosave off" },
                ],
            },
            {
                title: "📞 AUTO REJECT CALL",
                rows: [
                    { title: "✅ Turn ON", rowId: prefix + "set anticall on" },
                    { title: "❎ Turn OFF", rowId: prefix + "set anticall off" },
                ],
            },
            {
                title: "🗑️ ANTI DELETE",
                rows: [
                    { title: "✅ Turn ON", rowId: prefix + "set antidelete on" },
                    { title: "❎ Turn OFF", rowId: prefix + "set antidelete off" },
                ],
            },
            {
                title: "🔘 NON BUTTON MODE",
                rows: [
                    { title: "✅ Turn ON (Text Mode)", rowId: prefix + "set nonbutton on" },
                    { title: "❎ Turn OFF (Button Mode)", rowId: prefix + "set nonbutton off" },
                ],
            },
        ];

        const desc = `⚙️ \`${config.BOT_NAME || 'MANAOFC LITE'} SETTINGS\` ⚙️

> ◈ *Owner:* manaofc
> ◈ *Version:* ${version}
> ◈ *Prefix:* ${config.PREFIX || '.'}
> ◈ *Mode:* ${(config.WORK_TYPE || 'public').toUpperCase()}`;

        let listset = {
            text: desc,
            footer: config.FOOTER,
            buttonText: "🖱️ button options cliq",
            sections,
        };
        await manaofc.listMessage(from, listset, mek);

    } catch (e) {
        console.error(e);
        reply(`❌ Error: ${e.message}`);
    }
});

cmd({
    pattern: "set",
    react: "🔧",
    dontAddCommandList: true,
    filename: __filename
},
async (manaofc, mek, m, { from, q, reply, isOwner, config }) => {
    try {
        if (!isOwner) return reply("❌ *Only owner can use this!*");

        if (!q) {
            return reply("❌ *Provide a value!*\nExample: `.set prefix !`");
        }

        const args = q.trim().split(/ +/);
        const field = args[0].toLowerCase();
        const value = args.slice(1).join(" ");

        if (!value) {
            return reply("❌ *Provide a value!*\nExample: `.set prefix !`");
        }

        const updates = {};

        switch (field) {
            case 'prefix':
                updates.PREFIX = value;
                break;
            case 'worktype':
            case 'mode':
                if (!['public', 'private', 'inbox', 'group', 'onlygroup', 'onlyme'].includes(value.toLowerCase())) {
                    return reply("❌ *Valid modes:* public, private, inbox, group");
                }
                updates.WORK_TYPE = value.toLowerCase();
                break;
            case 'presence':
                if (!['composing', 'recording', 'available', 'unavailable'].includes(value.toLowerCase())) {
                    return reply("❌ *Valid presence:* composing, recording, available, unavailable");
                }
                updates.PRESENCE = value.toLowerCase();
                break;
            case 'autoview':
            case 'auto_view_status':
                updates.AUTO_VIEW_STATUS = value.toLowerCase() === 'on' || value === 'true' ? 'true' : 'false';
                break;
            case 'autolike':
            case 'auto_like_status':
                updates.AUTO_LIKE_STATUS = value.toLowerCase() === 'on' || value === 'true' ? 'true' : 'false';
                break;
            case 'autosave':
            case 'auto_status_saver':
                updates.AUTO_STATUS_SAVER = value.toLowerCase() === 'on' || value === 'true' ? 'true' : 'false';
                break;
            case 'antidelete':
                updates.ANTIDELETE = value.toLowerCase() === 'on' || value === 'true' ? 'true' : 'false';
                break;
            case 'anticall':
                updates.ANTICALL = value.toLowerCase() === 'on' || value === 'true' ? 'true' : 'false';
                break;
            case 'nonbutton':
            case 'non_button':
                updates.NON_BUTTON = value.toLowerCase() === 'on' || value === 'true' ? true : false;
                break;
            default:
                return reply("❌ *Unknown field!*\nTry: `.set prefix !`");
        }

        for (const [key, value] of Object.entries(updates)) {
            await input(key, value);
        }
        reply(`✅ *Setting updated!*\n\n*${field}* → ${value}\n\n_Bot will apply changes immediately._`);

    } catch (e) {
        console.error(e);
        reply(`❌ Error: ${e.message}`);
    }
});

cmd(
    {
        pattern: "getconfig",
        alias: ["config", "botconfig", "currentsettings"],
        desc: "View all current bot settings",
        category: "settings",
        react: "📋",
        use: ".getconfig",
        filename: __filename
    },
    async (manaofc, mek, m, { from, reply, isOwner, config }) => {
        try {
            if (!isOwner) {
                return reply("❌ *Only owner can use this command!*");
            }

            const botNumber = manaofc.user.id.split(":")[0].split("@")[0];

            let configText = "";

            configText += `🤖 *${config.BOT_NAME}*\n\n`;
            configText += "📋 *CURRENT BOT CONFIGURATION* 📋\n\n";
            configText += `🔢 *Bot Number:* ${botNumber}\n`;
            configText += `⏰ *Time:* ${getSriLankaTimestamp()}\n\n`;
            configText += "*╭━━━━━━━✧༺♥༻✧━━━━━━━*\n";
            configText += `*╎ 🔧 WORK_TYPE:* ${(config.WORK_TYPE || "public").toUpperCase()}\n`;
            configText += `*╎ 🎭 PRESENCE:* ${config.PRESENCE ? config.PRESENCE.toUpperCase() : "AVAILABLE"}\n`;
            configText += `*╎ 👁️ AUTO_VIEW_STATUS:* ${config.AUTO_VIEW_STATUS === "true" ? "✅ ON" : "❌ OFF"}\n`;
            configText += `*╎ 🛟 AUTO_LIKE_STATUS:* ${config.AUTO_LIKE_STATUS === "true" ? "✅ ON" : "❌ OFF"}\n`;
            configText += `*╎ 📱 AUTO_STATUS_SAVER:* ${config.AUTO_STATUS_SAVER === "true" ? "✅ ON" : "❌ OFF"}\n`;
            configText += `*╎ 📞 ANTICALL:* ${config.ANTICALL === "true" ? "✅ ON" : "❌ OFF"}\n`;
            configText += `*╎ 🗑️ ANTIDELETE:* ${config.ANTIDELETE === "true" ? "✅ ON" : "❌ OFF"}\n`;
            configText += `*╎ 🔤 PREFIX:* ${config.PREFIX || "."}\n`;
            configText += `*╎ 🎨 LIKE_EMOJIS:* ${Array.isArray(config.AUTO_LIKE_EMOJI) ? config.AUTO_LIKE_EMOJI.join(" ") : (config.AUTO_LIKE_EMOJI || "❤️")}\n`;
            configText += `*╎ 🔘 NON_BUTTON:* ${config.NON_BUTTON === true ? "✅ ON (Text Mode)" : "❌ OFF (Button Mode)"}\n`;
            configText += "*╰━━━━━━━✧༺♥༻✧━━━━━━━*";

            await manaofc.sendMessage(
                from,
                {
                    image: {
                        url: config.IMAGE_PATH
                    },
                    caption: configText
                },
                {
                    quoted: mek
                }
            );

        } catch (e) {
            console.error("[GETCONFIG ERROR]:", e);
            reply(`❌ Error: ${e.message}`);
        }
    });

//====================================
//========= MAIN COMMANDS ============
//====================================

cmd({
    pattern: "menu",
    react: "📃",
    alias: ["panel", "list", "commands"],
    desc: "Get bot's command list.",
    category: "main",
    use: '.menu',
    filename: __filename
},
async (manaofc, mek, m, { from, prefix, pushname, reply, config }) => {
    try {
        const buttons = [
            { buttonId: prefix + 'downmenu', buttonText: { displayText: 'DOWNLOAD MENU' }, type: 1 },
            { buttonId: prefix + 'ownermenu', buttonText: { displayText: 'OWNER MENU' }, type: 1 },
            { buttonId: prefix + 'searchmenu', buttonText: { displayText: 'SEARCH MENU' }, type: 1 },
            { buttonId: prefix + 'convertmenu', buttonText: { displayText: 'CONVERT MENU' }, type: 1 },
            { buttonId: prefix + 'toolsmenu', buttonText: { displayText: 'TOOLS MENU' }, type: 1 },
            { buttonId: prefix + 'othersmenu', buttonText: { displayText: 'OTHERS MENU' }, type: 1 },
            { buttonId: prefix + 'moviemenu', buttonText: { displayText: 'MOVIE MENU' }, type: 1 },
            { buttonId: prefix + 'aimenu', buttonText: { displayText: 'AI MENU' }, type: 1 },
            { buttonId: prefix + 'logomenu', buttonText: { displayText: 'LOGO MENU' }, type: 1 },
            { buttonId: prefix + 'mainmenu', buttonText: { displayText: 'MAIN MENU' }, type: 1 },
        ]
        const buttonMessage = {
            image: config.IMAGE_PATH,
            caption: `*👋 Hello ${pushname}*

*╭━━━━━━━✧༺♥༻✧━━━━━━━*
*│◈ ᴏᴡɴᴇʀ : manaofc*
*│◈ ᴠᴇʀꜱɪᴏɴ : ${version}*
*│◈ ʀᴜɴᴛɪᴍᴇ : ${runtime(process.uptime())}*
*│◈ ʀᴀᴍ ᴜꜱᴀɢᴇ : ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${Math.round(require('os').totalmem / 1024 / 1024)}MB*
*╰━━━━━━━✧༺♥༻✧━━━━━━━*
`,
            footer: config.FOOTER,
            buttons: buttons,
            headerType: 4
        }
        return await manaofc.buttonMessage(from, buttonMessage, mek)
    } catch (e) {
        reply('*Error !!*')
        console.log(e)
    }
})

// Helper for menu category commands
function buildCategoryMenu(category, titleEmoji, title, config) {
    let menuc = `*${titleEmoji} ${config.BOT_NAME} ${title}. ${titleEmoji}*\n\n`
    for (let i = 0; i < commands.length; i++) {
        if (commands[i].category === category) {
            if (!commands[i].dontAddCommandList) {
                menuc += `*╭━━━━━━━✧༺♥༻✧━━━━━━━*
*╎🔖Command :* ${commands[i].pattern}
*╎🏷️Desc :* ${commands[i].desc}
*╎ 🧧Use:* ${commands[i].use}
*╰━━━━━━━✧༺♥༻✧━━━━━━━*\n\n`
            }
        }
    }
    return menuc;
}

// ============================================
// DOWNLOAD MENU
// ============================================
cmd({
    pattern: "downmenu",
    react: "📥",
    dontAddCommandList: true,
    filename: __filename
},
async (manaofc, mek, m, { from, prefix, command, reply, config }) => {
    try {
        const menuc = buildCategoryMenu('download', '📥', 'DOWNLOAD MENU', config);
        let generatebutton = [{
            buttonId: `${prefix}ping`,
            buttonText: { displayText: 'GET BOT\'S PING' },
            type: 1
        }]
        let buttonMessaged = {
            image: config.IMAGE_PATH,
            caption: menuc,
            footer: config.FOOTER,
            headerType: 4,
            buttons: generatebutton
        };
        return await manaofc.buttonMessage(from, buttonMessaged, mek);
    } catch (e) {
        reply('*ERROR !!*')
        console.log(e)
    }
})

//=================================
//====== OWNER MENU ===============
//===================================
cmd({
    pattern: "ownermenu",
    react: "🗣️",
    dontAddCommandList: true,
    filename: __filename
},
async (manaofc, mek, m, { from, prefix, command, reply, config }) => {
    try {
        const menuc = buildCategoryMenu('owner', '🗣️', 'OWNER MENU', config);
        let generatebutton = [{
            buttonId: `${prefix}ping`,
            buttonText: { displayText: 'GET BOT\'S PING' },
            type: 1
        }]
        let buttonMessaged = {
            image: config.IMAGE_PATH,
            caption: menuc,
            footer: config.FOOTER,
            headerType: 4,
            buttons: generatebutton
        };
        return await manaofc.buttonMessage(from, buttonMessaged, mek);
    } catch (e) {
        reply('*ERROR !!*')
        console.log(e)
    }
})

// ============================================
// SEARCH MENU
// ============================================
cmd({
    pattern: "searchmenu",
    react: "🔍",
    dontAddCommandList: true,
    filename: __filename
},
async (manaofc, mek, m, { from, prefix, command, reply, config }) => {
    try {
        const menuc = buildCategoryMenu('search', '🔍', 'SEARCH MENU', config);
        let generatebutton = [{
            buttonId: `${prefix}ping`,
            buttonText: { displayText: 'GET BOT\'S PING' },
            type: 1
        }]
        let buttonMessaged = {
            image: config.IMAGE_PATH,
            caption: menuc,
            footer: config.FOOTER,
            headerType: 4,
            buttons: generatebutton
        };
        return await manaofc.buttonMessage(from, buttonMessaged, mek);
    } catch (e) {
        reply('*ERROR !!*')
        console.log(e)
    }
})

// ============================================
// CONVERT MENU
// ============================================
cmd({
    pattern: "convertmenu",
    react: "🔄",
    dontAddCommandList: true,
    filename: __filename
},
async (manaofc, mek, m, { from, prefix, command, reply, config }) => {
    try {
        const menuc = buildCategoryMenu('convert', '🔄', 'CONVERT MENU', config);
        let generatebutton = [{
            buttonId: `${prefix}ping`,
            buttonText: { displayText: 'GET BOT\'S PING' },
            type: 1
        }]
        let buttonMessaged = {
            image: config.IMAGE_PATH,
            caption: menuc,
            footer: config.FOOTER,
            headerType: 4,
            buttons: generatebutton
        };
        return await manaofc.buttonMessage(from, buttonMessaged, mek);
    } catch (e) {
        reply('*ERROR !!*')
        console.log(e)
    }
})

// ============================================
// TOOLS MENU
// ============================================
cmd({
    pattern: "toolsmenu",
    react: "🔧",
    dontAddCommandList: true,
    filename: __filename
},
async (manaofc, mek, m, { from, prefix, command, reply, config }) => {
    try {
        const menuc = buildCategoryMenu('tools', '🔧', 'TOOLS MENU', config);
        let generatebutton = [{
            buttonId: `${prefix}ping`,
            buttonText: { displayText: 'GET BOT\'S PING' },
            type: 1
        }]
        let buttonMessaged = {
            image: config.IMAGE_PATH,
            caption: menuc,
            footer: config.FOOTER,
            headerType: 4,
            buttons: generatebutton
        };
        return await manaofc.buttonMessage(from, buttonMessaged, mek);
    } catch (e) {
        reply('*ERROR !!*')
        console.log(e)
    }
})

// ============================================
// OTHERS MENU
// ============================================
cmd({
    pattern: "othersmenu",
    react: "🎐",
    dontAddCommandList: true,
    filename: __filename
},
async (manaofc, mek, m, { from, prefix, command, reply, config }) => {
    try {
        const menuc = buildCategoryMenu('others', '🎐', 'OTHER MENU', config);
        let generatebutton = [{
            buttonId: `${prefix}ping`,
            buttonText: { displayText: 'GET BOT\'S PING' },
            type: 1
        }]
        let buttonMessaged = {
            image: config.IMAGE_PATH,
            caption: menuc,
            footer: config.FOOTER,
            headerType: 4,
            buttons: generatebutton
        };
        return await manaofc.buttonMessage(from, buttonMessaged, mek);
    } catch (e) {
        reply('*ERROR !!*')
        console.log(e)
    }
})

// ============================================
// MOVIE MENU
// ============================================
cmd({
    pattern: "moviemenu",
    react: "🎬",
    dontAddCommandList: true,
    filename: __filename
},
async (manaofc, mek, m, { from, prefix, command, reply, config }) => {
    try {
        const menuc = buildCategoryMenu('movie', '🎬', 'MOVIE MENU', config);
        let generatebutton = [{
            buttonId: `${prefix}ping`,
            buttonText: { displayText: 'GET BOT\'S PING' },
            type: 1
        }]
        let buttonMessaged = {
            image: config.IMAGE_PATH,
            caption: menuc,
            footer: config.FOOTER,
            headerType: 4,
            buttons: generatebutton
        };
        return await manaofc.buttonMessage(from, buttonMessaged, mek);
    } catch (e) {
        reply('*ERROR !!*')
        console.log(e)
    }
})

// ============================================
// AI MENU
// ============================================
cmd({
    pattern: "aimenu",
    react: "🤖",
    dontAddCommandList: true,
    filename: __filename
},
async (manaofc, mek, m, { from, prefix, command, reply, config }) => {
    try {
        const menuc = buildCategoryMenu('ai', '🤖', 'AI MENU', config);
        let generatebutton = [{
            buttonId: `${prefix}ping`,
            buttonText: { displayText: 'GET BOT\'S PING' },
            type: 1
        }]
        let buttonMessaged = {
            image: config.IMAGE_PATH,
            caption: menuc,
            footer: config.FOOTER,
            headerType: 4,
            buttons: generatebutton
        };
        return await manaofc.buttonMessage(from, buttonMessaged, mek);
    } catch (e) {
        reply('*ERROR !!*')
        console.log(e)
    }
})

// ============================================
// LOGO MENU
// ============================================
cmd({
    pattern: "logomenu",
    react: "🎨",
    dontAddCommandList: true,
    filename: __filename
},
async (manaofc, mek, m, { from, prefix, command, reply, config }) => {
    try {
        const menuc = buildCategoryMenu('logo', '🎨', 'LOGO MENU', config);
        let generatebutton = [{
            buttonId: `${prefix}ping`,
            buttonText: { displayText: 'GET BOT\'S PING' },
            type: 1
        }]
        let buttonMessaged = {
            image: config.IMAGE_PATH,
            caption: menuc,
            footer: config.FOOTER,
            headerType: 4,
            buttons: generatebutton
        };
        return await manaofc.buttonMessage(from, buttonMessaged, mek);
    } catch (e) {
        reply('*ERROR !!*')
        console.log(e)
    }
})

// ============================================
// MAIN MENU
// ============================================
cmd({
    pattern: "mainmenu",
    react: "🏠",
    dontAddCommandList: true,
    filename: __filename
},
async (manaofc, mek, m, { from, prefix, command, reply, config }) => {
    try {
        const menuc = buildCategoryMenu('main', '🏠', 'MAIN MENU', config);
        let generatebutton = [{
            buttonId: `${prefix}ping`,
            buttonText: { displayText: 'GET BOT\'S PING' },
            type: 1
        }]
        let buttonMessaged = {
            image: config.IMAGE_PATH,
            caption: menuc,
            footer: config.FOOTER,
            headerType: 4,
            buttons: generatebutton
        };
        return await manaofc.buttonMessage(from, buttonMessaged, mek);
    } catch (e) {
        reply('*ERROR !!*')
        console.log(e)
    }
})

// system command
cmd({
    pattern: "system",
    react: "🎑",
    alias: ["os", "cpu"],
    desc: "Check bot's system info",
    category: "main",
    use: '.system',
    filename: __filename
},
async (manaofc, mek, m, { from, reply, config }) => {
    try {
        let totalStorage = Math.floor(os.totalmem() / 1024 / 1024) + 'MB'
        let freeStorage = Math.floor(os.freemem() / 1024 / 1024) + 'MB'
        let cpuModel = os.cpus()[0].model
        let cpuSpeed = os.cpus()[0].speed / 1000
        let cpuCount = os.cpus().length
        let hostname = os.hostname()

        let mes = `
*⚙️ ${config.BOT_NAME} SYSTEM INFO. ⚙️*

  ◈ *Owner*: manaofc
  ◈ *Version*: ${version}
  ◈ *Runtime*: ${runtime(process.uptime())}
  ◈ *Os Name*: ${hostname}
  ◈ *Total Ram*: ${totalStorage}
  ◈ *Free Ram*: ${freeStorage}
  ◈ *CPU Model*: ${cpuModel}
  ◈ *CPU Speed*: ${cpuSpeed} GHz
  ◈ *CPU Cores*: ${cpuCount} 

${config.FOOTER}`

        await manaofc.sendMessage(from, { image: { url: config.IMAGE_PATH }, caption: mes }, { quoted: mek })

    } catch (e) {
        reply('*Error !!*')
        console.log(e)
    }
})

// ping command
cmd({
    pattern: "ping",
    alias: ["speed", "pong"],
    use: '.ping',
    desc: "Check bot's response time.",
    category: "main",
    react: "⚡",
    filename: __filename
},
async (manaofc, mek, m, { from, quoted, sender, reply, config }) => {
    try {
        const start = Date.now();

        const reactionEmojis = ['🔥', '⚡', '🚀', '💨', '🎯', '🎉', '🌟', '💥', '🕐', '🔹'];
        const textEmojis = ['💎', '🏆', '⚡️', '🚀', '🎶', '🌠', '🌀', '🔱', '🛡️', '✨'];

        const reactionEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
        let textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];

        while (textEmoji === reactionEmoji) {
            textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];
        }

        await manaofc.sendMessage(from, {
            react: { text: textEmoji, key: mek.key }
        });

        const end = Date.now();
        const responseTime = end - start;

        const text = `${config.BOT_NAME}\n\n*╭━━━━━━━✧༺♥༻✧━━━━━━━*\n🏓 *Pong!* ${reactionEmoji}\n⏱️ Response Time: *${responseTime} ms*\n*╰━━━━━━━✧༺♥༻✧━━━━━━━*\n${config.FOOTER}`;

        await manaofc.sendMessage(from, {
            image: { url: config.IMAGE_PATH },
            caption: text
        }, { quoted: mek });

    } catch (e) {
        console.error("Error in ping command:", e);
        reply("An error occurred: " + e.message);
    }
});

// owner command 
cmd({
    pattern: "owner",
    desc: "Display owner contact information.",
    react: "🌝",
    use: ".owner",
    category: "main",
    filename: __filename
},
async (manaofc, mek, m, { from, reply }) => {
    try {
        const vcard =
            'BEGIN:VCARD\n' +
            'VERSION:3.0\n' +
            'FN:MANAOFC\n' +
            'ORG:MANAOFC\n' +
            'TEL;type=CELL;type=VOICE;waid=94759934522:+94759934522\n' +
            'EMAIL:manishasasmith27@gmail.com\n' +
            'END:VCARD';

        await manaofc.sendMessage(from, {
            contacts: {
                displayName: "manaofc",
                contacts: [{ vcard }]
            },
            quoted: mek
        });
    } catch (e) {
        console.error(e);
        reply('⚠️ An error occurred while fetching owner information.');
    }
});

// ========== DOWNLOAD COMMANDS ==========
//============== IMAGE DOWNLOAD ===========
cmd({
    pattern: "pinterest",
    react: '🖼️',
    alias: ["pinterestdl"],
    desc: "Search for related pics on Pinterest.",
    category: "download",
    use: '.pinterest <query>',
    filename: __filename
}, async (manaofc, mek, m, { from, q, reply, config }) => {
    try {
        if (!q) return await reply("*Please provide a search query!*");

        const res = await fetch('https://allstars-apis.vercel.app/pinterest?search=' + encodeURIComponent(q));
        const result = await res.json();

        const data = result.data;

        if (!data || data.length === 0) {
            return await reply("*No images found!*");
        }

        for (let i = 0; i < Math.min(data.length, 7); i++) {
            await manaofc.sendMessage(from, {
                image: { url: data[i] },
                caption: config.FOOTER
            }, { quoted: mek });
        }
    } catch (e) {
        await reply("*Error fetching images!*");
        console.log(e);
    }
});

/* ================== SONG SEARCH ================== */
cmd(
    {
        pattern: "song",
        react: "🎵",
        alias: ["music", "yt"],
        category: "download",
        use: ".song <Song Name or YouTube URL>",
        filename: __filename,
    },
    async (manaofc, mek, m, { from, prefix, q, reply, config }) => {
        try {
            if (!q) return reply("❌ *Please provide a song name or YouTube URL!*");

            const search = await yts(q);
            if (!search.videos || search.videos.length === 0) {
                return reply("⚠️ *No song results found!*");
            }

            const song = search.videos[0];

            const caption = `*🎶 ${config.BOT_NAME} SONG DOWNLOAD.📥*
      *╭━━━━━━━✧༺♥༻✧━━━━━━━*
      │✨ \`Title\` : ${song.title}
      │⏰ \`Duration\` : ${song.timestamp}
      │👀 \`Views\` : ${song.views}
      │ 📅 ‍ \`Uploaded\` : ${song.ago}
      │ 📺 ‍ \`Channel\` : ${song.author?.name || "Unknown"}
      *╰━━━━━━━✧༺♥༻✧━━━━━━━*`;

            const buttons = [
                {
                    buttonId: `${prefix}yta ${song.url}`,
                    buttonText: { displayText: "AUDIO TYPE 🎙" },
                    type: 1,
                },
                {
                    buttonId: `${prefix}ytd ${song.url}`,
                    buttonText: { displayText: "DOCUMENT TYPE 📁" },
                    type: 1,
                },
            ];

            const buttonMessage = {
                image: { url: song.thumbnail },
                caption: caption,
                footer: config.FOOTER,
                buttons: buttons,
                headerType: 4,
            };

            await manaofc.buttonMessage(from, buttonMessage, mek);

        } catch (e) {
            console.log(e);
            reply("❌ *An error occurred while searching!*");
        }
    }
);

/* ================== AUDIO DOWNLOAD ================== */
cmd(
    {
        pattern: "yta",
        react: "⬇️",
        dontAddCommandList: true,
        filename: __filename,
    },
    async (manaofc, mek, m, { from, q, reply, config }) => {
        try {
            if (!q) return reply("❌ *Need a YouTube URL!*");

            await manaofc.sendMessage(from, {
                react: { text: "⬇️", key: mek.key },
            });

            const res = await fetch(
                "https://manaofc-api.vercel.app/yt/mp3?url=" + encodeURIComponent(q)
            );

            const yta = await res.json();

            if (!yta.status || !yta.download_url) {
                return reply("❌ *Failed to fetch audio!*");
            }

            await manaofc.sendMessage(
                from,
                {
                    audio: { url: yta.download_url },
                    mimetype: "audio/mpeg",
                    ptt: false,
                },
                { quoted: mek }
            );

            await manaofc.sendMessage(from, {
                react: { text: "✔️", key: mek.key },
            });

        } catch (e) {
            console.log(e);
            reply("❌ *Audio download failed!*");
        }
    }
);

/* ================== DOCUMENT DOWNLOAD ================== */
cmd(
    {
        pattern: "ytd",
        react: "⬇️",
        dontAddCommandList: true,
        filename: __filename,
    },
    async (manaofc, mek, m, { from, q, reply, config }) => {
        try {
            if (!q) return reply("❌ *Need a YouTube URL!*");

            await manaofc.sendMessage(from, {
                react: { text: "⬇️", key: mek.key },
            });

            const res = await fetch(
                "https://manaofc-api.vercel.app/yt/mp3?url=" + encodeURIComponent(q)
            );

            const yta = await res.json();

            if (!yta.status || !yta.download_url) {
                return reply("❌ *Failed to fetch document link!*");
            }

            await manaofc.sendMessage(
                from,
                {
                    document: { url: yta.download_url },
                    mimetype: "audio/mpeg",
                    fileName: yta.title + ".mp3",
                    caption: "🎵 *" + yta.title + "*",
                },
                { quoted: mek }
            );

            await manaofc.sendMessage(from, {
                react: { text: "✔️", key: mek.key },
            });

        } catch (e) {
            console.log(e);
            reply("❌ *Document download failed!*");
        }
    }
);

/* ================== VIDEO SEARCH ================== */
cmd(
    {
        pattern: "video",
        react: "🎦",
        alias: ["ytmp4"],
        category: "download",
        use: ".video <Video Name or YouTube URL>",
        filename: __filename,
    },
    async (manaofc, mek, m, { from, prefix, q, reply, config }) => {
        try {
            if (!q) return reply("❌ Please provide a song name or YouTube URL!");
            const search = await yts(q);
            if (!search.videos || search.videos.length === 0) {
                return reply("⚠️ No video results found!");
            }
            const video = search.videos[0];
            const caption = `*🎦 ${config.BOT_NAME} VIDEO DOWNLOAD.📥*\n*╭━━━━━━━✧༺♥༻✧━━━━━━━*\n│✨ \`Title\` : ${video.title}\n│⏰ \`Duration\` : ${video.timestamp}\n│👀 \`Views\` : ${video.views}\n│ 📅 ‍ \`Uploaded\` : ${video.ago}\n│ 📺 ‍ \`Channel\` : ${video.author?.name || "Unknown"}\n╰━━━━━━━✧༺♥༻✧━━━━━━━`;
            const buttons = [
                {
                    buttonId: `${prefix}ytq ${video.url}`,
                    buttonText: { displayText: "VIDEO QUALITY 📊" },
                    type: 1,
                }
            ];
            const buttonMessage = {
                image: { url: video.thumbnail },
                caption: caption,
                footer: config.FOOTER,
                buttons: buttons,
                headerType: 4,
            };
            await manaofc.buttonMessage(from, buttonMessage, mek);
        } catch (e) {
            console.log(e);
            reply("❌ An error occurred while searching!");
        }
    }
);

/* ================== VIDEO DOWNLOAD (Quality Selector) ================== */
cmd(
    {
        pattern: "ytq",
        react: "📹",
        dontAddCommandList: true,
        filename: __filename,
    },
    async (manaofc, mek, m, { from, prefix, q, reply, config }) => {
        try {
            if (!q) return reply("❌ Need a YouTube URL!");

            // Get video ID from YouTube URL
            let videoId = "";
            const patterns = [
                /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
                /youtube\.com\/shorts\/([^&\s?]+)/,
            ];
            for (const p of patterns) {
                const match = q.match(p);
                if (match) { videoId = match[1]; break; }
            }

            const thumbnail = videoId ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` : null;

            // Show thumbnail
            if (thumbnail) {
                await manaofc.sendMessage(from, {
                    image: { url: thumbnail },
                    caption: `*🎬 Video Found!*\n\n🔗 ${q}\n\n👇 *Select the quality you need:*`,
                }, { quoted: mek });
            }

            // Quality list message
            const qualities = [
                { q: "144", title: "144p 🥔", desc: "Low quality, small size" },
                { q: "360", title: "360p 📱", desc: "Standard quality" },
                { q: "480", title: "480p 💻", desc: "Good quality" },
                { q: "720", title: "720p 🖥️", desc: "HD quality" },
                { q: "1080", title: "1080p 🎬", desc: "Full HD quality" },
            ];

            const listMessage = {
                text: thumbnail ? "*👇 Select quality:*" : `*🎬 Video Downloader*\n\n🔗 ${q}\n\n*👇 Select quality:*`,
                footer: config.FOOTER,
                title: "*📥 Quality Selector*",
                buttonText: "View Qualities 📊",
                sections: [{
                    title: "Available Qualities",
                    rows: qualities.map(item => ({
                        title: item.title,
                        rowId: `${prefix}ytvdl ${q}|${item.q}`,
                        description: item.desc,
                    })),
                }],
            };

            await manaofc.listMessage(from, listMessage, mek);

        } catch (e) {
            console.log(e);
            reply("❌ *Error showing quality options!*");
        }
    }
);

/* ================== VIDEO DOWNLOAD (Actual Download) ================== */
cmd(
    {
        pattern: "ytvdl",
        react: "⬇️",
        dontAddCommandList: true,
        filename: __filename,
    },
    async (manaofc, mek, m, { from, q, reply, config }) => {
        try {
            if (!q || !q.includes("|")) {
                return reply("❌ Invalid format! Use: .ytvdl <url>|<quality>");
            }

            const parts = q.split("|");
            const url = parts[0];
            const quality = parts[1];

            if (!url || !quality) {
                return reply("❌ Invalid format! Use: .ytvdl <url>|<quality>");
            }

            await manaofc.sendMessage(from, {
                react: { text: "⬇️", key: mek.key },
            });

            // Send a request to the API
            const res = await fetch(
                `https://manaofc-api.vercel.app/yt/mp4?url=${encodeURIComponent(url)}&quality=${quality}`
            );

            const ytd = await res.json();

            if (!ytd.status || !ytd.download_url) {
                return reply("❌ *Failed to fetch video!*\n\nCannot get video for this quality. Try another quality.");
            }

            // Send video (inline video)
            await manaofc.sendMessage(
                from,
                {
                    video: { url: ytd.download_url },
                    mimetype: "video/mp4",
                    caption: `*🎬 ${ytd.title || "Video"}*\n📊 Quality: ${quality}p\n✅ Downloaded via ${config.BOT_NAME}`,
                },
                { quoted: mek }
            );

            // ✅ Add reaction
            await manaofc.sendMessage(from, {
                react: { text: "✔️", key: mek.key },
            });

        } catch (e) {
            console.log(e);
            reply("❌ *Video download failed!*");
        }
    }
);

/* ================== FACEBOOK VIDEO DOWNLOADER ================== */
cmd(
    {
        pattern: "fb",
        react: "📘",
        alias: ["facebook", "fbdl"],
        category: "download",
        use: ".fb <Facebook Video URL>",
        filename: __filename,
    },
    async (manaofc, mek, m, { from, q, reply }) => {
        try {
            if (!q) return reply("❌ *Need a Facebook URL!*");

            await manaofc.sendMessage(from, {
                react: { text: "⬇️", key: mek.key },
            });

            const res = await fetch(
                `https://apis.davidcyriltech.my.id/facebook?url=${encodeURIComponent(q)}`
            );

            const json = await res.json();

            if (!json.success || !json.result?.downloads) {
                return reply("❌ *Failed to fetch video!*");
            }

            const fb = json.result;
            const hdUrl = fb.downloads?.hd?.url;
            const sdUrl = fb.downloads?.sd?.url;

            // 📈 පළමුව HD quality එක යවනවා
            if (hdUrl) {
                await manaofc.sendMessage(
                    from,
                    {
                        video: { url: hdUrl },
                        caption: `📈 *HD Quality*\n📘 *${fb.title?.replace(/\r\n/g, " ") || "Facebook Video"}*`,
                    },
                    { quoted: mek }
                );
            }
            // 📉 HD නැත්නම් SD quality එකට fallback වෙනවා
            else if (sdUrl) {
                await manaofc.sendMessage(
                    from,
                    {
                        video: { url: sdUrl },
                        caption: `📉 *SD Quality*\n📘 *${fb.title?.replace(/\r\n/g, " ") || "Facebook Video"}*`,
                    },
                    { quoted: mek }
                );
            } else {
                return reply("❌ *No download links found!*");
            }

            await manaofc.sendMessage(from, {
                react: { text: "✔️", key: mek.key },
            });

        } catch (e) {
            console.log(e);
            reply("❌ *HD video download failed!*");
        }
    }
);

/* ================== TIKTOK COMMAND ================== */
cmd(
    {
        pattern: "tiktok",
        react: "🎵",
        alias: ["tt", "tik"],
        category: "download",
        use: ".tiktok <TikTok URL>",
        filename: __filename,
    },
    async (manaofc, mek, m, { from, prefix, q, reply, config }) => {
        try {
            if (!q) return reply("❌ *Please provide a TikTok URL!*");

            const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/tiktok?url=${encodeURIComponent(q)}`;
            const res = await fetch(apiUrl);
            const data = await res.json();

            if (!data.status || !data.data) {
                return reply("⚠️ *Failed to fetch TikTok video!*");
            }

            const tt = data.data;

            const caption = `*🎵 ${config.BOT_NAME} TIKTOK DOWNLOAD.📥*
      *╭━━━━━━━✧༺♥༻✧━━━━━━━*
      │✨ \`Title\` : ${tt.title || "No title"}
      │👤 \`Author\` : ${tt.author?.nickname || "Unknown"}
      │⏰ \`Duration\` : ${tt.duration || "N/A"}s
      │👀 \`Views\` : ${tt.view || 0}
      │💬 \`Comments\` : ${tt.comment || 0}
      │▶️ \`Plays\` : ${tt.play || 0}
      │🔗 \`Shares\` : ${tt.share || 0}
      *╰━━━━━━━✧༺♥༻✧━━━━━━━*`;

            const buttons = [
                {
                    buttonId: `${prefix}ttv ${q}`,
                    buttonText: { displayText: "VIDEO TYPE 🎥" },
                    type: 1,
                },
                {
                    buttonId: `${prefix}tta ${q}`,
                    buttonText: { displayText: "AUDIO TYPE 🎙" },
                    type: 1,
                },
            ];

            const buttonMessage = {
                image: { url: tt.thumbnail },
                caption: caption,
                footer: config.FOOTER,
                buttons: buttons,
                headerType: 4,
            };

            await manaofc.buttonMessage(from, buttonMessage, mek);

        } catch (e) {
            console.log(e);
            reply("❌ *An error occurred while fetching TikTok video!*");
        }
    }
);

/* ================== TIKTOK VIDEO DOWNLOAD ================== */
cmd(
    {
        pattern: "ttv",
        react: "⬇️",
        dontAddCommandList: true,
        filename: __filename,
    },
    async (manaofc, mek, m, { from, q, reply }) => {
        try {
            if (!q) return reply("❌ *Need a TikTok URL!*");

            await manaofc.sendMessage(from, {
                react: { text: "⬇️", key: mek.key },
            });

            const res = await fetch(
                `https://api-aswin-sparky.koyeb.app/api/downloader/tiktok?url=${encodeURIComponent(q)}`
            );

            const data = await res.json();

            if (!data.status || !data.data?.video) {
                return reply("❌ *Failed to fetch video!*");
            }

            await manaofc.sendMessage(
                from,
                {
                    video: { url: data.data.video },
                    caption: `🎥 *${data.data.title || "TikTok Video"}*`,
                },
                { quoted: mek }
            );

            await manaofc.sendMessage(from, {
                react: { text: "✔️", key: mek.key },
            });

        } catch (e) {
            console.log(e);
            reply("❌ *Video download failed!*");
        }
    }
);

/* ================== TIKTOK AUDIO DOWNLOAD ================== */
cmd(
    {
        pattern: "tta",
        react: "⬇️",
        dontAddCommandList: true,
        filename: __filename,
    },
    async (manaofc, mek, m, { from, q, reply }) => {
        try {
            if (!q) return reply("❌ *Need a TikTok URL!*");

            await manaofc.sendMessage(from, {
                react: { text: "⬇️", key: mek.key },
            });

            const res = await fetch(
                `https://api-aswin-sparky.koyeb.app/api/downloader/tiktok?url=${encodeURIComponent(q)}`
            );

            const data = await res.json();

            if (!data.status || !data.data?.audio) {
                return reply("❌ *Failed to fetch audio!*");
            }

            await manaofc.sendMessage(
                from,
                {
                    audio: { url: data.data.audio },
                    mimetype: "audio/mpeg",
                    ptt: false,
                },
                { quoted: mek }
            );

            await manaofc.sendMessage(from, {
                react: { text: "✔️", key: mek.key },
            });

        } catch (e) {
            console.log(e);
            reply("❌ *Audio download failed!*");
        }
    }
);

// ============================================
// AN1 SEARCH COMMAND
// ============================================
cmd(
    {
        pattern: "an1",
        react: "🎮",
        alias: ["mod", "an1search"],
        category: "download",
        use: ".an1 *<App Name>*",
        filename: __filename,
    },
    async (manaofc, mek, m, { from, prefix, q, reply, config }) => {
        try {
            if (!q) return await reply("*Please provide a game/app name!*\n\nExample: `.an1 freefire`");

            await manaofc.sendMessage(from, { react: { text: "🔍", key: mek.key } });

            const response = await fetch(
                "https://manaofc-api.vercel.app/an1/search?q=" + encodeURIComponent(q)
            );

            const res = await response.json();

            if (!res.results || res.results.length < 1) {
                return await reply("*❌ No results found on AN1!*");
            }

            const data = res.results;

            const rows = data.slice(0, 10).map((v) => ({
                buttonId: prefix + "dan1 " + v.link,
                buttonText: {
                    displayText: v.title.length > 30 ? "🎮 " + v.title.slice(0, 27) + "..." : "🎮 " + v.title
                },
                type: 1,
            }));

            const buttonMessage = {
                image: config.IMAGE_PATH,
                caption: `*🔰 ${config.BOT_NAME} AN1 SEARCH*`,
                footer: config.FOOTER,
                buttons: rows,
                headerType: 4,
            };

            return await manaofc.buttonMessage(from, buttonMessage, mek);

        } catch (e) {
            console.error(e);
            await reply("*ERROR !!* " + e.message);
        }
    }
);

// ============================================
// DAN1 DOWNLOAD COMMAND (AUTO DOCUMENT SEND)
// ============================================
cmd(
    {
        pattern: "dan1",
        react: "📥",
        dontAddCommandList: true,
        filename: __filename,
    },
    async (manaofc, mek, m, { from, q, reply, config }) => {
        try {
            if (!q) return await reply("*❌ Please provide an AN1 URL!*");

            await manaofc.sendMessage(from, { react: { text: "⬇️", key: mek.key } });

            const response = await fetch(
                "https://manaofc-api.vercel.app/an1/download?url=" + encodeURIComponent(q)
            );

            const app = await response.json();

            if (!app.directDownloadUrl) {
                return await reply("*❌ Download link not available!*\n\n*Error:* " + (app.message || "Unknown error"));
            }

            await manaofc.sendMessage(from, {
                image: { url: app.icon },
                caption: "*╭━━━━━━━✧༺♥༻✧━━━━━━━*\n*📦 Downloading " + app.title + "...*\n\n" +
                    "*Version:* " + app.version + "\n" +
                    "*Size:* " + app.size + "\n" +
                    "*Developer:* " + app.developer + "\n" +
                    "*╰━━━━━━━✧༺♥༻✧━━━━━━━*\n\n" +
                    "⏳ *Sending APK file...*"
            }, { quoted: mek });

            await delay(1000);

            await manaofc.sendMessage(from, {
                document: { url: app.directDownloadUrl },
                mimetype: "application/vnd.android.package-archive",
                fileName: app.title.replace(/[^a-zA-Z0-9]/g, "_") + "_v" + app.version + ".apk",
                caption: `${config.FOOTER}`
            }, { quoted: mek });

            await manaofc.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (e) {
            console.error(e);
            await reply("*❌ ERROR !!*\n\n" + e.message);
        }
    }
);

// ========== XNXX DOWNLOAD ==========
const BASE_LINK = "https://manaofc-api.vercel.app";

cmd({
    pattern: "xnxx",
    desc: "Download XNXX Video",
    use: ".xnxx <query>",
    react: "🔞",
    category: "download",
    filename: __filename
},
async (manaofc, mek, m, { from, prefix, q, reply, config }) => {
    try {
        if (!q) return reply("*Please enter a query!*");

        const response = await fetch(
            BASE_LINK + "/xnxx/search?q=" + encodeURIComponent(q));

        const res = await response.json();

        if (!res.status || !res.result || res.result.length < 1) {
            return reply("*❌ No results found!*");
        }

        const rows = res.result.slice(0, 10).map((v) => ({
            buttonId: prefix + "xnxxvid " + v.url,
            buttonText: {
                displayText:
                    v.title.length > 40
                        ? v.title.slice(0, 37) + "..."
                        : v.title
            },
            type: 1
        }));

        const buttonMessage = {
            image: "https://files.catbox.moe/rnn9bf.jpeg",
            caption: `*🔞 ${config.BOT_NAME} XNXX SEARCH*`,
            footer: config.FOOTER,
            buttons: rows,
            headerType: 4
        };

        await manaofc.buttonMessage(from, buttonMessage, mek);

    } catch (e) {
        console.log(e);
        reply("*❌ Error occurred!*");
    }
});

cmd({
    pattern: "xnxxvid",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
},
async (manaofc, mek, m, { from, q, reply, config }) => {
    try {
        if (!q) return reply("*Need a video url!*");

        const response = await fetch(
            BASE_LINK + "/xnxx/details?url=" + encodeURIComponent(q)
        );

        const res = await response.json();

        if (!res.status || !res.result) {
            return reply("*❌ Failed to fetch video!*");
        }

        const data = res.result;

        let caption = "*╭━━━━━━━✧༺♥༻✧━━━━━━━*\n*🔞 XNXX VIDEO DOWNLOAD*\n🎬 Title: " + data.title + "\n⏱ Duration: " + data.duration + "\n👀 Views: " + data.views + "\n👍 Likes: " + data.likes + "\n⭐ Rating: " + data.rating + "\n💬 Comments: " + data.comments + "\n*╰━━━━━━━✧༺♥༻✧━━━━━━━*";

        await manaofc.sendMessage(from, {
            image: { url: data.thumbnail },
            caption
        }, { quoted: mek });

        await manaofc.sendMessage(from, {
            video: { url: data.dlink },
            mimetype: "video/mp4"
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply("*❌ Download failed!*");
    }
});

//=============================================
// XVIDEO DOWNLOAD
//=============================================
cmd({
    pattern: "xvideo",
    desc: "Search and download XVIDEO",
    use: ".xvideo <query>",
    react: "🔞",
    category: "download",
    filename: __filename
},
async (manaofc, mek, m, { from, prefix, q, reply, config }) => {
    try {
        if (!q) return reply("❌ Please enter a search query!\n\nExample: `.xvideo mom and son`");

        const response = await fetch(
            `https://manaofc-api.vercel.app/xvideos/search?q=${encodeURIComponent(q)}`
        );

        const res = await response.json();

        if (!res.status || !res.result || res.result.length < 1) {
            return reply("*❌ No results found!*");
        }

        const rows = res.result.slice(0, 10).map((v) => {
            const displayTitle = v.title && v.title.length > 40
                ? v.title.slice(0, 37) + "..."
                : (v.title || "Unknown");

            const videoUrl = v.url || v.link || "";

            return {
                buttonId: `${prefix}xvdo ${videoUrl}`,
                buttonText: { displayText: displayTitle },
                type: 1
            };
        });

        // FIX: unterminated template literal (missing closing backtick)
        const buttonMessage = {
            image: "https://files.catbox.moe/97o88i.png",
            caption: `*🔞 ${config.BOT_NAME} XVIDEO SEARCH*`,
            footer: config.FOOTER,
            buttons: rows,
            headerType: 4
        };

        await manaofc.buttonMessage(from, buttonMessage, mek);

    } catch (e) {
        console.error("XVIDEO Search Error:", e);
        reply("*❌ Error occurred while searching!*");
    }
});

cmd({
    pattern: "xvdo",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
},
async (manaofc, mek, m, { from, q, reply, config }) => {
    try {
        if (!q) return reply("❌ Need a video URL!\n\nUse `.xvideo <query>` first.");

        await reply("⬇️ *Downloading video...*");

        const response = await fetch(
            `https://manaofc-api.vercel.app/xvideos/download?url=${encodeURIComponent(q)}`
        );

        const res = await response.json();

        if (!res.status || !res.result) {
            return reply("*❌ Failed to fetch video details!*");
        }

        const data = res.result;

        let caption = `*╭━━━━━━━✧༺♥༻✧━━━━━━━*\n` +
            `*🔞 XVIDEO DOWNLOAD*\n` +
            `🎬 *Title:* ${data.title || "N/A"}\n` +
            `👀 *Views:* ${data.views || "N/A"}\n` +
            `⏱️ *Duration:* ${data.duration || "N/A"}\n` +
            `*╰━━━━━━━✧༺♥༻✧━━━━━━━*`;

        if (data.thumbnail) {
            await manaofc.sendMessage(from, {
                image: { url: data.thumbnail },
                caption: caption
            }, { quoted: mek });
        } else {
            await reply(caption);
        }

        const downloadUrl = data.dlink || data.url || null;

        if (downloadUrl) {
            await manaofc.sendMessage(from, {
                video: { url: downloadUrl },
                mimetype: "video/mp4",
                caption: `📥 *Download Complete*`
            }, { quoted: mek });
        } else {
            reply("*❌ Download URL not available!*\n\nVideo details fetched but download link is empty.");
        }

    } catch (e) {
        console.error("XVIDEO Download Error:", e);
        reply("*❌ Download failed! Please try again.*");
    }
});

// ============================================
// SINHALASUB SEARCH 
// ============================================
cmd(
    {
        pattern: "sinhalasub",
        react: "🎬",
        alias: ["ssub", "ssubsearch"],
        category: "movie",
        use: ".sinhalasub <movie name>",
        filename: __filename,
    },
    async (manaofc, mek, m, { from, prefix, q, reply, config }) => {
        try {
            if (!q) return reply("❌ *Please provide a movie name!*\n\n*Example:* .sinhalasub avatar");

            await manaofc.sendMessage(from, {
                react: { text: "🔍", key: mek.key },
            });

            const api = await fetch("https://manaofc-api.vercel.app/sinhalasub/search?q=" + encodeURIComponent(q));

            const res = await api.json();

            if (!res.status || !res.data || res.data.length === 0) {
                return reply("❌ *No movies found for your search!*");
            }

            const rows = res.data.slice(0, 10).map((v) => ({
                buttonId: prefix + "ssinfo " + v.url,
                buttonText: {
                    displayText: v.title.length > 40 ? v.title.slice(0, 37) + "..." : v.title
                },
                type: 1
            }));

            const buttonMessage = {
                image: "https://files.catbox.moe/nsshzm.jpeg",
                caption: `*🎬 ${config.BOT_NAME} SINHALASUB SEARCH* `,
                footer: config.FOOTER,
                buttons: rows,
                headerType: 4
            };

            await manaofc.buttonMessage(from, buttonMessage, mek);

            await manaofc.sendMessage(from, {
                react: { text: "✅", key: mek.key },
            });

        } catch (e) {
            console.log(e);
            reply("❌ *An error occurred while searching!*");
        }
    }
);

// ============================================
// SINHALASUB INFO 
// ============================================
cmd(
    {
        pattern: "ssinfo",
        react: "📋",
        dontAddCommandList: true,
        filename: __filename,
    },
    async (manaofc, mek, m, { from, prefix, q, reply, config }) => {
        try {
            if (!q) return reply("❌ *Need a movie link!*");

            await manaofc.sendMessage(from, {
                react: { text: "⏳", key: mek.key },
            });

            const api = await fetch("https://manaofc-api.vercel.app/sinhalasub/info?url=" + encodeURIComponent(q));
            const res = await api.json();

            if (!res.status || !res.data) {
                return reply("❌ *Failed to get movie info!*");
            }

            const data = res.data;

            const caption = `*╭━━━━━━━✧༺♥༻✧━━━━━━━*\n*🎬 ${data.title}*\n\n` +
                `*📅 Year:* ${data.year || "N/A"}\n` +
                `*⏱️ Duration:* ${data.duration || "N/A"}\n` +
                `*⭐ IMDB:* ${data.imdb || "N/A"}\n` +
                `*🗣️ Language:* ${data.language || "N/A"}\n` +
                `*🌍 Country:* ${data.country || "N/A"}\n` +
                `*🎬 Directors:* ${(Array.isArray(data.directors) ? data.directors.join(", ") : data.directors) || "N/A"}\n` +
                `*🌟 Stars:* ${(Array.isArray(data.stars) ? data.stars.join(", ") : data.stars) || "N/A"}\n` +
                `*🎞️ Genres:* ${(Array.isArray(data.genres) ? data.genres.join(", ") : data.genres) || "N/A"}\n` +
                `*╰━━━━━━━✧༺♥༻✧━━━━━━━*`;

            const buttons = data.links.map((dl) => ({
                buttonId: prefix + "ssdown " + dl.pageLink,
                buttonText: { displayText: dl.quality + " (" + dl.size + ")" },
                type: 1
            }));

            const buttonMessage = {
                image: { url: data.thumbnail },
                caption: caption,
                footer: config.FOOTER,
                buttons: buttons,
                headerType: 4
            };

            await manaofc.buttonMessage(from, buttonMessage, mek);

            await manaofc.sendMessage(from, {
                react: { text: "✅", key: mek.key },
            });

        } catch (e) {
            console.log(e);
            reply("❌ *Failed to get movie info!*");
        }
    }
);

// ============================================
// SINHALASUB DOWNLOAD 
// ============================================
cmd(
    {
        pattern: "ssdown",
        react: "📁",
        dontAddCommandList: true,
        filename: __filename,
    },
    async (manaofc, mek, m, { from, q, reply, config }) => {
        try {
            if (!q) return reply("❌ *Need a download link!*");

            await manaofc.sendMessage(from, {
                react: { text: "⬇️", key: mek.key },
            });

            const api = await fetch("https://manaofc-api.vercel.app/sinhalasub/download?url=" + encodeURIComponent(q));
            const res = await api.json();

            if (!res.status || !res.data) {
                return reply("❌ *Failed to get download link!*");
            }

            const data = res.data;
            const downloadUrl = data.directUrl || data.pixeldrainUrl;

            await manaofc.sendMessage(
                from,
                {
                    document: { url: downloadUrl },
                    mimetype: "video/mp4",
                    fileName: data.title + ".mp4",
                },
                { quoted: mek }
            );

            await manaofc.sendMessage(from, {
                react: { text: "✅", key: mek.key },
            });

        } catch (e) {
            console.log(e);
            reply("❌ *Download failed!*");
        }
    }
);

// ============================================
// CINESUBZ SEARCH 
// ============================================
cmd(
    {
        pattern: "cinesubz",
        react: "🎬",
        alias: ["cs", "movie"],
        category: "movie",
        use: ".cinesubz <movie name>",
        filename: __filename,
    },
    async (manaofc, mek, m, { from, prefix, q, reply, config }) => {
        try {
            if (!q) return reply("❌ *Please provide a movie name!*\n\n*Example:* .cinesubz deadpool");

            await manaofc.sendMessage(from, {
                react: { text: "🔍", key: mek.key },
            });

            const api = await fetch("https://api-dark-shan-yt.koyeb.app/movie/cinesubz-search?q=" + encodeURIComponent(q) + "&apikey=afb95c4d7db5cd8a");

            const res = await api.json();

            if (!res.status || !res.data || res.data.length === 0) {
                return reply("❌ *No movies found for your search!*");
            }

            const rows = res.data.slice(0, 10).map((v) => ({
                buttonId: prefix + "cinfo " + v.link,
                buttonText: {
                    displayText: v.title.length > 40 ? v.title.slice(0, 37) + "..." : v.title
                },
                type: 1
            }));

            const buttonMessage = {
                image: "https://files.catbox.moe/57a24d.jpeg",
                caption: `*🎬 ${config.BOT_NAME} CINESUBZ SEARCH* `,
                footer: config.FOOTER,
                buttons: rows,
                headerType: 4
            };

            await manaofc.buttonMessage(from, buttonMessage, mek);

            await manaofc.sendMessage(from, {
                react: { text: "✅", key: mek.key },
            });

        } catch (e) {
            console.log(e);
            reply("❌ *An error occurred while searching!*");
        }
    }
);

// ============================================
// CINESUBZ INFO 
// ============================================
cmd(
    {
        pattern: "cinfo",
        react: "📋",
        dontAddCommandList: true,
        filename: __filename,
    },
    async (manaofc, mek, m, { from, prefix, q, reply, config }) => {
        try {
            if (!q) return reply("❌ *Need a movie link!*");

            await manaofc.sendMessage(from, {
                react: { text: "⏳", key: mek.key },
            });

            const api = await fetch("https://api-dark-shan-yt.koyeb.app/movie/cinesubz-info?url=" + encodeURIComponent(q) + "&apikey=afb95c4d7db5cd8a");

            const res = await api.json();

            if (!res.status || !res.data) {
                return reply("❌ *Failed to get movie info!*");
            }

            const data = res.data;

            const caption = `*╭━━━━━━━✧༺♥༻✧━━━━━━━*\n*🎬 ${data.title}*\n\n` +
                `*📅 Year:* ${data.year || "N/A"}\n` +
                `*⏱️ Duration:* ${data.duration || "N/A"}\n` +
                `*⭐ Rating:* ${data.rating || "N/A"}\n` +
                `*🎞️ Quality:* ${data.quality || "N/A"}\n` +
                `*🗣️ Language:* ${data.tag || "N/A"}\n` +
                `*🌍 Country:* ${data.country || "N/A"}\n` +
                `*🎬 Directors:* ${(data.directors || "N/A").replace("Director:", "")}\n` +
                `*🌟 Stars:* ${data.stars || "N/A"}\n` +
                `*╰━━━━━━━✧༺♥༻✧━━━━━━━*`;

            const buttons = data.downloads.map((dl) => ({
                buttonId: prefix + "cdown " + dl.link,
                buttonText: { displayText: dl.quality + " (" + dl.size + ")" },
                type: 1
            }));

            const buttonMessage = {
                image: { url: data.image },
                caption: caption,
                footer: config.FOOTER,
                buttons: buttons,
                headerType: 4
            };

            await manaofc.buttonMessage(from, buttonMessage, mek);

            await manaofc.sendMessage(from, {
                react: { text: "✅", key: mek.key },
            });

        } catch (e) {
            console.log(e);
            reply("❌ *Failed to get movie info!*");
        }
    }
);

// ============================================
// CINESUBZ DOWNLOAD 
// ============================================
cmd(
    {
        pattern: "cdown",
        react: "📁",
        dontAddCommandList: true,
        filename: __filename,
    },
    async (manaofc, mek, m, { from, q, reply, config }) => {
        try {
            if (!q) return reply("❌ *Need a download link!*");

            await manaofc.sendMessage(from, {
                react: { text: "⬇️", key: mek.key },
            });

            const api = await fetch("https://api-dark-shan-yt.koyeb.app/movie/cinesubz-download?url=" + encodeURIComponent(q) + "&apikey=afb95c4d7db5cd8a");
            const res = await api.json();

            if (!res.status || !res.data || !res.data.download || res.data.download.length === 0) {
                return reply("❌ *Failed to get download link!*");
            }

            const data = res.data;
            const downloadUrl = data.download[0].url;

            await manaofc.sendMessage(
                from,
                {
                    document: { url: downloadUrl },
                    mimetype: "video/mp4",
                    fileName: data.title,
                },
                { quoted: mek }
            );

            await manaofc.sendMessage(from, {
                react: { text: "✅", key: mek.key },
            });

        } catch (e) {
            console.log(e);
            reply("❌ *Download failed!*");
        }
    }
);

// ============================================
// SINHALACARTOONS SEARCH
// ============================================
cmd(
    {
        pattern: "sinhalacartoons",
        react: "📺",
        alias: ["sc", "cartoon"],
        category: "movie",
        use: ".sinhalacartoons <cartoon name>",
        filename: __filename,
    },
    async (manaofc, mek, m, { from, prefix, q, reply, config }) => {
        try {
            if (!q) return reply("❌ *Please provide a cartoon name!*\n\n*Example:* .sinhalacartoons smurfs");

            await manaofc.sendMessage(from, {
                react: { text: "🔍", key: mek.key },
            });

            const api = await fetch("https://manaofc-api.vercel.app/sinhalacartoons/search?q=" + encodeURIComponent(q));
            const res = await api.json();

            if (!res.results || res.results.length === 0) {
                return reply("❌ *No cartoons found for your search!*");
            }

            const rows = res.results.slice(0, 10).map((v) => ({
                buttonId: prefix + "scinfo " + v.link,
                buttonText: {
                    displayText: v.title.length > 40 ? v.title.slice(0, 37) + "..." : v.title
                },
                type: 1
            }));

            const buttonMessage = {
                image: "https://files.catbox.moe/z2u40j.png",
                caption: `*📺 ${config.BOT_NAME} SINHALACARTOONS SEARCH*`,
                footer: config.FOOTER,
                buttons: rows,
                headerType: 4
            };

            await manaofc.buttonMessage(from, buttonMessage, mek);

            await manaofc.sendMessage(from, {
                react: { text: "✅", key: mek.key },
            });

        } catch (e) {
            console.log(e);
            reply("❌ *An error occurred while searching!*");
        }
    }
);

// ============================================
// SINHALACARTOONS INFO
// ============================================
cmd(
    {
        pattern: "scinfo",
        react: "📋",
        dontAddCommandList: true,
        filename: __filename,
    },
    async (manaofc, mek, m, { from, prefix, q, reply, config }) => {
        try {
            if (!q) return reply("❌ *Need a cartoon link!*");

            await manaofc.sendMessage(from, {
                react: { text: "⏳", key: mek.key },
            });

            const api = await fetch("https://manaofc-api.vercel.app/sinhalacartoons/info?url=" + encodeURIComponent(q));
            const res = await api.json();

            if (!res.title) {
                return reply("❌ *Failed to get cartoon info!*");
            }

            const data = res;
            const desc = data.content ? (data.content.length > 300 ? data.content.slice(0, 300) + "..." : data.content) : "No description available.";

            const caption = `*╭━━━━━━━✧༺♥༻✧━━━━━━━*\n*📺 ${data.title}*\n\n` +
                `*📅 Date:* ${data.date ? new Date(data.date).toLocaleDateString() : "N/A"}\n` +
                `*👤 Author:* ${data.author || "N/A"}\n` +
                `*📂 Category:* ${data.category || "N/A"}\n` +
                `*╰━━━━━━━✧༺♥༻✧━━━━━━━*`;

            const buttons = [{
                buttonId: prefix + "scdown " + encodeURIComponent(data.url),
                buttonText: { displayText: "📥 Get Download" },
                type: 1
            }];

            const buttonMessage = {
                image: { url: data.featuredImage },
                caption: caption,
                footer: config.FOOTER,
                buttons: buttons,
                headerType: 4
            };

            await manaofc.buttonMessage(from, buttonMessage, mek);

            await manaofc.sendMessage(from, {
                react: { text: "✅", key: mek.key },
            });

        } catch (e) {
            console.log(e);
            reply("❌ *Failed to get cartoon info!*");
        }
    }
);

// ============================================
// SINHALACARTOONS DOWNLOAD (List Episodes)
// ============================================
cmd(
    {
        pattern: "scdown",
        react: "📁",
        dontAddCommandList: true,
        filename: __filename,
    },
    async (manaofc, mek, m, { from, prefix, q, reply, config }) => {
        try {
            if (!q) return reply("❌ *Need a cartoon URL!*");

            await manaofc.sendMessage(from, {
                react: { text: "⬇️", key: mek.key },
            });

            const postUrl = decodeURIComponent(q);
            const api = await fetch("https://manaofc-api.vercel.app/sinhalacartoons/download?url=" + encodeURIComponent(postUrl));
            const res = await api.json();

            if (!res.downloadLinks || res.downloadLinks.length === 0) {
                return reply("❌ *Failed to get download links!*");
            }

            // Get only direct links, ignore telegram
            const directLinkObj = res.downloadLinks.find(dl => dl.type === "direct");

            if (!directLinkObj || !directLinkObj.directUrls || directLinkObj.directUrls.length === 0) {
                return reply("❌ *No direct download links found!*");
            }

            const episodes = directLinkObj.directUrls;

            // Build list rows (each episode = one row)
            const rows = episodes.map((url, index) => {
                const fileName = url.split('/').pop() || `Episode ${index + 1}`;
                return {
                    title: `📀 ${fileName}`,
                    description: `Click to download ${fileName}`,
                    rowId: prefix + "scget " + index + " " + encodeURIComponent(postUrl)
                };
            });

            const sections = [{
                title: "Available Episodes",
                rows: rows
            }];

            const listMessage = {
                text: `*📥 ${res.title}*\n\n*Total Episodes:* ${episodes.length}\n\nSelect the list below to download:`,
                footer: config.FOOTER,
                title: res.title.length > 50 ? res.title.slice(0, 47) + "..." : res.title,
                buttonText: "📂 View Episodes",
                sections: sections
            };

            await manaofc.listMessage(from, listMessage, mek);

            await manaofc.sendMessage(from, {
                react: { text: "✅", key: mek.key },
            });

        } catch (e) {
            console.log(e);
            reply("❌ *Failed to get download links!*");
        }
    }
);

// ============================================
// SINHALACARTOONS GET FILE (Send Episode)
// ============================================
cmd(
    {
        pattern: "scget",
        react: "📤",
        dontAddCommandList: true,
        filename: __filename,
    },
    async (manaofc, mek, m, { from, q, reply }) => {
        try {
            if (!q) return reply("❌ *Need download parameters!*");

            const parts = q.split(" ");
            const index = parseInt(parts[0]);
            const postUrl = decodeURIComponent(parts.slice(1).join(" "));

            if (isNaN(index) || !postUrl) return reply("❌ *Invalid download parameters!*");

            await manaofc.sendMessage(from, {
                react: { text: "⬆️", key: mek.key },
            });

            const api = await fetch("https://manaofc-api.vercel.app/sinhalacartoons/download?url=" + encodeURIComponent(postUrl));
            const res = await api.json();

            if (!res.downloadLinks) {
                return reply("❌ *Failed to fetch download links!*");
            }

            const directLinkObj = res.downloadLinks.find(dl => dl.type === "direct");

            if (!directLinkObj || !directLinkObj.directUrls || !directLinkObj.directUrls[index]) {
                return reply("❌ *Episode not found!*");
            }

            const downloadUrl = directLinkObj.directUrls[index];
            const fileName = downloadUrl.split('/').pop() || "episode.mp4";

            await manaofc.sendMessage(
                from,
                {
                    document: { url: downloadUrl },
                    mimetype: "video/mp4",
                    fileName: fileName,
                },
                { quoted: mek }
            );

            await manaofc.sendMessage(from, {
                react: { text: "✅", key: mek.key },
            });

        } catch (e) {
            console.log(e);
            reply("❌ *Download failed!*");
        }
    }
);

// ============================================
// ZOOM SEARCH COMMAND
// ============================================
cmd({
    pattern: "zoom",
    desc: "Search Sinhala subtitles from Zoom.lk",
    use: ".zoom <movie name>",
    react: "📝",
    category: "movie",
    filename: __filename
},
async (manaofc, mek, m, { from, prefix, q, reply, config }) => {
    try {
        if (!q) return reply("*🔍 Please enter a movie name!*\n\nExample: `.zoom avatar`");

        const response = await fetch(
            "https://manaofc-api.vercel.app/zoom/search?q=" + encodeURIComponent(q)
        );

        const res = await response.json();

        if (!res.results || res.results.length < 1) {
            return reply("*❌ No results found!*");
        }

        const rows = res.results.slice(0, 10).map((v) => ({
            buttonId: prefix + "dzoom " + v.link,
            buttonText: {
                displayText: v.title.length > 40 ? v.title.slice(0, 37) + "..." : v.title
            },
            type: 1
        }));

        const buttonMessage = {
            image: "https://files.catbox.moe/higob5.png",
            caption: `*📝 ${config.BOT_NAME} ZOOM*`,
            footer: config.FOOTER,
            buttons: rows,
            headerType: 4
        };

        await manaofc.buttonMessage(from, buttonMessage, mek);

    } catch (e) {
        console.log(e);
        reply("*❌ Error occurred while searching!*");
    }
});

// ============================================
// ZOOM DOWNLOAD COMMAND (AUTO DOCUMENT SEND)
// ============================================
cmd({
    pattern: "dzoom",
    desc: "Download Sinhala subtitle from Zoom.lk",
    react: "⬇️",
    dontAddCommandList: true,
    filename: __filename
},
async (manaofc, mek, m, { from, q, reply, config }) => {
    try {
        if (!q) return reply("*Need a post URL!*");

        const response = await fetch(
            "https://manaofc-api.vercel.app/zoom/post?url=" + encodeURIComponent(q)
        );

        const res = await response.json();

        if (!res.title || !res.downloadLink) {
            return reply("*❌ Failed to get subtitle info!*");
        }

        const cleanTitle = res.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_");
        const fileName = cleanTitle + ".srt";

        const infoCaption = "*╭━━━━━━━✧༺♥༻✧━━━━━━━*\n*📝 Subtitle Info*\n\n" +
            "*Title:* " + res.title + "\n" +
            "*Author:* " + (res.author || "N/A") + "\n" +
            "*Views:* " + (res.view || "N/A") + "\n" +
            "*Hits:* " + (res.downloadHits || "N/A") + "\n" +
            "*╰━━━━━━━✧༺♥༻✧━━━━━━━*\n\n" +
            "*⬇️ Downloading subtitle...*";

        await manaofc.sendMessage(from, { text: infoCaption }, { quoted: mek });

        try {
            await manaofc.sendMessage(from, {
                document: { url: res.downloadLink },
                mimetype: "application/x-subrip",
                fileName: fileName,
                caption: "*✅ " + res.title + "*\n*📥 " + (res.downloadHits || "") + "*"
            }, { quoted: mek });

        } catch (downloadError) {
            console.log("Download failed:", downloadError);

            await manaofc.sendMessage(from, {
                text: "*❌ Direct download failed!*\n\n" +
                    "*Title:* " + res.title + "\n" +
                    "*Download Link:* " + res.downloadLink + "\n\n" +
                    "Please download manually."
            }, { quoted: mek });
        }

    } catch (e) {
        console.log(e);
        reply("*❌ Error occurred!*");
    }
});

//=====================================
// ========== OWNER COMMANDS ==========
//=====================================

// BROADCAST MESSAGE
cmd({
    pattern: "broadcast",
    react: "📢",
    alias: ["bc", "cast"],
    desc: "Broadcast message to all chats",
    category: "owner",
    use: ".broadcast <message>",
    filename: __filename
},
async (manaofc, mek, m, { from, isOwner, reply, q, config }) => {
    try {
        if (!isOwner) return reply("❌ *Only owner can use this!*");
        if (!q) return reply("❌ *Provide a message to broadcast!*");

        const chats = await manaofc.groupFetchAllParticipating();
        const groups = Object.values(chats);

        let count = 0;
        for (let group of groups) {
            await manaofc.sendMessage(group.id, { text: `*📢 BROADCAST*\n\n${q}` });
            count++;
            await delay(500);
        }

        reply(`✅ *Broadcast sent to ${count} groups!*`);

    } catch (e) {
        console.error(e);
        reply("❌ *Broadcast failed!*");
    }
});

// LEAVE GROUP
cmd({
    pattern: "leave",
    react: "👋",
    desc: "Leave current group",
    category: "owner",
    use: ".leave",
    filename: __filename
},
async (manaofc, mek, m, { from, isGroup, isOwner, reply, config }) => {
    try {
        if (!isOwner) return reply("❌ *Only owner can use this!*");
        if (!isGroup) return reply("❌ *This is not a group!*");

        await reply("👋 *Leaving group...*");
        await delay(1000);
        await manaofc.groupLeave(from);

    } catch (e) {
        console.error(e);
        reply("❌ *Error!*");
    }
});

// BLOCK USER
cmd({
    pattern: "block",
    react: "🚫",
    desc: "Block a user",
    category: "owner",
    use: ".block @user or reply",
    filename: __filename
},
async (manaofc, mek, m, { from, isOwner, reply, config }) => {
    try {
        if (!isOwner) return reply("❌ *Only owner can use this!*");

        // FIX: raw mek has no mentionedJid - use parsed m.mentionUser
        let users = (m.mentionUser && m.mentionUser[0]) || (m.quoted ? m.quoted.sender : null);
        if (!users) return reply("❌ *Mention or reply to a user!*");

        await manaofc.updateBlockStatus(users, "block");
        reply(`🚫 *Blocked @${users.split('@')[0]}*`);

    } catch (e) {
        console.error(e);
        reply("❌ *Failed to block user!*");
    }
});

// UNBLOCK USER
cmd({
    pattern: "unblock",
    react: "✅",
    desc: "Unblock a user",
    category: "owner",
    use: ".unblock @user or reply",
    filename: __filename
},
async (manaofc, mek, m, { from, isOwner, reply, config }) => {
    try {
        if (!isOwner) return reply("❌ *Only owner can use this!*");

        // FIX: raw mek has no mentionedJid - use parsed m.mentionUser
        let users = (m.mentionUser && m.mentionUser[0]) || (m.quoted ? m.quoted.sender : null);
        if (!users) return reply("❌ *Mention or reply to a user!*");

        await manaofc.updateBlockStatus(users, "unblock");
        reply(`✅ *Unblocked @${users.split('@')[0]}*`);

    } catch (e) {
        console.error(e);
        reply("❌ *Failed to unblock user!*");
    }
});

// SET BOT BIO/ABOUT
cmd({
    pattern: "setbio",
    react: "📝",
    desc: "Set bot status/bio",
    category: "owner",
    use: ".setbio <text>",
    filename: __filename
},
async (manaofc, mek, m, { from, isOwner, reply, q, config }) => {
    try {
        if (!isOwner) return reply("❌ *Only owner can use this!*");
        if (!q) return reply("❌ *Provide a bio text!*");

        await manaofc.updateProfileStatus(q);
        reply(`✅ *Bio updated to:* ${q}`);

    } catch (e) {
        console.error(e);
        reply("❌ *Failed to update bio!*");
    }
});

// SET BOT NAME
cmd({
    pattern: "setname",
    react: "✏️",
    desc: "Set bot profile name",
    category: "owner",
    use: ".setname <name>",
    filename: __filename
},
async (manaofc, mek, m, { from, isOwner, reply, q, config }) => {
    try {
        if (!isOwner) return reply("❌ *Only owner can use this!*");
        if (!q) return reply("❌ *Provide a name!*");

        await manaofc.updateProfileName(q);
        reply(`✅ *Profile name updated to:* ${q}`);

    } catch (e) {
        console.error(e);
        reply("❌ *Failed to update name!*");
    }
});

//===================================
//====== AI COMMANDS ================
//===================================

// ========== GROQ AI ==========
cmd({
    pattern: "groq",
    react: '🤖',
    alias: ["groqai"],
    desc: "Chat with Groq AI",
    category: "ai",
    use: '.groq <question>',
    filename: __filename
}, async (manaofc, mek, m, { from, q, reply, config }) => {
    try {
        if (!q) return await reply("❓ *Please ask me something!*\n\nExample: `.groq hi`");

        await manaofc.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        const res = await fetch('https://manaofc-api.vercel.app/ai/groq?q=' + encodeURIComponent(q));
        const result = await res.json();

        if (!result.success || !result.message) {
            return await reply("❌ *Failed to get response from Groq AI.*");
        }

        const text = `🤖 *Groq AI* (${result.model})\n\n${result.message}\n\n${config.FOOTER || ''}`;

        await manaofc.sendMessage(from, { text }, { quoted: mek });
        await manaofc.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        await reply("❌ *Error:* " + e.message);
        console.log(e);
    }
});

// ========== SAMBANOVA AI ==========
cmd({
    pattern: "sambanova",
    react: '⚡',
    alias: ["samba", "snova"],
    desc: "Chat with Sambanova AI",
    category: "ai",
    use: '.sambanova <question>',
    filename: __filename
}, async (manaofc, mek, m, { from, q, reply, config }) => {
    try {
        if (!q) return await reply("❓ *Please ask me something!*\n\nExample: `.sambanova hi`");

        await manaofc.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        const res = await fetch('https://manaofc-api.vercel.app/ai/sambanova?q=' + encodeURIComponent(q));
        const result = await res.json();

        if (!result.success || !result.message) {
            return await reply("❌ *Failed to get response from Sambanova AI.*");
        }

        const text = `⚡ *Sambanova AI* (${result.model})\n\n${result.message}\n\n${config.FOOTER || ''}`;

        await manaofc.sendMessage(from, { text }, { quoted: mek });
        await manaofc.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        await reply("❌ *Error:* " + e.message);
        console.log(e);
    }
});

// ========== MISTRAL AI ==========
cmd({
    pattern: "mistral",
    react: '🌊',
    alias: ["mistralai"],
    desc: "Chat with Mistral AI",
    category: "ai",
    use: '.mistral <question>',
    filename: __filename
}, async (manaofc, mek, m, { from, q, reply, config }) => {
    try {
        if (!q) return await reply("❓ *Please ask me something!*\n\nExample: `.mistral hi`");

        await manaofc.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        const res = await fetch('https://manaofc-api.vercel.app/ai/mistral?q=' + encodeURIComponent(q));
        const result = await res.json();

        if (!result.success || !result.message) {
            return await reply("❌ *Failed to get response from Mistral AI.*");
        }

        const text = `🌊 *Mistral AI* (${result.model})\n\n${result.message}\n\n${config.FOOTER || ''}`;

        await manaofc.sendMessage(from, { text }, { quoted: mek });
        await manaofc.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        await reply("❌ *Error:* " + e.message);
        console.log(e);
    }
});

//=====================================
// ========== SEARCH COMMAND ==========
//=====================================
const isUrl = (url) => {
    return url.match(
        new RegExp(
            /https?:\/\/(www\.)?[-a-zA-Z0-9@:%.+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%+.~#?&/=]*)/,
            'gi'
        )
    )
}

function ytreg(url) {
    const ytIdRegex = /(?:http(?:s|):\/\/|)(?:(?:www\.|)youtube(?:\-nocookie|)\.com\/(?:watch\?.*(?:|\&)v=|embed|shorts\/|v\/)|youtu\.be\/)([-_0-9A-Za-z]{11})/
    return ytIdRegex.test(url);
}

cmd({
    pattern: "yts",
    alias: ["y"],
    use: '.yts lelena',
    react: "🔎",
    desc: "Search Youtube Songs or Videos.",
    category: "search",
    filename: __filename
},
async (manaofc, mek, m, { from, q, reply, config }) => {
    try {
        if (!q) return await reply("❌ *Please provide a search query!*\n\n*Example:* `.yts lelena`")
        if (isUrl(q) && !ytreg(q)) return await reply("❌ *Invalid YouTube URL!*")

        await manaofc.sendMessage(from, { react: { text: "🔍", key: mek.key } });

        const arama = await yts(q);

        if (!arama || !arama.all || arama.all.length === 0) {
            return await reply("❌ *No results found!*")
        }

        let mesaj = `*🔎 ${config.BOT_NAME} YOUTUBE SEARCH*\n\n`;

        arama.all.slice(0, 10).forEach((video) => {
            mesaj += `*╭━━━━━━━✧༺♥༻✧━━━━━━━*\n`;
            mesaj += `*╎◈ Title :* ${video.title}\n`;
            mesaj += `*╎🔗 Link :* ${video.url}\n`;
            mesaj += `*╎⏱️ Duration :* ${video.timestamp || 'N/A'}\n`;
            mesaj += `*╎👀 Views :* ${video.views || 'N/A'}\n`;
            mesaj += `*╰━━━━━━━✧༺♥༻✧━━━━━━━*\n\n`;
        });

        mesaj += `${config.FOOTER}`;

        await manaofc.sendMessage(from, { text: mesaj }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply('*Error !!*')
    }
});

//====================================
// ========== LOGO COMMANDS ==========
//====================================
const logoStyles = [
    { pattern: "neon", react: "💡", prompt: (text) => `Neon glowing text logo "${text}", cyberpunk style, vibrant neon colors, glowing effect, dark background, high quality, professional logo design` },
    { pattern: "glitch", react: "👾", prompt: (text) => `Glitch effect text logo "${text}", digital distortion, RGB split, cyber glitch art, retro tech style, dark background, high quality` },
    { pattern: "metal", react: "🔩", prompt: (text) => `Metallic 3D text logo "${text}", chrome metal effect, reflective surface, gold and silver, industrial style, professional logo, high quality` },
    { pattern: "firelogo", react: "🔥", prompt: (text) => `Fire and flames text logo "${text}", burning fire effect, orange and red flames, intense heat, dark background, epic style, high quality` },
    { pattern: "graffiti", react: "🎨", prompt: (text) => `Graffiti street art text logo "${text}", colorful spray paint, urban wall art style, hip hop culture, vibrant colors, brick wall background, high quality` },
    { pattern: "logo3d", react: "🧊", prompt: (text) => `3D extruded text logo "${text}", three dimensional depth, shadows and lighting, modern geometric style, clean background, professional logo, high quality render` },
    { pattern: "gaming", react: "🎮", prompt: (text) => `Gaming esports text logo "${text}", aggressive font style, red and black colors, battle royale theme, professional gaming team logo, high quality` },
    { pattern: "devil", react: "😈", prompt: (text) => `Devil demon text logo "${text}", horns and fire, dark evil style, red and black colors, hell theme, scary font, high quality` },
    { pattern: "wolf", react: "🐺", prompt: (text) => `Wolf howling text logo "${text}", wolf silhouette, moon and stars, galaxy background, blue and silver colors, wild nature theme, high quality` },
    { pattern: "joker", react: "🃏", prompt: (text) => `Joker clown text logo "${text}", playing cards, purple and green colors, chaotic madness style, dark gothic theme, high quality` },
    { pattern: "blackpink", react: "💗", prompt: (text) => `Kpop pink neon text logo "${text}", Blackpink style, pink and black colors, girly aesthetic, sparkles and hearts, high quality` },
    { pattern: "cloud", react: "☁️", prompt: (text) => `Cloud sky text logo "${text}", fluffy white clouds, blue sky background, heavenly dreamy style, soft colors, peaceful, high quality` },
    { pattern: "thunder", react: "⚡", prompt: (text) => `Thunder lightning text logo "${text}", electric blue lightning bolts, stormy dark clouds, powerful energy, electric sparks, high quality` },
    { pattern: "blood", react: "🩸", prompt: (text) => `Blood dripping text logo "${text}", horror style, red blood splatter, dark creepy background, scary font, Halloween theme, high quality` },
    { pattern: "sand", react: "🏖️", prompt: (text) => `Sand beach text "${text}", written in wet sand, tropical beach, ocean waves, sunset background, realistic, high quality` },
    { pattern: "coffee", react: "☕", prompt: (text) => `Coffee cup text logo "${text}", latte art style, coffee beans, warm brown colors, cozy cafe aesthetic, steam rising, high quality` },
    { pattern: "christmas", react: "🎄", prompt: (text) => `Christmas holiday text logo "${text}", snowflakes, Christmas tree, red and green colors, festive decorations, winter theme, high quality` },
    { pattern: "love", react: "❤️", prompt: (text) => `Love romantic text logo "${text}", red hearts, roses, pink and red colors, valentine theme, cute aesthetic, high quality` },
    { pattern: "wood", react: "🪵", prompt: (text) => `Wood carved text logo "${text}", engraved in wooden planks, rustic natural style, brown wood texture, forest theme, high quality` },
    { pattern: "galaxy", react: "🌌", prompt: (text) => `Galaxy space text logo "${text}", stars and nebula, purple and blue cosmic colors, universe theme, glowing stars, high quality` },
    { pattern: "retro", react: "📺", prompt: (text) => `Retro vintage text logo "${text}", 80s style, VHS effect, old TV static, neon grid, synthwave colors, nostalgic, high quality` },
    { pattern: "watercolor", react: "🎨", prompt: (text) => `Watercolor paint text logo "${text}", artistic brush strokes, colorful splashes, hand painted style, soft pastel colors, creative art, high quality` },
    { pattern: "gold", react: "🏆", prompt: (text) => `Gold luxury text logo "${text}", golden shiny letters, rich elegant style, diamonds and jewels, black background, premium feel, high quality` },
    { pattern: "ice", react: "🧊", prompt: (text) => `Ice frozen text logo "${text}", crystal ice effect, snowflakes, winter cold theme, blue and white colors, frosty, high quality` },
    { pattern: "ninja", react: "🥷", prompt: (text) => `Ninja warrior text logo "${text}", Japanese katana, shadow silhouette, black and red colors, martial arts theme, stealth, high quality` },
    { pattern: "dragon", react: "🐉", prompt: (text) => `Dragon fire text logo "${text}", mythical dragon, scales and fire, epic fantasy style, gold and red colors, powerful, high quality` },
    { pattern: "anime", react: "🇯🇵", prompt: (text) => `Anime manga text logo "${text}", Japanese anime style, colorful kawaii, cherry blossoms, cute characters, vibrant colors, high quality` },
    { pattern: "skull", react: "💀", prompt: (text) => `Skull skeleton text logo "${text}", skull and crossbones, dark gothic style, bones and graveyard, horror punk theme, high quality` },
];

logoStyles.forEach(style => {
    cmd({
        pattern: style.pattern,
        react: style.react,
        desc: `Create ${style.pattern} style text logo`,
        category: "logo",
        use: `.${style.pattern} <text>`,
        filename: __filename
    },
    async (manaofc, mek, m, { from, q, reply, config }) => {
        try {
            if (!q) return reply(`❌ *Provide text!*\nExample: \`.${style.pattern} MANAOFC\``);

            await manaofc.sendMessage(from, { react: { text: "⏳", key: mek.key } });

            const prompt = style.prompt(q);
            const buffer = await generatePollinationsImage(prompt, { width: 1024, height: 512 });

            await manaofc.sendMessage(from, {
                image: buffer,
                caption: `${style.react} *${style.pattern.charAt(0).toUpperCase() + style.pattern.slice(1)} Logo*\n\nText: ${q}\n${config.FOOTER || '> _*Powered By Manaofc*_'} `
            }, { quoted: mek });

        } catch (e) {
            console.error(e);
            reply(`❌ *Failed to create ${style.pattern} logo!*\n` + e.message);
        }
    });
});

//=================== ANTI-DELETE STORAGE ==================
const baseDir = 'tmp';

if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir);

let tmpCleanerStarted = false;
function startTmpCleaner() {
    if (tmpCleanerStarted) return;
    tmpCleanerStarted = true;
    setInterval(() => {
        try {
            fs.readdirSync(baseDir).forEach(file => {
                const filePath = path.join(baseDir, file);
                if (fs.lstatSync(filePath).isDirectory()) fs.rmSync(filePath, { recursive: true, force: true });
            });
        } catch (e) { }
    }, 3600000);
}

const loadChatData = (remoteJid, messageId) => {
    const chatFilePath = path.join(baseDir, remoteJid, `${messageId}.json`);
    try {
        return JSON.parse(fs.readFileSync(chatFilePath, 'utf8')) || [];
    } catch {
        return [];
    }
};

const saveChatData = (remoteJid, messageId, chatData) => {
    const chatDir = path.join(baseDir, remoteJid);
    if (!fs.existsSync(chatDir)) fs.mkdirSync(chatDir, { recursive: true });
    fs.writeFileSync(path.join(chatDir, `${messageId}.json`), JSON.stringify(chatData, null, 2));
};

const saveMediaFiles = (manaofc, message, messageId, remoteJid) => {
    const mediaDir = path.join(baseDir, remoteJid, 'media');
    if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

    const mediaTypes = {
        imageMessage: 'jpg',
        audioMessage: 'mp3',
        videoMessage: 'mp4',
        stickerMessage: 'webp',
    };

    for (const [type, ext] of Object.entries(mediaTypes)) {
        if (message.message?.[type]) {
            const mediaPath = path.join(mediaDir, `${messageId}.${ext}`);
            // FIX: use downloadMediaMessage (returns a buffer) instead of
            // downloadAndSaveMediaMessage (returns a filename string)
            manaofc.downloadMediaMessage(message)
                .then(mediaBuffer => {
                    if (Buffer.isBuffer(mediaBuffer)) fs.writeFileSync(mediaPath, mediaBuffer);
                })
                .catch(error => console.error(`Error saving ${type}:`, error));
            break;
        }
    }
};

//====================================
//========== CONNECTION ==============
//====================================
async function connectToWA() {
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`manaofc Using WA v${version.join(".")}, isLatest: ${isLatest}`);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const manaofc = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.macOS("safari"),
        syncFullHistory: true,
        auth: state,
        version
    });

    // ---- button / list message helpers (defined ONCE per socket) ----
    // FIX: incomplete ternary operators (? without :) caused SyntaxError
    manaofc.buttonMessage = async (jid, msgData, quotemek) => {
        const NON_BUTTON = (config.NON_BUTTON !== undefined) ? config.NON_BUTTON : false;
        if (!NON_BUTTON) {
            await manaofc.sendMessage(jid, msgData);
        } else {
            let result = "";
            const CMD_ID_MAP = [];
            msgData.buttons.forEach((button, bttnIndex) => {
                const mainNumber = "" + (bttnIndex + 1);
                result += "\n◈ *" + mainNumber + " - " + button.buttonText.displayText + "*";
                CMD_ID_MAP.push({ cmdId: mainNumber, cmd: button.buttonId });
            });
            const cos = "`";
            const buttonMessage = "\n" + (msgData.text || msgData.caption) + "\n\n" +
                "*╭━━━━━━━✧༺♥༻✧━━━━━━━*\n" +
                "*╎*  " + cos + "🔢 Reply Below Number:" + cos + "\n" +
                "*╰━━━━━━━✧༺♥༻✧━━━━━━━*\n" +
                result + "\n\n" + msgData.footer;
            const btnimg = msgData.image ? (typeof msgData.image === 'string' ? { url: msgData.image } : msgData.image) : { url: config.IMAGE_PATH };
            if (msgData.headerType === 1 || msgData.headerType === 4) {
                const imgmsg = await manaofc.sendMessage(
                    jid,
                    { image: btnimg, caption: buttonMessage },
                    { quoted: quotemek }
                );
                await updateCMDStore(imgmsg.key.id, CMD_ID_MAP);
            }
        }
    };

    manaofc.listMessage = async (jid, msgData, quotemek) => {
        const NON_BUTTON = (config.NON_BUTTON !== undefined) ? config.NON_BUTTON : false;
        if (!NON_BUTTON) {
            await manaofc.sendMessage(jid, msgData);
        } else {
            let result = "";
            const CMD_ID_MAP = [];
            msgData.sections.forEach((section, sectionIndex) => {
                const mainNumber = "" + (sectionIndex + 1);
                result += "\n*" + mainNumber + " :* " + section.title + "\n";
                section.rows.forEach((row, rowIndex) => {
                    const subNumber = mainNumber + "." + (rowIndex + 1);
                    const rowHeader = "◦  " + subNumber + " - " + row.title;
                    result += rowHeader + "\n";
                    CMD_ID_MAP.push({ cmdId: subNumber, cmd: row.rowId });
                });
            });
            const cos = "`";
            const listimg = msgData.image ? (typeof msgData.image === 'string' ? { url: msgData.image } : msgData.image) : { url: config.IMAGE_PATH };
            const listMessage = "\n" + msgData.text + "\n\n" +
                "*╭━━━━━━━✧༺♥༻✧━━━━━━━*\n" +
                "*╎*  " + cos + "🔢 Reply Below Number:" + cos + "\n" +
                "*╰━━━━━━━✧༺♥༻✧━━━━━━━*\n\n" +
                result + "\n" + msgData.footer;
            const text = await manaofc.sendMessage(
                jid,
                { image: listimg, caption: listMessage },
                { quoted: quotemek }
            );
            await updateCMDStore(text.key.id, CMD_ID_MAP);
        }
    };

    // ---- media helpers ----
    // FIX: `trueFileName` was assigned without declaration
    manaofc.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
        let quoted = message.msg ? message.msg : message;
        let mime = (message.msg || message).mimetype || "";
        let messageType = message.mtype
            ? message.mtype.replace(/Message/gi, "")
            : mime.split("/")[0];
        const stream = await downloadContentFromMessage(quoted, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        let type = await FileType.fromBuffer(buffer);
        let trueFileName = attachExtension ? filename + "." + type.ext : filename;
        await fs.writeFileSync(trueFileName, buffer);
        return trueFileName;
    };

    manaofc.downloadMediaMessage = async (message) => {
        let mime = (message.msg || message).mimetype || "";
        let messageType = message.mtype
            ? message.mtype.replace(/Message/gi, "")
            : mime.split("/")[0];
        const stream = await downloadContentFromMessage(message, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        return buffer;
    };

    //-------------------------------send file url-------------------------------
    manaofc.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
        let mime = "";
        let res = await axios.head(url);
        mime = res.headers["content-type"];
        if (mime.split("/")[1] === "gif") {
            return manaofc.sendMessage(
                jid,
                {
                    video: await getBuffer(url),
                    caption: caption,
                    gifPlayback: true,
                    ...options,
                },
                { ...options }
            );
        }
        let type = mime.split("/")[0] + "Message";
        if (mime === "application/pdf") {
            return manaofc.sendMessage(
                jid,
                {
                    document: await getBuffer(url),
                    mimetype: "application/pdf",
                    caption: caption,
                    ...options,
                },
                { ...options }
            );
        }
        if (mime.split("/")[0] === "image") {
            return manaofc.sendMessage(
                jid,
                { image: await getBuffer(url), caption: caption, ...options },
                { ...options }
            );
        }
        if (mime.split("/")[0] === "video") {
            return manaofc.sendMessage(
                jid,
                {
                    video: await getBuffer(url),
                    caption: caption,
                    mimetype: "video/mp4",
                    ...options,
                },
                { ...options }
            );
        }
        if (mime.split("/")[0] === "audio") {
            return manaofc.sendMessage(
                jid,
                {
                    audio: await getBuffer(url),
                    caption: caption,
                    mimetype: "audio/mpeg",
                    ...options,
                },
                { ...options }
            );
        }
    };

    // ---- anti-delete helpers ----
    startTmpCleaner();

    const handleIncomingMessage = (message) => {
        const { remoteJid } = message.key;
        let messageId = message.key.id;
        const chatData = loadChatData(remoteJid, messageId);

        if (chatData.some(msg => msg.key.id === messageId)) {
            console.log(`Duplicate message detected for ID: ${messageId}. Replacing the message.`);
            messageId = `${messageId}-${Date.now()}`;
            saveChatData(remoteJid, messageId, [message]);
        } else {
            chatData.push(message);
            saveChatData(remoteJid, messageId, chatData);
        }
        saveMediaFiles(manaofc, message, messageId, remoteJid);
    };

    const handleMessageRevocation = async (revocationMessage) => {
        const remoteJid = revocationMessage.key.remoteJid;
        const messageId = revocationMessage.message.protocolMessage.key.id;
        const chatData = loadChatData(remoteJid, messageId);
        const originalMessage = chatData[0];

        if (originalMessage) {
            const botNumber = manaofc.user.id.split(':')[0];
            const deletedBy = (revocationMessage.key.participant || revocationMessage.participant || revocationMessage.key.remoteJid).split('@')[0];
            const sentBy = (originalMessage.key.participant ?? revocationMessage.key.remoteJid).split('@')[0];
            if (deletedBy.includes(botNumber) || sentBy.includes(botNumber)) return;

            const messageText = originalMessage.message?.conversation || originalMessage.message?.extendedTextMessage?.text || '';
            const destination = config.DELETEMSGSENDTO ? `${config.DELETEMSGSENDTO}@s.whatsapp.net` : remoteJid;
            const mediaDir = path.join(baseDir, remoteJid, 'media');

            const mediaFileTypes = ['.jpg', '.png', '.mp4', '.pdf', '.mp3', '.opus', '.webp'];
            for (const fileType of mediaFileTypes) {
                const mediaFilePath = path.join(mediaDir, `${messageId}${fileType}`);
                if (fs.existsSync(mediaFilePath)) {
                    // FIX: media must be sent as { buffer }, not { url: buffer }
                    const mediaBuffer = fs.readFileSync(mediaFilePath);
                    const caption = `🚫 *This ${fileType.substring(1).toUpperCase()} was deleted !!*\n\n  ➟ *Deleted by:* _${deletedBy}_\n  ➟ *Sent by:* _${sentBy}_\n\n`;

                    const mediaTypeMap = {
                        '.jpg': { image: mediaBuffer, caption },
                        '.png': { image: mediaBuffer, caption },
                        '.mp4': { video: mediaBuffer, caption, mimetype: 'video/mp4' },
                        '.pdf': { document: mediaBuffer, caption, mimetype: 'application/pdf', fileName: `${messageId}.pdf` },
                        '.mp3': { audio: mediaBuffer, caption, mimetype: 'audio/mpeg' },
                        '.opus': { audio: mediaBuffer, caption, mimetype: 'audio/opus' },
                        '.webp': { sticker: mediaBuffer },
                    };

                    await manaofc.sendMessage(destination, mediaTypeMap[fileType]);
                    return;
                }
            }

            await manaofc.sendMessage(destination, {
                text: `🚫 *This message was deleted !!*\n\n  ➟ *Deleted by:* _${deletedBy}_\n  ➟ *Sent by:* _${sentBy}_\n\n> ➟ Message Text: \`\`\`${messageText}\`\`\``,
            });
        } else {
            console.log('Original message not found for revocation.');
        }
    };

    // ---- connection events ----
    // FIX: "ection.update" -> "connection.update", DisectReason -> DisconnectReason,
    // "ectToWA" -> connectToWA
    manaofc.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            if (statusCode !== DisconnectReason.loggedOut) {
                console.log("Connection closed. Reconnecting...");
                setTimeout(connectToWA, 3000);
            } else {
                console.log("Logged out. Please scan QR / re-upload session.");
            }
        } else if (connection === "open") {
            console.log("---------------------------------------------❥❥");
            await connectdb();
            // FIX: function is updateDB(), not updb()
            await updateDB();
            const botNumber = manaofc.user.id.split(':')[0];
            await manaofc.sendMessage(config.OWNER_NUMBER + "@s.whatsapp.net", {
                image: { url: config.IMAGE_PATH },
                caption: `*${config.BOT_NAME}*

*╭━━━━━━━✧༺♥༻✧━━━━━━━*
✅ Successfully Connected!
🔢 Number: ${botNumber}
*╰━━━━━━━✧༺♥༻✧━━━━━━━*

✨ Your bot is now active and ready to use!

📌 Type ${config.PREFIX}menu to view all commands`,
            });
            console.clear();
        }
    });

    manaofc.ev.on("creds.update", saveCreds);

    // ---- incoming messages ----
    manaofc.ev.on("messages.upsert", async (mek) => {
        try {
            mek = mek.messages[0];
            if (!mek || !mek.message) return;
            mek.message =
                getContentType(mek.message) === "ephemeralMessage"
                    ? mek.message.ephemeralMessage.message
                    : mek.message;

            // ============ STATUS BROADCAST MESSAGES ============
            if (mek.key && mek.key.remoteJid === "status@broadcast") {
                try {
                    // FIX: AUTO_READ_STATUS -> AUTO_VIEW_STATUS (matches settings)
                    if (config.AUTO_VIEW_STATUS === "true") {
                        await manaofc.readMessages([mek.key]);
                    }
                    if (isAnti(config.AUTO_REACT_STATUS)) {
                        await manaofc.sendMessage(mek.key.remoteJid,
                            { react: { key: mek.key, text: "☺" } },
                            { statusJidList: [mek.key.participant, manaofc.user.id] }
                        );
                    }
                    if (isAnti(config.AUTO_STATUS_REPLY)) {
                        const user = mek.key.participant;
                        await manaofc.sendMessage(user, { text: "manaofc just now seen" }, { quoted: mek });
                    }
                    if (config.AUTO_STATUS_SAVER === 'true' && config.AUTO_LIKE_STATUS !== undefined) {
                        // Save status media to owner DM
                        const ownerJid = config.OWNER_NUMBER + "@s.whatsapp.net";
                        const mtype = getContentType(mek.message);
                        const buffer = await manaofc.downloadMediaMessage(mek).catch(() => null);
                        if (buffer) {
                            if (mtype === 'imageMessage') await manaofc.sendMessage(ownerJid, { image: buffer, caption: '*💾 Status Saved*' });
                            else if (mtype === 'videoMessage') await manaofc.sendMessage(ownerJid, { video: buffer, caption: '*💾 Status Saved*', mimetype: 'video/mp4' });
                        }
                    }
                } catch (e) { }
                return;
            }

            const m = sms(manaofc, mek);
            const type = getContentType(mek.message);
            const from = mek.key.remoteJid;
            const isGroup = from.endsWith("@g.us");
            const sender = mek.key.fromMe
                ? manaofc.user.id.split(":")[0] + "@s.whatsapp.net" || manaofc.user.id
                : mek.key.participant || mek.key.remoteJid;
            const senderNumber = sender.split("@")[0];
            const botNumber = manaofc.user.id.split(':')[0];
            const botNumber2 = jidNormalizedUser(manaofc.user.id);
            const pushname = mek.pushName || 'Sin Nombre';
            const isMe = botNumber.includes(senderNumber);
            const isOwner = config.OWNER_NUMBER.includes(senderNumber) || isMe;
            const groupMetadata = isGroup ? await manaofc.groupMetadata(from).catch(e => { }) : '';
            const groupName = isGroup ? groupMetadata.subject : ''
            const participants = isGroup ? groupMetadata.participants : '';
            const groupAdmins = isGroup ? getGroupAdmins(participants) : []
            const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false;
            const isAdmins = isGroup ? groupAdmins.includes(sender) : false;

            // FIX: rebuilt body parsing - cleaner and resolves stored
            // NON_BUTTON numbered replies back into real commands
            let body = "";
            if (type === "conversation") body = mek.message.conversation || "";
            else if (type === "extendedTextMessage") body = mek.message.extendedTextMessage.text || "";
            else if (type === "imageMessage") body = mek.message.imageMessage.caption || "";
            else if (type === "videoMessage") body = mek.message.videoMessage.caption || "";
            else if (type === "templateButtonReplyMessage") body = mek.message.templateButtonReplyMessage.selectedId || "";
            else if (type === "buttonsResponseMessage") body = mek.message.buttonsResponseMessage.selectedButtonId || "";
            else if (type === "listResponseMessage") body = mek.message.listResponseMessage.singleSelectReply?.selectedRowId || "";

            // resolve stored button/list command from a quoted numbered reply
            try {
                const stanzaId = mek.message?.extendedTextMessage?.contextInfo?.stanzaId;
                if (stanzaId && (await isbtnID(stanzaId))) {
                    const map = await getCMDStore(stanzaId);
                    const resolved = getCmdForCmdId(map, body.trim());
                    if (resolved) body = (config.PREFIX || '.') + resolved;
                }
            } catch (e) { }

            const prefix = config.PREFIX || '.';
            const isCmd = body.startsWith(prefix);
            const command = isCmd
                ? body.slice(prefix.length).trim().split(" ").shift().toLowerCase()
                : "";
            const args = body.trim().split(/ +/).slice(1);
            const q = args.join(" ");

            //=====================================================================
            const reply = async (text) => {
                const qtext = {
                    key: {
                        participant: '0@s.whatsapp.net',
                        remoteJid: from
                    },
                    message: {
                        contactMessage: {
                            displayName: 'manaofc💚',
                            vcard: `BEGIN:VCARD\nVERSION:3.0\nN:XL;manaofc💚;;;\nFN:manaofc💚\nitem1.TEL;waid=94759934522:+94 75 993 4522\nitem1.X-ABLabel:Mobile\nEND:VCARD`,
                            sendEphemeral: true
                        }
                    }
                };
                await manaofc.sendMessage(from, { text }, { quoted: qtext });
            };

            //===========================================================================================================
            const cos = "`";

            //==============Auto-Read-Cmd============================
            if (isCmd && config.READ_MESSAGE === "cmd") {
                await manaofc.readMessages([mek.key]);
            }
            if (config.READ_MESSAGE === "all") {
                await manaofc.readMessages([mek.key]);
            }

            const presence = config.PRESENCE;
            try {
                if (presence && presence !== "available") {
                    if (presence === "composing") {
                        await manaofc.sendPresenceUpdate("composing", from);
                    } else if (presence === "recording") {
                        await manaofc.sendPresenceUpdate("recording", from);
                    } else if (presence === "unavailable") {
                        await manaofc.sendPresenceUpdate("unavailable", from);
                    } else {
                        await manaofc.sendPresenceUpdate("available", from);
                    }
                } else {
                    await manaofc.sendPresenceUpdate("available", from);
                }
            } catch (e) { }

            //==========================send status plugin======================
            const statusCommands = [
                "send", "Send", "Seve", "Ewpm", "ewpn", "Dapan", "dapan",
                "oni", "Oni", "save", "Save", "ewanna", "Ewanna", "ewam",
                "Ewam", "sv", "Sv", "දාන්න", "එවම්න",
            ];

            if (statusCommands.some((c) => body.includes(c))) {
                try {
                    const jsonData = JSON.parse(JSON.stringify(mek.message));
                    // FIX: optional chaining so non-text messages don't crash
                    const isStatus = jsonData?.extendedTextMessage?.contextInfo?.remoteJid;

                    if (isStatus && m.quoted && (m.quoted.type === "imageMessage" || m.quoted.type === "videoMessage")) {
                        // FIX: more reliable magic-byte detection (mp4 = 'ftyp' at offset 4)
                        const getExtension = (buffer) => {
                            const magic = buffer.toString('hex', 0, 4);
                            if (magic.startsWith('ffd8')) return 'jpg';
                            if (magic === '89504e47') return 'png';
                            if (buffer.toString('ascii', 4, 8) === 'ftyp') return 'mp4';
                            return 'jpg';
                        };

                        const tmpName = getRandom("");

                        if (m.quoted.type === "imageMessage") {
                            const buff = await m.quoted.download(tmpName);
                            const ext = getExtension(buff);
                            const filePath = `./${tmpName}.${ext}`;
                            await fs.promises.writeFile(filePath, buff);
                            // FIX: quoted caption lives on m.quoted.msg, not m.quoted.imageMessage
                            const caption = m.quoted.msg.caption || "";
                            await manaofc.sendMessage(from, {
                                image: fs.readFileSync(filePath),
                                caption: caption,
                            });
                            try { fs.unlinkSync(filePath); } catch (e) { }
                        }
                        else if (m.quoted.type === "videoMessage") {
                            const buff = await m.quoted.download(tmpName);
                            const ext = getExtension(buff);
                            const filePath = `./${tmpName}.${ext}`;
                            await fs.promises.writeFile(filePath, buff);
                            const caption = m.quoted.msg.caption || "";
                            await manaofc.sendMessage(from, {
                                video: fs.readFileSync(filePath),
                                mimetype: "video/mp4",
                                fileName: `${m.id}.mp4`,
                                caption: caption,
                            }, { quoted: mek });
                            try { fs.unlinkSync(filePath); } catch (e) { }
                        }
                    }
                } catch (e) {
                    console.log("status saver error:", e);
                }
            }

            //======================================================================================
            //============== WORK TYPE / AUTO BLOCK ==============
            //============================================================================
            if (config.WORK_TYPE == "onlygroup") {
                if (!isGroup && isCmd && !isOwner) return;
            }
            if (config.WORK_TYPE == "onlyme") {
                if (isCmd && !isOwner) return;
            }
            if (config.AUTO_BLOCK === "all" && from.endsWith("@s.whatsapp.net")) {
                if (!isMe) {
                    await manaofc.updateBlockStatus(sender, "block");
                }
            }
            if (config.AUTO_BLOCK === "cmd" && from.endsWith("@s.whatsapp.net")) {
                if (!isMe && isCmd) {
                    await manaofc.updateBlockStatus(sender, "block");
                }
            }

            //======================= ANTI DELETE =======================
            // FIX: config.ANTI_DELETE never existed -> config.ANTIDELETE
            // FIX: revocation check uses message.protocolMessage (mek.msg does not exist)
            if (config.ANTIDELETE === 'true') {
                if (mek.message?.protocolMessage?.type === 0) {
                    handleMessageRevocation(mek).catch(e => console.log(e));
                } else if (!isGroup) {
                    handleIncomingMessage(mek);
                }
            }

            //================================== COMMAND DISPATCH ================================
            // FIX: cmdName now respects multi-char prefixes
            const cmdName = isCmd ? body.slice(prefix.length).trim().split(" ")[0].toLowerCase() : false;
            if (isCmd) {
                const cmd = commands.find((cmd) => cmd.pattern === cmdName) || commands.find((cmd) => cmd.alias && cmd.alias.includes(cmdName));
                if (cmd) {
                    if (cmd.react) manaofc.sendMessage(from, { react: { text: cmd.react, key: mek.key } });

                    try {
                        // FIX: added `prefix` and `config` to the param object -
                        // several commands destructure them but they were never passed
                        cmd.function(manaofc, mek, m, { from, l, prefix, quoted: m.quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply, config });
                    } catch (e) {
                        console.error("[PLUGIN ERROR] " + e);
                    }
                }
            }

            commands.map(async (command) => {
                if (body && command.on === "body") {
                    command.function(manaofc, mek, m, { from, l, prefix, quoted: m.quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply, config });
                } else if (q && command.on === "text") {
                    command.function(manaofc, mek, m, { from, l, prefix, quoted: m.quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply, config });
                } else if (
                    (command.on === "image" || command.on === "photo") &&
                    type === "imageMessage"
                ) {
                    command.function(manaofc, mek, m, { from, l, prefix, quoted: m.quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply, config });
                } else if (
                    command.on === "sticker" &&
                    type === "stickerMessage"
                ) {
                    command.function(manaofc, mek, m, { from, l, prefix, quoted: m.quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply, config });
                }
            });

            //============================================================================
            //=========================== ANTI LINK =======================
            if (isAnti(config.ANTI_LINK) && isBotAdmins) {
                if (!isAdmins && !isMe && !mek.key.fromMe) {
                    const gclink =
                        /(?:chat\.whatsapp\.com\/(?:invite\/)?|whatsapp\.com\/(?:invite\/)?|whatsapp\.com\/channel\/)([0-9A-Za-z]{20,24})/i;
                    const gpLink = gclink.exec(body);

                    if (gpLink) {
                        console.log(`Detected WhatsApp link: ${gpLink[0]}`);
                        try {
                            await manaofc.sendMessage(from, { delete: mek.key });
                            console.log("Message deleted successfully.");
                        } catch (error) {
                            console.error("Failed to delete message:", error);
                        }
                    }
                }
            }

            //=========================== MOROCCO BLOCK =======================
            if (senderNumber.startsWith('212') && config.MOROCCO_BLOCK === 'on') {
                console.log(`Blocking number +212${senderNumber.slice(3)}...`);

                if (from.endsWith('@g.us')) {
                    await manaofc.groupParticipantsUpdate(from, [sender], 'remove');
                    await manaofc.sendMessage(from, { text: 'User with +212 number detected and removed from the group.' });
                } else {
                    await manaofc.updateBlockStatus(sender, 'block');
                    console.log(`Blocked +212${senderNumber.slice(3)} successfully.`);
                }

                return;
            }

            //====================================================================
            //=========================== ANTI BOT =======================
            // FIX: m.isBaileys never existed - detect Baileys clients by key id length (12 chars)
            if (isGroup && config.ANTI_BOT === "true") {
                var userId = mek.key.id;
                const isBaileysClient = userId && userId.length === 12;

                if (isBaileysClient && !isAdmins && !isOwner && !mek.key.fromMe) {
                    console.log("Detected another bot in the group");

                    if (isBotAdmins) {
                        await manaofc.sendMessage(from, { delete: mek.key });
                        await manaofc.sendMessage(from, {
                            text: "🚫 Bot detected and removed. Only admins can add bots to this group.",
                        });
                        await manaofc.groupParticipantsUpdate(from, [sender], "remove");
                    } else if (userId.length !== 32) {
                        await manaofc.sendMessage(from, {
                            text: `*Invalid ID length! Removing user.*`,
                        });
                        await manaofc.groupParticipantsUpdate(from, [sender], "remove");
                    } else {
                        await manaofc.sendMessage(from, {
                            text: "🚫 Bot detected. I need admin rights to remove it.",
                        });
                    }
                    return;
                }
            }

            //====================================================================
        } catch (e) {
            console.log(e);
        }
    });

    //============================================================================
    manaofc.ev.on("call", async (json) => {
        if (config.ANTICALL === 'true') {
            for (const id of json) {
                if (id.status == "offer") {
                    if (id.isGroup == false) {
                        await manaofc.sendMessage(id.from, {
                            text: config.ANTICALL_MSG || `🚩 Sorry at this time, I cannot accept calls`,
                            mentions: [id.from],
                        });
                        await manaofc.rejectCall(id.id, id.from);
                    } else {
                        await manaofc.rejectCall(id.id, id.from);
                    }
                }
            }
        }
    });
}

app.get("/", (req, res) => {
    res.send("🚩 Working successfully!");
});
app.listen(port, () =>
    console.log(`Your Bots Server listening on port http://localhost:${port}`)
);
setTimeout(async () => {
    await connectToWA();
}, 1000);

process.on("uncaughtException", function (err) {
    let e = String(err);
    if (e.includes("connection timeout")) return;
    if (e.includes("rate-overlimit")) return;
    if (e.includes("connection Closed")) return;
    if (e.includes("Value not found")) return;
    if (e.includes("Authentication timed out")) {
        // FIX: restart() was never defined - reconnect properly
        console.log("Authentication timed out. Reconnecting...");
        setTimeout(connectToWA, 5000);
        return;
    }
    console.log("Caught exception: ", err);
});
