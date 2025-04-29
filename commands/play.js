const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Riproduce una traccia o playlist Spotify')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('Link Spotify')
                .setRequired(true)
        ),
    async execute(interaction, client) {
        const url = interaction.options.getString('url');
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) return interaction.reply('❌ Devi essere in un canale vocale!');
        
        await interaction.deferReply();

        client.distube.play(voiceChannel, url, {
            textChannel: interaction.channel,
            member: interaction.member
        });

        const embed = new EmbedBuilder()
            .setTitle('🎶 Riproduzione avviata')
            .setDescription(`Sto caricando [questo contenuto](${url})`)
            .setColor(0x1DB954)
            .setFooter({ text: 'Controlli disponibili sotto' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('pause')
                    .setLabel('⏸️ Pausa')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('resume')
                    .setLabel('▶️ Riprendi')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('skip')
                    .setLabel('⏭️ Avanti')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('volup')
                    .setLabel('🔊 +')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('stop')
                    .setLabel('⏹️ Stop')
                    .setStyle(ButtonStyle.Danger)
            );

        await interaction.editReply({ embeds: [embed], components: [row] });
    }
};
