const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Ferma la musica e svuota la coda'),
    async execute(interaction, client) {
        const queue = client.distube.getQueue(interaction);
        if (!queue) return interaction.reply('Nessuna musica in riproduzione!');
        queue.stop();
        interaction.reply('⏹️ Musica fermata e coda svuotata.');
    }
};
