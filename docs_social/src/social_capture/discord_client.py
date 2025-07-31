"""Discord message capture client using HTTP requests with user token authentication."""

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
import json

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from .config import DiscordChannelConfig


logger = logging.getLogger(__name__)


class DiscordClient:
    """
    Discord client for capturing messages using user token and HTTP requests.
    
    WARNING: Using user tokens is against Discord's Terms of Service.
    This should only be used for personal research and archival purposes.
    """
    
    def __init__(self, user_token: str, rate_limit_delay: float = 2.5):
        """
        Initialize Discord client.
        
        Args:
            user_token: Discord user token
            rate_limit_delay: Delay between requests in seconds (minimum 2.5s recommended)
        """
        self.user_token = user_token.strip()
        self.rate_limit_delay = max(rate_limit_delay, 2.0)  # Minimum 2 seconds
        self.logger = logging.getLogger(__name__)
        
        # Setup session with retry strategy
        self.session = requests.Session()
        retry_strategy = Retry(
            total=3,
            backoff_factor=2,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("https://", adapter)
        
        # Set headers
        self.session.headers.update({
            'Authorization': self.user_token,
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        
        self.last_request_time = 0
    
    def _date_to_snowflake(self, date_str: str) -> str:
        """
        Convert date string to Discord snowflake ID for filtering.
        
        Args:
            date_str: Date in YYYY-MM-DD format
            
        Returns:
            Discord snowflake ID as string
        """
        try:
            # Parse date and set to start of day UTC
            dt = datetime.strptime(date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc)
            
            # Discord epoch (2015-01-01 00:00:00 UTC)
            discord_epoch = datetime(2015, 1, 1, tzinfo=timezone.utc)
            
            # Calculate milliseconds since Discord epoch
            timestamp_ms = int((dt - discord_epoch).total_seconds() * 1000)
            
            # Generate snowflake (timestamp << 22)
            snowflake = timestamp_ms << 22
            
            return str(snowflake)
            
        except ValueError as e:
            self.logger.error(f"Invalid date format {date_str}: {e}")
            return None
    
    async def _rate_limit(self):
        """Apply rate limiting between requests."""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.rate_limit_delay:
            sleep_time = self.rate_limit_delay - time_since_last
            self.logger.debug(f"Rate limiting: sleeping for {sleep_time:.2f}s")
            await asyncio.sleep(sleep_time)
        
        self.last_request_time = time.time()
    
    def _make_request(self, method: str, url: str, **kwargs) -> requests.Response:
        """Make HTTP request with error handling."""
        try:
            response = self.session.request(method, url, **kwargs)
            
            # Handle rate limiting
            if response.status_code == 429:
                retry_after = response.json().get('retry_after', self.rate_limit_delay)
                self.logger.warning(f"Rate limited. Waiting {retry_after}s")
                time.sleep(retry_after)
                return self._make_request(method, url, **kwargs)
            
            response.raise_for_status()
            return response
            
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Request failed: {e}")
            raise
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test Discord connection and get user info."""
        await self._rate_limit()
        
        try:
            response = self._make_request('GET', 'https://discord.com/api/v9/users/@me')
            user_data = response.json()
            
            return {
                'success': True,
                'user_id': user_data.get('id'),
                'username': user_data.get('username'),
                'discriminator': user_data.get('discriminator'),
                'verified': user_data.get('verified', False)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    async def get_channel_info(self, channel_id: str) -> Dict[str, Any]:
        """Get basic channel information."""
        await self._rate_limit()
        
        try:
            url = f'https://discord.com/api/v9/channels/{channel_id}'
            response = self._make_request('GET', url)
            channel_data = response.json()
            
            return {
                'success': True,
                'channel_id': channel_data.get('id'),
                'name': channel_data.get('name'),
                'type': channel_data.get('type'),
                'guild_id': channel_data.get('guild_id'),
                'topic': channel_data.get('topic')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    async def get_messages(
        self, 
        channel_id: str, 
        limit: int = 50,
        before: Optional[str] = None,
        after: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get messages from a Discord channel.
        
        Args:
            channel_id: Channel ID to fetch from
            limit: Number of messages to fetch (max 100)
            before: Message ID to fetch messages before
            after: Message ID to fetch messages after
            
        Returns:
            List of message dictionaries
        """
        await self._rate_limit()
        
        # Ensure limit is within Discord's bounds
        limit = min(limit, 100)
        
        try:
            url = f'https://discord.com/api/v9/channels/{channel_id}/messages'
            params = {'limit': limit}
            
            if before:
                params['before'] = before
            if after:
                params['after'] = after
            
            response = self._make_request('GET', url, params=params)
            messages = response.json()
            
            # Process messages
            processed_messages = []
            for msg in messages:
                processed_msg = {
                    'id': msg.get('id'),
                    'content': msg.get('content', ''),
                    'timestamp': msg.get('timestamp'),
                    'author': {
                        'id': msg.get('author', {}).get('id'),
                        'username': msg.get('author', {}).get('username'),
                        'discriminator': msg.get('author', {}).get('discriminator'),
                        'bot': msg.get('author', {}).get('bot', False)
                    },
                    'attachments': [
                        {
                            'filename': att.get('filename'),
                            'url': att.get('url'),
                            'size': att.get('size')
                        }
                        for att in msg.get('attachments', [])
                    ],
                    'embeds': msg.get('embeds', []),
                    'reactions': msg.get('reactions', []),
                    'edited_timestamp': msg.get('edited_timestamp'),
                    'channel_id': channel_id
                }
                processed_messages.append(processed_msg)
            
            self.logger.info(f"Retrieved {len(processed_messages)} messages from channel {channel_id}")
            return processed_messages
            
        except Exception as e:
            self.logger.error(f"Failed to get messages from channel {channel_id}: {e}")
            return []
    
    async def get_messages_batch(
        self, 
        channel_id: str, 
        total_limit: int = None,
        batch_size: int = 50,
        after_date: str = None,
        before_date: str = None
    ) -> List[Dict[str, Any]]:
        """
        Get multiple batches of messages from a channel with optional date filtering.
        
        Args:
            channel_id: Channel ID to fetch from
            total_limit: Total number of messages to fetch (None for unlimited within date range)
            batch_size: Messages per batch (max 100)
            after_date: Only fetch messages after this date (YYYY-MM-DD format)
            before_date: Only fetch messages before this date (YYYY-MM-DD format)
            
        Returns:
            List of all fetched messages
        """
        all_messages = []
        batch_size = min(batch_size, 100)
        before_id = None
        
        # Convert dates to snowflakes for filtering
        after_snowflake = None
        before_snowflake = None
        
        if after_date:
            after_snowflake = self._date_to_snowflake(after_date)
            if not after_snowflake:
                self.logger.error(f"Invalid after_date: {after_date}")
                return []
        
        if before_date:
            # Add one day to before_date to include the entire day
            try:
                before_dt = datetime.strptime(before_date, '%Y-%m-%d')
                before_dt = before_dt.replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
                discord_epoch = datetime(2015, 1, 1, tzinfo=timezone.utc)
                timestamp_ms = int((before_dt - discord_epoch).total_seconds() * 1000)
                before_snowflake = str(timestamp_ms << 22)
            except ValueError:
                self.logger.error(f"Invalid before_date: {before_date}")
                return []
        
        self.logger.info(f"Fetching messages from {after_date or 'beginning'} to {before_date or 'now'}")
        
        while True:
            # Determine current batch size
            if total_limit and total_limit > 0:
                remaining = total_limit - len(all_messages)
                if remaining <= 0:
                    break
                current_batch_size = min(batch_size, remaining)
            else:
                current_batch_size = batch_size
            
            # Determine after parameter (use after_snowflake for first request, then last message ID)
            after_param = after_snowflake if len(all_messages) == 0 and after_snowflake else None
            
            messages = await self.get_messages(
                channel_id=channel_id,
                limit=current_batch_size,
                before=before_id,
                after=after_param
            )
            
            if not messages:
                self.logger.info("No more messages found, stopping")
                break
            
            # Filter messages by date if after_date is specified
            if after_snowflake:
                filtered_messages = []
                for msg in messages:
                    if int(msg['id']) >= int(after_snowflake):
                        filtered_messages.append(msg)
                    else:
                        # We've reached messages older than our after_date, stop
                        self.logger.info(f"Reached messages older than {after_date}, stopping pagination")
                        if filtered_messages:
                            all_messages.extend(filtered_messages)
                        return all_messages
                messages = filtered_messages
            
            if not messages:
                self.logger.info("No messages after date filtering, stopping")
                break
            
            all_messages.extend(messages)
            before_id = messages[-1]['id']  # Last message ID for pagination
            
            self.logger.info(f"Fetched batch: {len(messages)} messages. Total: {len(all_messages)}")
            
            # Extra safety delay between batches
            await asyncio.sleep(1.0)
            
            # If we got fewer messages than requested, we've reached the end
            if len(messages) < current_batch_size:
                self.logger.info("Reached end of channel history (partial batch)")
                break
        
        return all_messages
    
    def format_messages_markdown(self, messages: List[Dict[str, Any]], channel_info: Dict[str, Any] = None) -> str:
        """
        Format Discord messages as Markdown.
        
        Args:
            messages: List of message dictionaries
            channel_info: Optional channel information
            
        Returns:
            Formatted Markdown string
        """
        if not messages:
            return "# Discord Messages\n\nNo messages found.\n"
        
        # Sort messages by timestamp (oldest first)
        sorted_messages = sorted(messages, key=lambda x: x['timestamp'])
        
        markdown = f"# Discord Messages\n\n"
        
        if channel_info:
            markdown += f"**Channel:** #{channel_info.get('name', 'Unknown')}\n"
            markdown += f"**Channel ID:** {channel_info.get('channel_id', 'Unknown')}\n"
            if channel_info.get('topic'):
                markdown += f"**Topic:** {channel_info['topic']}\n"
        
        markdown += f"**Messages:** {len(sorted_messages)}\n"
        markdown += f"**Captured:** {datetime.now().isoformat()}\n\n"
        markdown += "---\n\n"
        
        for msg in sorted_messages:
            # Parse timestamp
            timestamp = msg['timestamp']
            if timestamp:
                dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                time_str = dt.strftime('%Y-%m-%d %H:%M:%S UTC')
            else:
                time_str = 'Unknown time'
            
            # Author info
            author = msg['author']
            author_name = f"{author['username']}"
            if author['discriminator'] and author['discriminator'] != '0':
                author_name += f"#{author['discriminator']}"
            if author['bot']:
                author_name += " [BOT]"
            
            # Message content
            content = msg['content'].strip()
            if not content and not msg['attachments'] and not msg['embeds']:
                continue  # Skip empty messages
            
            markdown += f"**[{time_str}]** **{author_name}:**\n"
            
            if content:
                # Simple markdown escaping
                content = content.replace('\\', '\\\\').replace('*', '\\*').replace('_', '\\_')
                markdown += f"{content}\n"
            
            # Attachments
            if msg['attachments']:
                markdown += "\n*Attachments:*\n"
                for att in msg['attachments']:
                    markdown += f"- [{att['filename']}]({att['url']}) ({att['size']} bytes)\n"
            
            # Embeds (simplified)
            if msg['embeds']:
                markdown += f"\n*Embeds: {len(msg['embeds'])} embed(s)*\n"
            
            markdown += "\n"
        
        return markdown
    
    async def capture_channel(self, channel_config: DiscordChannelConfig) -> Dict[str, Any]:
        """
        Capture messages from a Discord channel.
        
        Args:
            channel_config: Channel configuration object
            
        Returns:
            Dictionary containing capture results
        """
        if not channel_config.enabled:
            return {
                'status': 'skipped',
                'reason': 'disabled',
                'channel_config': channel_config
            }
        
        try:
            # Get channel info
            channel_info = await self.get_channel_info(channel_config.channel_id)
            if not channel_info['success']:
                return {
                    'status': 'error',
                    'error': f"Cannot access channel: {channel_info['error']}",
                    'channel_config': channel_config
                }
            
            # Get messages
            messages = await self.get_messages_batch(
                channel_id=channel_config.channel_id,
                total_limit=channel_config.max_history,
                batch_size=50
            )
            
            return {
                'status': 'success',
                'channel_config': channel_config,
                'channel_info': channel_info,
                'messages': messages,
                'message_count': len(messages)
            }
            
        except Exception as e:
            self.logger.error(f"Failed to capture channel {channel_config.name}: {str(e)}")
            return {
                'status': 'error',
                'error': str(e),
                'channel_config': channel_config
            } 