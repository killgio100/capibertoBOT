
const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, Collection } = require('discord.js');
const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { REST, Routes } = require('discord.js');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const distube = new DisTube(client, {
    youtubeDL: false,
    plugins: [new SpotifyPlugin()],
    leaveOnEmpty: true,
    leaveOnStop: true
})


const token = 'TOKEN_BOT';
const clientId = 'ID_CLIENT';
const guildId = 'ID_SERVER';

const commands = [
    new SlashCommandBuilder().setName('play').setDescription('Riproduci una canzone').addStringOption(option => option.setName('query').setDescription('Nome o link della canzone').setRequired(true)),
    new SlashCommandBuilder().setName('pause').setDescription('Metti in pausa la canzone'),
    new SlashCommandBuilder().setName('resume').setDescription('Riprendi la canzone'),
    new SlashCommandBuilder().setName('volume').setDescription('Cambia il volume').addIntegerOption(option => option.setName('percentuale').setDescription('Volume da 1 a 100').setRequired(true)),
    new SlashCommandBuilder().setName('join').setDescription('Fai entrare il bot nel canale vocale'),
    new SlashCommandBuilder().setName('disconnect').setDescription('Disconnetti il bot dal canale vocale'),
    new SlashCommandBuilder().setName('247').setDescription('Attiva o disattiva la modalità 24/7')
]
    .map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Registrazione dei comandi slash...');
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );
        console.log('Comandi registrati!');
    } catch (error) {
        console.error(error);
    }
})();

client.once('ready', () => {
    console.log('Bot online!');
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    
    const voiceChannel = interaction.member.voice.channel;
    const voiceChannelBot = interaction.guild.members.me.voice.channel;

    if (interaction.commandName === 'play') {
        if (!voiceChannel) return interaction.reply({ content: 'Devi essere in un canale vocale!', ephemeral: true });
        const query = interaction.options.getString('query');
        await distube.play(voiceChannel, query, {
            textChannel: interaction.channel,
            member: interaction.member
        });
        await interaction.reply({ content: `🎶 Cerco **${query}**...`, ephemeral: true });
    }

    if (interaction.commandName === 'pause') {
        if (!voiceChannel) return interaction.reply({ content: 'Devi essere in un canale vocale!', ephemeral: true });
        distube.pause(interaction);
        await interaction.reply({ content: '⏸️ Canzone in pausa!', ephemeral: true });
    }

    if (interaction.commandName === 'resume') {
        if (!voiceChannel) return interaction.reply({ content: 'Devi essere in un canale vocale!', ephemeral: true });
        distube.resume(interaction);
        await interaction.reply({ content: '▶️ Canzone ripresa!', ephemeral: true });
    }

    if (interaction.commandName === 'volume') {
        const vol = interaction.options.getInteger('percentuale');
        distube.setVolume(interaction, vol);
        await interaction.reply({ content: `🔊 Volume settato a ${vol}%`, ephemeral: true });
    }

    if (interaction.commandName === 'join') {
        if (!voiceChannel) return interaction.reply({ content: 'Devi essere in un canale vocale!', ephemeral: true });
        await voiceChannel.join();
        await interaction.reply({ content: '✅ Sono entrato nel canale vocale!', ephemeral: true });
    }

    if (interaction.commandName === 'disconnect') {
        if (!voiceChannelBot) return interaction.reply({ content: 'Non sono in nessun canale vocale!', ephemeral: true });
        distube.voices.leave(interaction.guild);
        await interaction.reply({ content: '👋 Disconnesso!', ephemeral: true });
    }

    if (interaction.commandName === '247') {
        const mode = distube.voices.get(interaction.guild.id).setSelfDeaf(false);
        await interaction.reply({ content: '🔁 Modalità 24/7 attivata/disattivata (dipende dalla situazione).', ephemeral: true });
    }
});

distube.on('playSong', (queue, song) => {
    const embed = new EmbedBuilder()
        .setTitle('🎶 Ora in riproduzione')
        .addFields({ name: 'Canzone', value: song.name })
        .setColor('Random');
    queue.textChannel.send({ embeds: [embed] });
});

distube.on('addSong', (queue, song) => {
    const embed = new EmbedBuilder()
        .setTitle('➕ Aggiunta alla coda')
        .addFields({ name: 'Canzone', value: song.name })
        .setColor('Random');
    queue.textChannel.send({ embeds: [embed] });
});

distube.on('searchNoResult', (message, query) => {
    message.channel.send(`❌ Nessun risultato trovato per **${query}**`);
});

client.login(token);
