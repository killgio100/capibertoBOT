const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const axios = require('axios');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

const player = createAudioPlayer();

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'play') {
        const url = interaction.options.getString('url');
        // Logica per riprodurre la canzone/playlist da Spotify
        await interaction.reply(`Playing: ${url}`);
        // Aggiungi qui la logica per riprodurre la musica
    } else if (commandName === 'pause') {
        // Logica per mettere in pausa
        await interaction.reply('Paused the music.');
    } else if (commandName === 'volume') {
        const volume = interaction.options.getInteger('volume');
        // Logica per cambiare il volume
        await interaction.reply(`Volume set to: ${volume}`);
    } else if (commandName === 'join') {
        const channel = interaction.member.voice.channel;
        if (channel) {
            joinVoiceChannel({
                channelId: channel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });
            await interaction.reply(`Joined ${channel.name}`);
        } else {
            await interaction.reply('You need to be in a voice channel!');
        }
    } else if (commandName === 'disconnect') {
        // Logica per disconnettersi
        await interaction.reply('Disconnected from the voice channel.');
    } else if (commandName === '24/7') {
        // Logica per la riproduzione continua
        await interaction.reply('Now playing 24/7.');
    }
});

client.login('MTIyMzMyOTE1ODczOTAwNTU4NA.Gqs4Ht.rYlfhpzc2EUhPLCKkD3Jralwrl4YXGn6XN_Euk');