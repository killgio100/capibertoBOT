require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { DisTube } = require('distube');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { YouTubePlugin } = require('@distube/youtube');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { FilePlugin } = require('@distube/file');
const { DeezerPlugin } = require('@distube/deezer');
const { SpotifyPlugin } = require('@distube/spotify');

['TOKEN','SC_CLIENT_ID','SPOTIFY_CLIENT_ID','SPOTIFY_CLIENT_SECRET','GUILD_ID'].forEach(k => {
  if (!process.env[k]) console.warn(`Missing env var: ${k}`);
});
const TOKEN = process.env.TOKEN;
const SC_CLIENT_ID = process.env.SC_CLIENT_ID;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});
client.on('error', console.error);
process.on('unhandledRejection', console.error);

const distube = new DisTube(client, {
  emitNewSongOnly: true,
  plugins: [
    new SoundCloudPlugin({ clientId: SC_CLIENT_ID }),
    new YouTubePlugin(),
    new FilePlugin(),
    new DeezerPlugin(),
    new SpotifyPlugin({ api: { clientId: SPOTIFY_CLIENT_ID, clientSecret: SPOTIFY_CLIENT_SECRET }}),
    new YtDlpPlugin()
  ]
});

distube.on('error', async (error, queue) => {
  console.error('[DisTube Error]', error);
  if (!queue || !queue.songs.length) return;
  const track = queue.songs[0];
  const channel = queue.textChannel;
  await channel.send('⚠️ Errore di riproduzione, riprovo su YouTube...');
  try {
    await distube.play(
      queue.voice.channel,
      track.url || `${track.name} ${track.uploader?.name || ''}`,
      { member: queue.member, textChannel: channel, searchEngine: 'ytsearch' }
    );
  } catch (yt) {
    console.error('YouTube fallback failed:', yt);
    if (queue.songs.length > 1) queue.skip();
  }
});

distube.on('empty', queue => queue.stop());

// Create control buttons (two rows)
function createControlButtons() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('pause').setLabel('⏸️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('resume').setLabel('▶️').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('skip').setLabel('⏭️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('stop').setLabel('⏹️').setStyle(ButtonStyle.Danger)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vol_down').setLabel('🔉').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vol_up').setLabel('🔊').setStyle(ButtonStyle.Success)
  );
  return [row1, row2];
}

async function updateNowPlaying(queue) {
  if (!queue?.songs.length) return;
  const track = queue.songs[0];
  const upcoming = queue.songs.slice(1, 6).map((t, i) => `${i + 1}. ${t.name}`).join('\n') || 'Nessuna';
  const embed = new EmbedBuilder()
    .setColor('#2F3136')
    .setTitle(track.name)
    .setURL(track.url)
    .setThumbnail(track.thumbnail)
    .addFields(
      { name: 'Durata', value: track.formattedDuration, inline: true },
      { name: 'Autore', value: track.uploader?.name || 'Sconosciuto', inline: true },
      { name: 'Prossime in coda', value: upcoming, inline: false }
    )
    .setFooter({ text: `Volume: ${queue.volume}% | Richiesto da: ${track.user.tag}` });

  if (queue.controlMessage) {
    await queue.controlMessage.edit({ embeds: [embed], components: createControlButtons() });
  } else {
    queue.controlMessage = await queue.textChannel.send({ embeds: [embed], components: createControlButtons() });
  }
}

distube.on('playSong', updateNowPlaying);
distube.on('finish', queue => queue.controlMessage?.delete().catch(() => {}));

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  const commands = [
    { name: 'play', description: 'Riproduci da SC->YT, SC/Spotify/Deezer/YT link', options: [{ type: 3, name: 'query', description: 'URL o ricerca', required: true }] },
    { name: 'volume', description: 'Imposta volume e aggiorna embed', options: [{ type: 4, name: 'level', description: '0-100', required: true }] },
    { name: 'queue', description: 'Mostra coda con paginazione' }
  ];
  try {
    await client.application.commands.set(commands, GUILD_ID || undefined);
    console.log('Slash commands registered.');
  } catch (e) {
    console.error('Command reg error', e);
  }
});

function buildQueueEmbed(queue, page = 0) {
  const per = 10;
  const start = page * per;
  const list = queue.songs.slice(start, start + per).map((t, i) => `**${start + i + 1}.** ${t.name}`).join('\n') || 'Vuota';
  return new EmbedBuilder()
    .setColor('#2F3136')
    .setTitle('📄 Coda musicale')
    .setDescription(list)
    .setFooter({ text: `Pagina ${page + 1}/${Math.ceil(queue.songs.length / per)}` });
}

const queuePages = new Map();

client.on('interactionCreate', async i => {
  if (i.isChatInputCommand()) {
    const queue = distube.getQueue(i.guildId);
    switch (i.commandName) {
      case 'play': {
        const q = i.options.getString('query');
        const vc = i.member.voice.channel;
        if (!vc) return i.reply({ content: 'Unisciti a un canale vocale.', ephemeral: true });
        await i.deferReply();
        const isSp = /spotify\.com\/track\//i.test(q);
        const isSc = /soundcloud\.com\//i.test(q);
        const isDz = /deezer\.com\//i.test(q);
        const isYt = /(?:youtu\.be\/|youtube\.com\/watch\?v=)/i.test(q);
        try {
          if (isSp || isYt) {
            await distube.play(vc, q, { member: i.member, textChannel: i.channel });
            await i.followUp(`🎶 Riproduzione da ${isSp ? 'Spotify' : 'YouTube'} link.`);
          } else if (isSc) {
            await distube.play(vc, q, { member: i.member, textChannel: i.channel, searchEngine: 'soundcloud' });
            await i.followUp('🎶 Riproduzione da SoundCloud link.');
          } else if (isDz) {
            await distube.play(vc, q, { member: i.member, textChannel: i.channel });
            await i.followUp('🎶 Riproduzione da Deezer link.');
          } else {
            try {
              await distube.play(vc, q, { member: i.member, textChannel: i.channel, searchEngine: 'soundcloud' });
              await i.followUp('🎶 Trovata su SoundCloud.');
            } catch {
              await distube.play(vc, q, { member: i.member, textChannel: i.channel });
              await i.followUp('🎶 Trovata su YouTube.');
            }
          }
        } catch (err) {
          console.error('Riproduzione fallita:', err);
          await i.followUp(`❌ Errore: ${err.message}`);
        }
        break;
      }
      case 'volume': {
        const lvl = i.options.getInteger('level');
        if (!queue) return i.reply({ content: 'Nessuna coda attiva.', ephemeral: true });
        queue.setVolume(lvl);
        await updateNowPlaying(queue);
        return i.reply({ content: `🔊 Volume: ${lvl}%`, ephemeral: true });
      }
      case 'queue': {
        if (!queue) return i.reply({ content: 'Nessuna coda attiva.', ephemeral: true });
        queuePages.set(i.guildId, 0);
        const embed = buildQueueEmbed(queue, 0);
        const total = Math.ceil(queue.songs.length / 10);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('prev_q').setLabel('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(true),
          new ButtonBuilder().setCustomId('next_q').setLabel('➡️').setStyle(ButtonStyle.Secondary).setDisabled(total < 2)
        );
        return i.reply({ embeds: [embed], components: [row] });
      }
    }
  } else if (i.isButton()) {
    const id = i.customId;
    const queue = distube.getQueue(i.guildId);
    if (!queue) return i.reply({ content: 'Nessuna coda attiva.', ephemeral: true });
    if (id === 'prev_q' || id === 'next_q') {
      let page = queuePages.get(i.guildId) || 0;
      const total = Math.ceil(queue.songs.length / 10);
      page += id === 'next_q' ? 1 : -1;
      page = Math.max(0, Math.min(page, total - 1));
      queuePages.set(i.guildId, page);
      const embed = buildQueueEmbed(queue, page);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev_q').setLabel('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId('next_q').setLabel('➡️').setStyle(ButtonStyle.Secondary).setDisabled(page === total - 1)
      );
      return i.update({ embeds: [embed], components: [row] });
    }
    switch (id) {
      case 'pause': queue.pause(); break;
      case 'resume': queue.resume(); break;
      case 'skip': if (queue.songs.length > 1) queue.skip(); break;
      case 'stop': queue.stop(); break;
      case 'vol_up': queue.setVolume(Math.min(queue.volume + 10, 100)); break;
      case 'vol_down': queue.setVolume(Math.max(queue.volume - 10, 0)); break;
    }
    await updateNowPlaying(queue);
    return i.deferUpdate();
  }
});

client.login(TOKEN).catch(e => console.error('Login failed:', e));
