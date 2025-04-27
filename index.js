const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const { DisTube } = require('distube');
const { getTracks } = require('spotify-url-info');
const { token } = require('./config.json');  // Assicurati di avere un file config.json con il token del bot

// Crea un'app Express per il server
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is running!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Crea il client Discord
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
const distube = new DisTube(client, { leaveOnEmpty: true, leaveOnStop: true });

client.once('ready', () => {
    console.log('Bot is ready!');
});

// Gestione degli eventi per i comandi
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'play') {
        const query = interaction.options.getString('query');
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({ content: "Devi essere in un canale vocale!", ephemeral: true });
        }

        await interaction.deferReply();

        if (query.includes('open.spotify.com/playlist/')) {
            try {
                // Recupera i brani dalla playlist Spotify
                const tracks = await getTracks(query);
                for (let track of tracks) {
                    await distube.play(voiceChannel, `${track.name} ${track.artists.join(', ')}`, {
                        member: interaction.member,
                        textChannel: interaction.channel
                    });
                }
                return interaction.followUp(`🎶 Sto suonando la playlist di Spotify!`);
            } catch (error) {
                console.error(error);
                return interaction.followUp(`Si è verificato un errore nel recuperare la playlist di Spotify.`);
            }
        } else {
            distube.play(voiceChannel, query, {
                member: interaction.member,
                textChannel: interaction.channel
            });
            return interaction.followUp(`🎵 Sto suonando: **${query}**`);
        }
    }
});

// Login del bot
client.login(token);
