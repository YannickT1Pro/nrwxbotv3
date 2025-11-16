import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { KodariBot } from '../../bot';

export default {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stoppe die Musik und verlasse den Voice-Channel'),

  async execute(interaction: CommandInteraction, bot: KodariBot) {
    const session = bot.musicManager.getSession(interaction.guildId!);

    if (!session) {
      return interaction.reply({ content: 'Es läuft gerade keine Musik!', ephemeral: true });
    }

    if (session.ownerId !== interaction.user.id) {
      return interaction.reply({ content: 'Nur der Session-Besitzer kann die Musik stoppen!', ephemeral: true });
    }

    await bot.musicManager.stop(interaction.guildId!);
    await interaction.reply('⏹️ Musik gestoppt!');
  },
};