import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from 'discord.js';
import { KodariBot } from '../../bot';

export default {
  data: new SlashCommandBuilder()
    .setName('serverstart')
    .setDescription('Kündige einen Serverstart an')
    .addStringOption(option =>
      option.setName('game')
        .setDescription('Name des Spiels')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('ip')
        .setDescription('Server IP')
    ),

  async execute(interaction: CommandInteraction, bot: KodariBot) {
    const game = interaction.options.get('game')?.value as string;
    const ip = interaction.options.get('ip')?.value as string | undefined;

    const embed = new EmbedBuilder()
      .setTitle('🎮 Server gestartet!')
      .setDescription(`**${game}** ist jetzt online!`)
      .setColor(0x00ff00)
      .setTimestamp();

    if (ip) {
      embed.addFields({ name: 'Server IP', value: `\`${ip}\`` });
    }

    embed.addFields({ name: 'Gestartet von', value: interaction.user.tag });

    await interaction.reply({ embeds: [embed] });
  },
};