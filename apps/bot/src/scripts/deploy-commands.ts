import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { readdirSync } from 'fs';
import { join } from 'path';

dotenv.config();

const commands: any[] = [];
const commandsPath = join(__dirname, '../commands');
const commandFolders = readdirSync(commandsPath);

for (const folder of commandFolders) {
  const folderPath = join(commandsPath, folder);
  const commandFiles = readdirSync(folderPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = join(folderPath, file);
    const command = require(filePath).default;
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    }
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    const data = await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!),
      { body: commands },
    ) as any;

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error(error);
  }
})();