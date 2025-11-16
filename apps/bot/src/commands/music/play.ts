import { SlashCommandBuilder, CommandInteraction, GuildMember, VoiceChannel } from 'discord.js';
import { KodariBot } from '../../bot';

export default {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Spiele ein Lied ab')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('YouTube URL, Spotify URL oder Suchbegriff')
        .setRequired(true)
    ),

  async execute(interaction: CommandInteraction, bot: KodariBot) {
    await interaction.deferReply();

    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel as VoiceChannel;

    if (!voiceChannel) {
      return interaction.editReply('Du musst in einem Voice-Channel sein!');
    }

    const query = interaction.options.get('query')?.value as string;

    try {
      const track = await bot.musicManager.play(
        interaction.guildId!,
        voiceChannel,
        interaction.channelId,
        query,
        interaction.user.id
      );

      await interaction.editReply(`🎵 **${track.title}** wurde zur Warteschlange hinzugefügt!\nKünstler: ${track.artist}`);
    } catch (error) {
      await interaction.editReply('❌ Fehler beim Abspielen des Liedes.');
    }
  },
};