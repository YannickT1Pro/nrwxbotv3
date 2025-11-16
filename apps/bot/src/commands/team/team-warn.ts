import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { KodariBot } from '../../bot';
import { prisma } from '@kodari/database';

export default {
  data: new SlashCommandBuilder()
    .setName('team-warn')
    .setDescription('Team-Verwarnung')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Der Benutzer')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Grund')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: CommandInteraction, bot: KodariBot) {
    const user = interaction.options.getUser('user')!;
    const reason = interaction.options.get('reason')?.value as string;

    await prisma.teamAction.create({
      data: {
        guildId: interaction.guildId!,
        type: 'WARN',
        targetId: user.id,
        moderatorId: interaction.user.id,
        reason,
      },
    });

    const embed = new EmbedBuilder()
      .setTitle('⚠️ Team-Verwarnung')
      .setColor(0xffaa00)
      .addFields(
        { name: 'Benutzer', value: `${user.tag}`, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true },
        { name: 'Grund', value: reason }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};