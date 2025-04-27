const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus,getVoiceConnection  } = require('@discordjs/voice');
const express = require('express');
const { getTracks } = require('spotify-url-info'); // Assicurati di avere installato questo pacchetto
const axios = require('axios');

const app = express();
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

const player = createAudioPlayer();

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// Endpoint per verificare che il bot sia in esecuzione
app.get('/', (req, res) => {
    res.send('Bot is running!');
});

// Comandi del bot
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

if (commandName === 'play') {
    const url = interaction.options.getString('url');
    try {
        const tracks = await getTracks(url); // Ottieni i dettagli della traccia da Spotify
        if (tracks.length === 0 || !tracks[0].preview_url) {
            await interaction.reply('Could not find a valid preview URL for the track. Please check the URL.');
            return;
        }
        const resource = createAudioResource(tracks[0].preview_url); // Usa l'URL di anteprima per la riproduzione
        player.play(resource);
        await interaction.reply(`Playing: ${tracks[0].title}`);
    } catch (error) {
        console.error('Error fetching tracks:', error);
        await interaction.reply('Could not play the track. Please check the URL.');
    }
} else if (commandName === 'pause') {
        player.pause();
        await interaction.reply('Paused the music.');
    } else if (commandName === 'volume') {
        const volume = interaction.options.getInteger('volume');
        // Logica per cambiare il volume (da implementare)
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
    const connection = getVoiceConnection(interaction.guild.id);
    if (connection) {
        connection.destroy();
        await interaction.reply('Disconnected from the voice channel.');
    } else {
        await interaction.reply('I am not currently in a voice channel.');
    }
} else if (commandName === '24-7') {
        // Logica per la riproduzione continua (da implementare)
        await interaction.reply('Now playing 24/7.');
    }
});

// Avvia il server Express
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

client.login('MTIyMzMyOTE1ODczOTAwNTU4NA.Gqs4Ht.rYlfhpzc2EUhPLCKkD3Jralwrl4YXGn6XN_Euk');