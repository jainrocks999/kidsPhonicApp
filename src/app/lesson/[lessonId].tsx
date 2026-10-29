import { Redirect, useLocalSearchParams } from 'expo-router';
import { getLessonRef } from '@/data/curriculum';
import { LessonFlow } from '@/features/lesson/LessonFlow';

export default function LessonScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const ref = getLessonRef(lessonId);
  if (!ref) return <Redirect href="/home" />;
  return <LessonFlow key={lessonId} lessonRef={ref} />;
}
