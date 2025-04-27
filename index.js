const { Client, Intents } = require('discord.js');
const { DisTube } = require('distube');
const { getTracks } = require('spotify-url-info')(require('axios'));
const { token } = require('./config.json');  // Assicurati di avere un file config.json con il token del bot

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES] });
const distube = new DisTube(client, { leaveOnEmpty: true, leaveOnStop: true });

client.once('ready', () => {
    console.log('Bot is ready!');
});

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
            const tracks = await getTracks(query);
            for (let track of tracks) {
                await distube.play(voiceChannel, `${track.name} ${track.artists.join(', ')}`, {
                    member: interaction.member,
                    textChannel: interaction.channel
                });
            }
            return interaction.followUp(`🎶 Sto suonando la playlist di Spotify!`);
        } else {
            distube.play(voiceChannel, query, {
                member: interaction.member,
                textChannel: interaction.channel
            });
            return interaction.followUp(`🎵 Sto suonando: **${query}**`);
        }
    }
});

client.login(token);
