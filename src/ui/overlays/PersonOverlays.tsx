import { content } from '../../content/content';
import { sceneIndexOf } from '../../core/layout';
import { SCENE_PROGRESS } from '../../core/sceneProgress';
import { NameReveal } from './NameReveal';
import { PERSON_TIMING } from './personTiming';

export function GroomOverlay() {
  return <NameReveal person={content.couple.groom} progress={SCENE_PROGRESS[sceneIndexOf('groom')]} timing={PERSON_TIMING} />;
}
