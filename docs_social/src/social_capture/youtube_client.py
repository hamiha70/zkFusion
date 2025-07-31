"""YouTube transcript extraction client."""

import asyncio
import logging
import re
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable,
    NotTranslatable
)

from .config import YouTubeVideoConfig


logger = logging.getLogger(__name__)


class YouTubeClient:
    """Client for extracting YouTube video transcripts."""
    
    def __init__(self, rate_limit_delay: float = 1.0):
        """
        Initialize YouTube client.
        
        Args:
            rate_limit_delay: Delay between API requests in seconds
        """
        self.rate_limit_delay = rate_limit_delay
        self.logger = logging.getLogger(__name__)
    
    def extract_video_id(self, url: str) -> Optional[str]:
        """
        Extract video ID from YouTube URL.
        
        Args:
            url: YouTube video URL
            
        Returns:
            Video ID or None if invalid URL
        """
        patterns = [
            r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',
            r'(?:embed\/)([0-9A-Za-z_-]{11})',
            r'(?:watch\?v=)([0-9A-Za-z_-]{11})'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        
        return None
    
    async def get_transcript(
        self, 
        video_url: str, 
        languages: List[str] = None
    ) -> Dict[str, Any]:
        """
        Get transcript for a YouTube video.
        
        Args:
            video_url: YouTube video URL
            languages: Preferred languages (defaults to ['en'])
            
        Returns:
            Dictionary containing transcript data and metadata
        """
        if languages is None:
            languages = ['en']
        
        video_id = self.extract_video_id(video_url)
        if not video_id:
            raise ValueError(f"Invalid YouTube URL: {video_url}")
        
        try:
            # Use the correct API method
            api = YouTubeTranscriptApi()
            fetched_transcript = api.fetch(video_id, languages=languages)
            
            # Convert FetchedTranscriptSnippet objects to dictionaries
            transcript_data = []
            for snippet in fetched_transcript:
                transcript_data.append({
                    'text': snippet.text,
                    'start': snippet.start,
                    'duration': snippet.duration
                })
            
            # Apply rate limiting
            await asyncio.sleep(self.rate_limit_delay)
            
            return {
                'video_id': video_id,
                'video_url': video_url,
                'language': languages[0],  # Default to first requested language
                'language_code': languages[0],
                'transcript': transcript_data,
                'fetched_at': datetime.now().isoformat(),
                'total_segments': len(transcript_data)
            }
            
        except (TranscriptsDisabled, NoTranscriptFound, VideoUnavailable) as e:
            raise Exception(f"Failed to get transcript for {video_id}: {str(e)}")
    
    def format_transcript_markdown(self, transcript_data: Dict[str, Any]) -> str:
        """
        Format transcript data as Markdown.
        
        Args:
            transcript_data: Transcript data from get_transcript()
            
        Returns:
            Formatted Markdown string
        """
        video_info = transcript_data
        transcript = video_info['transcript']
        
        markdown = f"""# YouTube Transcript

**Video ID:** {video_info['video_id']}  
**URL:** {video_info['video_url']}  
**Language:** {video_info['language']} ({video_info['language_code']})  
**Fetched:** {video_info['fetched_at']}  
**Total Segments:** {video_info['total_segments']}  

---

## Transcript

"""
        
        current_text = []
        current_start = None
        
        for segment in transcript:
            start_time = segment['start']
            duration = segment['duration']
            text = segment['text'].strip()
            
            if current_start is None:
                current_start = start_time
            
            current_text.append(text)
            
            # Group segments into paragraphs (every ~30 seconds or on long pauses)
            if (start_time - current_start > 30) or (duration > 3):
                if current_text:
                    timestamp = self._format_timestamp(current_start)
                    paragraph = ' '.join(current_text)
                    markdown += f"**[{timestamp}]** {paragraph}\n\n"
                    current_text = []
                    current_start = None
        
        # Add any remaining text
        if current_text:
            timestamp = self._format_timestamp(current_start or 0)
            paragraph = ' '.join(current_text)
            markdown += f"**[{timestamp}]** {paragraph}\n\n"
        
        return markdown
    
    def _format_timestamp(self, seconds: float) -> str:
        """Format seconds as MM:SS timestamp."""
        minutes = int(seconds // 60)
        seconds = int(seconds % 60)
        return f"{minutes:02d}:{seconds:02d}"
    
    async def save_transcript(
        self, 
        video_url: str, 
        output_path: Path,
        languages: List[str] = None,
        format_type: str = "markdown"
    ) -> bool:
        """
        Extract and save transcript to file.
        
        Args:
            video_url: YouTube video URL
            output_path: Path to save transcript file
            languages: Preferred languages
            format_type: Output format ("markdown" or "json")
            
        Returns:
            True if successful, False otherwise
        """
        try:
            transcript_data = await self.get_transcript(video_url, languages)
            
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            if format_type == "markdown":
                content = self.format_transcript_markdown(transcript_data)
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(content)
            else:  # json
                import json
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(transcript_data, f, indent=2, ensure_ascii=False)
            
            self.logger.info(f"Saved transcript to {output_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to save transcript: {e}")
            return False 