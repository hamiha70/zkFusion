#!/usr/bin/env python3

"""
Main Discord capture script.
Reads configuration from config.yaml and captures messages from all enabled Discord channels.
"""

import asyncio
import sys
import yaml
import os
from pathlib import Path
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table
from datetime import datetime
from dotenv import load_dotenv

# Add the src directory to the path so we can import our modules
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from social_capture.discord_client import DiscordClient

console = Console()

async def capture_discord_channels():
    """Capture all Discord channels from configuration."""
    
    # Load environment variables
    env_file = Path(__file__).parent.parent / ".env"
    if env_file.exists():
        load_dotenv(env_file)
    else:
        console.print("❌ [red].env file not found! Please create it first.[/red]")
        return False
    
    # Get Discord token
    discord_token = os.getenv('DISCORD_USER_TOKEN')
    if not discord_token:
        console.print("❌ [red]DISCORD_USER_TOKEN not found in .env file![/red]")
        return False
    
    # Load configuration
    config_path = Path(__file__).parent.parent / "config.yaml"
    if not config_path.exists():
        console.print("❌ [red]config.yaml not found![/red]")
        console.print(f"Expected at: {config_path}")
        return False
    
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    discord_config = config.get('discord', {})
    channels = discord_config.get('channels', [])
    
    if not channels:
        console.print("❌ [red]No Discord channels configured in config.yaml[/red]")
        return False
    
    # Filter enabled channels
    enabled_channels = [c for c in channels if c.get('enabled', True)]
    
    if not enabled_channels:
        console.print("❌ [red]No enabled Discord channels found[/red]")
        return False
    
    console.print(f"🔐 [bold blue]Discord Capture Session[/bold blue]")
    console.print(f"📥 [bold]Strategy:[/bold] Message limits only (most recent messages)")
    console.print(f"📊 Found {len(enabled_channels)} enabled channels to capture")
    console.print(f"🎯 [bold]High priority channels: up to 3000 messages each![/bold]")
    console.print()
    
    # Create Discord client
    rate_limit = float(os.getenv('DISCORD_RATE_LIMIT_DELAY', 2.5))
    client = DiscordClient(user_token=discord_token, rate_limit_delay=rate_limit)
    
    # Create output directory
    output_dir = Path(__file__).parent.parent / "capture" / "discord"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    results = []
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        
        for i, channel_config in enumerate(enabled_channels, 1):
            channel_name = channel_config.get('name', f'Channel {i}')
            channel_id = channel_config.get('channel_id')
            
            if not channel_id:
                console.print(f"⚠️  [yellow]Skipping {channel_name}: No channel ID provided[/yellow]")
                continue
            
            task = progress.add_task(f"Capturing: {channel_name}", total=1)
            
            try:
                # Test channel access first
                channel_info = await client.get_channel_info(channel_id)
                if not channel_info['success']:
                    results.append({
                        'name': channel_name,
                        'channel_id': channel_id,
                        'status': 'error',
                        'error': f"Cannot access channel: {channel_info['error']}"
                    })
                    console.print(f"❌ [red]Cannot access {channel_name}: {channel_info['error']}[/red]")
                    progress.remove_task(task)
                    continue
                
                # Capture messages with message limit only (no date filtering)
                max_history = channel_config.get('max_history', 500)
                
                console.print(f"  📥 [dim]Capturing {max_history} recent messages[/dim]")
                
                messages = await client.get_messages_batch(
                    channel_id=channel_id,
                    total_limit=max_history,
                    batch_size=50,
                    after_date=None,
                    before_date=None
                )
                
                if messages:
                    # Generate output filename
                    safe_name = "".join(c for c in channel_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
                    safe_name = safe_name.replace(' ', '_')
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    output_file = output_dir / f"{safe_name}_{timestamp}.md"
                    
                    # Format and save messages
                    markdown_content = client.format_messages_markdown(messages, channel_info)
                    
                    with open(output_file, 'w', encoding='utf-8') as f:
                        f.write(markdown_content)
                    
                    progress.update(task, completed=1)
                    results.append({
                        'name': channel_name,
                        'channel_id': channel_id,
                        'status': 'success',
                        'message_count': len(messages),
                        'output_file': output_file
                    })
                    console.print(f"✅ [green]{channel_name}[/green] ({len(messages)} msgs) → {output_file.name}")
                else:
                    results.append({
                        'name': channel_name,
                        'channel_id': channel_id,
                        'status': 'empty',
                        'message_count': 0
                    })
                    console.print(f"⚠️  [yellow]{channel_name}: No messages found[/yellow]")
                
            except Exception as e:
                results.append({
                    'name': channel_name,
                    'channel_id': channel_id,
                    'status': 'error',
                    'error': str(e)
                })
                console.print(f"❌ [red]Error capturing {channel_name}: {str(e)}[/red]")
            
            progress.remove_task(task)
    
    # Summary
    console.print()
    console.print("📊 [bold]Discord Capture Summary[/bold]")
    
    table = Table()
    table.add_column("Channel", style="cyan")
    table.add_column("Status", style="magenta")
    table.add_column("Messages", style="green")
    table.add_column("Output/Error", style="yellow")
    
    for result in results:
        if result['status'] == 'success':
            status_icon = "✅ success"
            messages_text = str(result['message_count'])
            output_text = result['output_file'].name
        elif result['status'] == 'empty':
            status_icon = "⚠️ empty"
            messages_text = "0"
            output_text = "No messages"
        else:
            status_icon = "❌ error"
            messages_text = "-"
            output_text = result.get('error', 'Unknown error')[:50] + "..."
        
        table.add_row(
            result['name'][:30] + "..." if len(result['name']) > 30 else result['name'],
            status_icon,
            messages_text,
            output_text
        )
    
    console.print(table)
    
    successful = len([r for r in results if r['status'] == 'success'])
    total_messages = sum(r.get('message_count', 0) for r in results if r['status'] == 'success')
    
    console.print(f"\n🎯 [bold]Completed: {successful}/{len(enabled_channels)} channels captured successfully[/bold]")
    console.print(f"📝 [bold]Total messages captured: {total_messages}[/bold]")
    
    if successful > 0:
        console.print(f"📁 [dim]Output saved to: {output_dir}[/dim]")
    
    return successful > 0

if __name__ == "__main__":
    try:
        success = asyncio.run(capture_discord_channels())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        console.print("\n⚠️  [yellow]Capture interrupted by user[/yellow]")
        sys.exit(130)
    except Exception as e:
        console.print(f"\n💥 [red]Unexpected error: {e}[/red]")
        sys.exit(1) 