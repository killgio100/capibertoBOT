require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const ffmpegStaticPath = require('ffmpeg-static');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.commands = new Collection();

// Caricamento comandi
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}

// INIZIALIZZA I PLUGIN
const spotifyPlugin = new SpotifyPlugin({
  api: {
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  },
});
const soundCloudPlugin = new SoundCloudPlugin();
const ytDlpPlugin = new YtDlpPlugin();

// CONFIGURA DISTUBE
client.distube = new DisTube(client, {
    ffmpeg: { path: ffmpegStaticPath },
    emitNewSongOnly: true,
    plugins: [
        spotifyPlugin,
        soundCloudPlugin,
        ytDlpPlugin
    ],
});

// Quando il bot è pronto
client.once('ready', () => {
    console.log('Bot pronto!');
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction, client);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: "Errore durante l'esecuzione del comando.", ephemeral: true });
        }
    }

    // Verifica se l'utente è nel canale vocale
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
        if (!interaction.replied) {
            return interaction.reply({ content: 'Devi essere in un canale vocale per usare questo comando!', ephemeral: true });
        }
    } else {
        // Verifica se il bot è nel canale vocale
        let botVoiceChannel = interaction.guild.me.voice.channel;

        // Se il bot non è nel canale vocale, cerca di entrarci
        if (!botVoiceChannel) {
            try {
                await voiceChannel.join();
                botVoiceChannel = voiceChannel;
            } catch (err) {
                console.error("Impossibile connettersi al canale vocale:", err);
                return interaction.reply({ content: 'Non sono riuscito a connettermi al canale vocale!', ephemeral: true });
            }
        }

        // Verifica i permessi per connettersi e parlare nel canale vocale
        const botPermissions = voiceChannel.permissionsFor(interaction.guild.me);
        if (!botPermissions || !botPermissions.has("CONNECT")) {
            if (!interaction.replied) {
                return interaction.reply({ content: "Non ho i permessi per connettermi a questo canale vocale!", ephemeral: true });
            }
        }

        if (!botPermissions || !botPermissions.has("SPEAK")) {
            if (!interaction.replied) {
                return interaction.reply({ content: "Non ho i permessi per parlare in questo canale vocale!", ephemeral: true });
            }
        }
    }

    // Gestione dei pulsanti
    if (interaction.isButton()) {
        const queue = client.distube.getQueue(interaction);
        if (!queue) {
            if (!interaction.replied) {
                return interaction.reply({ content: '🎵 Nessuna musica in riproduzione.', ephemeral: true });
            }
        }

        switch (interaction.customId) {
            case 'pause':
                queue.pause();
                if (!interaction.replied) {
                    interaction.reply({ content: '⏸️ Pausato.', ephemeral: true });
                }
                break;
            case 'resume':
                if (queue.paused) {  // Verifica se la coda è effettivamente in pausa
                    queue.resume();
                    if (!interaction.replied) {
                        interaction.reply({ content: '▶️ Ripreso.', ephemeral: true });
                    }
                } else {
                    if (!interaction.replied) {
                        interaction.reply({ content: 'La musica è già in riproduzione.', ephemeral: true });
                    }
                }
                break;
            case 'skip':
                queue.skip();
                if (!interaction.replied) {
                    interaction.reply({ content: '⏭️ Traccia saltata.', ephemeral: true });
                }
                break;
            case 'volup':
                queue.setVolume(queue.volume + 10);
                if (!interaction.replied) {
                    interaction.reply({ content: `🔊 Volume aumentato a ${queue.volume + 10}%`, ephemeral: true });
                }
                break;
            case 'stop':
                queue.stop();
                if (!interaction.replied) {
                    interaction.reply({ content: '⏹️ Riproduzione fermata.', ephemeral: true });
                }
                break;
        }
    }
});



client.login(process.env.TOKEN);
