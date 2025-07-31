#!/usr/bin/env python3

"""
Main YouTube capture script.
Reads configuration from config.yaml and captures transcripts for all enabled videos.
"""

import asyncio
import sys
import yaml
from pathlib import Path
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table
from datetime import datetime

# Add the src directory to the path so we can import our modules
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from social_capture.youtube_client import YouTubeClient

console = Console()

async def capture_youtube_videos():
    """Capture all YouTube videos from configuration."""
    
    # Load configuration
    config_path = Path(__file__).parent.parent / "config.yaml"
    if not config_path.exists():
        console.print("❌ [red]config.yaml not found![/red]")
        console.print(f"Expected at: {config_path}")
        return False
    
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    youtube_config = config.get('youtube', {})
    videos = youtube_config.get('videos', [])
    
    if not videos:
        console.print("❌ [red]No YouTube videos configured in config.yaml[/red]")
        return False
    
    # Filter enabled videos
    enabled_videos = [v for v in videos if v.get('enabled', True)]
    
    if not enabled_videos:
        console.print("❌ [red]No enabled YouTube videos found[/red]")
        return False
    
    console.print(f"🎬 [bold blue]YouTube Capture Session[/bold blue]")
    console.print(f"Found {len(enabled_videos)} enabled videos to capture")
    console.print()
    
    # Create YouTube client
    rate_limit = youtube_config.get('rate_limit_delay', 1.0)
    client = YouTubeClient(rate_limit_delay=rate_limit)
    
    # Create output directory
    output_dir = Path(__file__).parent.parent / "capture" / "youtube"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    results = []
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        
        for i, video_config in enumerate(enabled_videos, 1):
            video_name = video_config.get('name', f'Video {i}')
            video_url = video_config.get('url')
            
            if not video_url:
                console.print(f"⚠️  [yellow]Skipping {video_name}: No URL provided[/yellow]")
                continue
            
            task = progress.add_task(f"Capturing: {video_name}", total=1)
            
            try:
                # Generate output filename
                safe_name = "".join(c for c in video_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
                safe_name = safe_name.replace(' ', '_')
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_file = output_dir / f"{safe_name}_{timestamp}.md"
                
                # Capture transcript
                languages = video_config.get('languages', ['en'])
                success = await client.save_transcript(
                    video_url=video_url,
                    output_path=output_file,
                    languages=languages,
                    format_type="markdown"
                )
                
                if success:
                    progress.update(task, completed=1)
                    results.append({
                        'name': video_name,
                        'url': video_url,
                        'status': 'success',
                        'output_file': output_file
                    })
                    console.print(f"✅ [green]{video_name}[/green] → {output_file.name}")
                else:
                    results.append({
                        'name': video_name,
                        'url': video_url,
                        'status': 'failed',
                        'error': 'Unknown error'
                    })
                    console.print(f"❌ [red]Failed: {video_name}[/red]")
                
            except Exception as e:
                results.append({
                    'name': video_name,
                    'url': video_url,
                    'status': 'error',
                    'error': str(e)
                })
                console.print(f"❌ [red]Error capturing {video_name}: {str(e)}[/red]")
            
            progress.remove_task(task)
    
    # Summary
    console.print()
    console.print("📊 [bold]Capture Summary[/bold]")
    
    table = Table()
    table.add_column("Video", style="cyan")
    table.add_column("Status", style="magenta")
    table.add_column("Output/Error", style="green")
    
    for result in results:
        status_icon = "✅" if result['status'] == 'success' else "❌"
        status_text = f"{status_icon} {result['status']}"
        
        if result['status'] == 'success':
            output_text = result['output_file'].name
        else:
            output_text = result.get('error', 'Unknown error')
        
        table.add_row(result['name'], status_text, output_text)
    
    console.print(table)
    
    successful = len([r for r in results if r['status'] == 'success'])
    console.print(f"\n🎯 [bold]Completed: {successful}/{len(enabled_videos)} videos captured successfully[/bold]")
    
    if successful > 0:
        console.print(f"📁 [dim]Output saved to: {output_dir}[/dim]")
    
    return successful > 0

if __name__ == "__main__":
    try:
        success = asyncio.run(capture_youtube_videos())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        console.print("\n⚠️  [yellow]Capture interrupted by user[/yellow]")
        sys.exit(130)
    except Exception as e:
        console.print(f"\n💥 [red]Unexpected error: {e}[/red]")
        sys.exit(1) 