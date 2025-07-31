#!/usr/bin/env python3

"""
Discord connection test script.
Tests Discord user token and basic connectivity before full capture.
"""

import asyncio
import sys
import os
from pathlib import Path
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

# Add the src directory to the path so we can import our modules
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from social_capture.discord_client import DiscordClient
from dotenv import load_dotenv

console = Console()

async def test_discord_connection():
    """Test Discord connection and basic functionality."""
    
    # Load environment variables
    env_file = Path(__file__).parent.parent / ".env"
    if env_file.exists():
        load_dotenv(env_file)
        console.print(f"✅ [green]Loaded environment from {env_file}[/green]")
    else:
        console.print(f"⚠️  [yellow]No .env file found. Make sure to set DISCORD_USER_TOKEN[/yellow]")
    
    # Get Discord token
    discord_token = os.getenv('DISCORD_USER_TOKEN')
    if not discord_token:
        console.print()
        console.print("❌ [red]DISCORD_USER_TOKEN not found![/red]")
        console.print()
        console.print("Please set your Discord user token:")
        console.print("1. Copy .env.example to .env")
        console.print("2. Add your Discord user token to the .env file")
        console.print("3. Run this test again")
        console.print()
        console.print("[dim]See README.md for token extraction instructions[/dim]")
        return False
    
    console.print()
    console.print("🔐 [bold blue]Discord Connection Test[/bold blue]")
    console.print()
    
    # Test connection
    try:
        client = DiscordClient(
            user_token=discord_token,
            rate_limit_delay=2.5
        )
        
        console.print("🔍 Testing Discord connection...")
        
        # Test basic connection
        connection_result = await client.test_connection()
        
        if not connection_result['success']:
            console.print(f"❌ [red]Connection failed: {connection_result['error']}[/red]")
            console.print()
            console.print("Common issues:")
            console.print("- Invalid or expired token")
            console.print("- Token missing 'Bearer ' prefix (don't add it manually)")
            console.print("- Network connectivity issues")
            return False
        
        # Display user info
        console.print("✅ [green]Successfully connected to Discord![/green]")
        console.print()
        
        user_table = Table(title="Your Discord Account Info")
        user_table.add_column("Property", style="cyan")
        user_table.add_column("Value", style="magenta")
        
        user_table.add_row("User ID", connection_result['user_id'])
        user_table.add_row("Username", connection_result['username'])
        if connection_result['discriminator']:
            user_table.add_row("Discriminator", connection_result['discriminator'])
        user_table.add_row("Verified", "✅" if connection_result['verified'] else "❌")
        
        console.print(user_table)
        console.print()
        
        # Test with a sample channel ID (if provided)
        test_channel_id = os.getenv('TEST_CHANNEL_ID')
        if test_channel_id:
            console.print(f"🔍 Testing access to channel: {test_channel_id}")
            
            channel_info = await client.get_channel_info(test_channel_id)
            
            if channel_info['success']:
                console.print("✅ [green]Successfully accessed test channel![/green]")
                
                channel_table = Table(title="Test Channel Info")
                channel_table.add_column("Property", style="cyan")
                channel_table.add_column("Value", style="magenta")
                
                channel_table.add_row("Channel ID", channel_info['channel_id'])
                channel_table.add_row("Name", f"#{channel_info['name']}")
                channel_table.add_row("Type", str(channel_info['type']))
                if channel_info.get('topic'):
                    channel_table.add_row("Topic", channel_info['topic'])
                
                console.print(channel_table)
                console.print()
                
                # Test message retrieval (just 5 messages)
                console.print("🔍 Testing message retrieval (5 messages)...")
                messages = await client.get_messages(test_channel_id, limit=5)
                
                if messages:
                    console.print(f"✅ [green]Successfully retrieved {len(messages)} messages![/green]")
                    
                    # Show sample messages
                    for i, msg in enumerate(messages[:3], 1):
                        author = msg['author']['username']
                        content = msg['content'][:50] + "..." if len(msg['content']) > 50 else msg['content']
                        if not content:
                            content = "[No text content]"
                        console.print(f"  {i}. {author}: {content}")
                    
                    if len(messages) > 3:
                        console.print(f"  ... and {len(messages) - 3} more")
                else:
                    console.print("⚠️  [yellow]No messages retrieved (channel might be empty or no access)[/yellow]")
            else:
                console.print(f"❌ [red]Cannot access test channel: {channel_info['error']}[/red]")
                console.print("This might be normal if you haven't set TEST_CHANNEL_ID")
        
        console.print()
        console.print(Panel.fit(
            "✅ [bold green]Discord Connection Test Passed![/bold green]\n\n"
            "Your Discord token is working correctly.\n"
            "You can now run the full Discord capture script.",
            title="🎉 Success"
        ))
        
        return True
        
    except Exception as e:
        console.print(f"❌ [red]Unexpected error: {e}[/red]")
        console.print()
        console.print("Debug information:")
        console.print(f"- Token length: {len(discord_token) if discord_token else 0}")
        console.print(f"- Token starts with: {discord_token[:20] + '...' if discord_token and len(discord_token) > 20 else 'N/A'}")
        return False

if __name__ == "__main__":
    try:
        success = asyncio.run(test_discord_connection())
        if success:
            console.print()
            console.print("🚀 [bold]Next steps:[/bold]")
            console.print("1. Update config.yaml with real Discord channel IDs")
            console.print("2. Run: python scripts/capture_discord.py")
        else:
            console.print()
            console.print("🔧 [bold]Fix the issues above and try again[/bold]")
        
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        console.print("\n⚠️  [yellow]Test interrupted by user[/yellow]")
        sys.exit(130)
    except Exception as e:
        console.print(f"\n💥 [red]Unexpected error: {e}[/red]")
        sys.exit(1) 