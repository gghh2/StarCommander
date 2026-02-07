# Star Commander

🚀 Star Commander is voice relay system based on Discord bots.
It is used to manage large scale operations over vocal channels in Discord, with a focus on Star Citizen fleet coordination and communication. It allows commanders to broadcast to multiple channels simultaneously, while chiefs can whisper back to the command channel.

Note that Star Commander is not affiliated with Cloud Imperium Games or Star Citizen, but is designed to enhance the communication experience for players coordinating in the game.

## Overview

Star Commander allows the main user (preferably a discord server owner or admin) to set up channels for different roles (artillery, engineers, pilots, etc.) and broadcast to them simultaneously. Team leaders can whisper back to the command channel, and there is a briefing mode for fleet gatherings. The application also includes radio effects like walkie-talkie filters and click sounds, and supports multiple languages.

## New version 5.0 (In development)

The new version of Star Commander is being totally rewritten in Python, with a focus on improving performance and adding new features. The new version will include:

- A clean desktop application with a user-friendly interface built using [PyQt6](https://doc.qt.io/qtforpython-6/)
- Support for multiple languages, including English, French, German, Spanish, and more.
- Multiple channels configuration with the ability to set up different channels for different roles.
- A briefing mode for fleet gatherings, allowing commanders to share information and coordinate strategies.
- Radio effects like walkie-talkie filters and click sounds to enhance the communication experience (optional).
- Better security by not requiring to send the bot tokens to other users (only the main user will have access to the bot tokens).
