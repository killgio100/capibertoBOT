const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Riprende la musica in pausa'),
    async execute(interaction, client) {
        const queue = client.distube.getQueue(interaction);
        if (!queue) return interaction.reply('Nessuna musica in pausa!');
        queue.resume();
        interaction.reply('▶️ Musica ripresa.');
    }
};
