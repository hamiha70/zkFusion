#!/usr/bin/env python3
"""
Simple test script for YouTube transcript capture.
This script tests the YouTube client functionality without requiring Discord setup.
"""

import asyncio
import sys
from pathlib import Path

# Add the src directory to the path so we can import our modules
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from social_capture.youtube_client import YouTubeClient


async def test_youtube_transcript():
    """Test YouTube transcript extraction with a sample video."""
    
    # Initialize YouTube client
    client = YouTubeClient(rate_limit_delay=1.0)
    
    # Test with a well-known video that should have transcripts
    # Using Rick Astley - Never Gonna Give You Up (famous video with reliable transcripts)
    test_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    
    print("🎬 YouTube Transcript Test")
    print("=" * 50)
    print("Testing YouTube transcript extraction...")
    print(f"Video URL: {test_url}")
    print()
    
    try:
        # Test transcript extraction
        result = await client.get_transcript(test_url, languages=['en'])
        
        print("✅ Successfully extracted transcript!")
        print(f"   - Video ID: {result['video_id']}")
        print(f"   - Language: {result['language']} ({result['language_code']})")
        print(f"   - Total segments: {result['total_segments']}")
        print(f"   - Fetched at: {result['fetched_at']}")
        print()
        
        # Show first few segments
        print("📝 First few transcript segments:")
        print("-" * 30)
        for i, segment in enumerate(result['transcript'][:3]):
            start_time = segment['start']
            minutes = int(start_time // 60)
            seconds = int(start_time % 60)
            print(f"[{minutes:02d}:{seconds:02d}] {segment['text']}")
        
        if len(result['transcript']) > 3:
            print("   ... (and more)")
        print()
        
        # Test markdown formatting
        markdown = client.format_transcript_markdown(result)
        print("📄 Markdown format preview (first 200 chars):")
        print("-" * 30)
        print(markdown[:200] + "..." if len(markdown) > 200 else markdown)
        print()
        
        print("✅ YouTube client test passed!")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print()
        print("❌ YouTube client test failed.")
        print("Please check your internet connection and try again.")
        return False


if __name__ == "__main__":
    asyncio.run(test_youtube_transcript()) 