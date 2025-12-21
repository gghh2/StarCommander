import discord
import asyncio
import logging

REQUIRED_PERMISSIONS = ["manage_channels", "manage_roles", "connect", "speak"]


class BasicBot(discord.Client):
    def __init__(self):
        intents = discord.Intents.default()
        intents.guilds = True
        intents.voice_states = True

        super().__init__(intents=intents)

    async def on_ready(self):
        logging.info(f"✅ Logged in as {self.user} ({self.user.id})")

        for guild in self.guilds:
            print(f"\n🏰 Guild: {guild.name}")

            me = guild.me
            perms = me.guild_permissions

            for perm in REQUIRED_PERMISSIONS:
                has = getattr(perms, perm)
                status = "✅" if has else "❌"
                print(f"  {status} {perm}")

        print("\n🎉 Bot ready")


def run_bot(token: str):
    logging.basicConfig(level=logging.INFO)
    bot = BasicBot()
    bot.run(token)
