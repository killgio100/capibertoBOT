const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Mette in pausa la musica'),
    async execute(interaction, client) {
        const queue = client.distube.getQueue(interaction);
        if (!queue) return interaction.reply('Nessuna musica in riproduzione!');
        queue.pause();
        interaction.reply('⏸️ Musica in pausa.');
    }
};
