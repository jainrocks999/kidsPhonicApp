import { Redirect, useLocalSearchParams } from 'expo-router';
import { getStory } from '@/data/curriculum';
import { StoryPlayer } from '@/features/story/StoryPlayer';

export default function StoryScreen() {
  const { storyId } = useLocalSearchParams<{ storyId: string }>();
  const story = getStory(storyId);
  if (!story) return <Redirect href="/home" />;
  return <StoryPlayer story={story} />;
}
