const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Imposta il volume')
        .addIntegerOption(option =>
            option.setName('percentuale')
                .setDescription('Volume da 1 a 100')
                .setRequired(true)
        ),
    async execute(interaction, client) {
        const vol = interaction.options.getInteger('percentuale');
        const queue = client.distube.getQueue(interaction);
        if (!queue) return interaction.reply('Nessuna musica in riproduzione!');
        queue.setVolume(vol);
        interaction.reply(`🔊 Volume impostato a ${vol}%`);
    }
};
