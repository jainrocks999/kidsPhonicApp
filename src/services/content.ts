import Constants from 'expo-constants';
import { Directory, File, Paths } from 'expo-file-system';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import manifestJson from '@rn_assets/data/content_manifest.json';
import { persistStorage } from '@/store/storage';
import { logEvent } from './analytics';

/**
 * Downloadable content packs (units 3–8 of every level), same scheme as the original app:
 *   {CDN}/{hash}/{path}   e.g. …/content/a53ee73cd8/audio/level_1/stories/L1_S03/scene_1.mp3
 * Files are stored under documents/content/{hash}/{path}, so a re-published asset (new hash)
 * never collides with the old one.
 */
type Entry = { hash: string; bytes: number; pack: string };
type PackInfo = { files: number; bytes: number; bundled: boolean };

const manifest = manifestJson as { packs: Record<string, PackInfo>; assets: Record<string, Entry> };
const CDN: string =
  (Constants.expoConfig?.extra?.contentCdn as string | undefined) ??
  'https://storage.googleapis.com/abc-phonics-kids-content/content';
const ROOT = new Directory(Paths.document, 'content');
const CONCURRENCY = 4;

export const remotePaths = Object.keys(manifest.assets);
export const packId = (levelNumber: number, unitNumber: number) => `L${levelNumber}U${unitNumber}`;
export const packInfo = (id: string): PackInfo | undefined => manifest.packs[id];
/** True when the pack ships inside the app (units 1–2) or doesn't exist remotely. */
export const isBundled = (id: string) => !manifest.packs[id] || manifest.packs[id].bundled;
export const packsForLevel = (levelNumber: number) =>
  Object.keys(manifest.packs).filter((p) => p.startsWith(`L${levelNumber}U`));

const fileFor = (path: string, e: Entry) => new File(ROOT, e.hash, ...path.split('/'));
const entriesOf = (id: string) => Object.entries(manifest.assets).filter(([, e]) => e.pack === id);

interface ContentState {
  installed: Record<string, true>;
  /** packId -> 0..1 while downloading */
  progress: Record<string, number>;
  errors: Record<string, string>;
}

export const useContent = create<ContentState>()(
  persist(() => ({ installed: {}, progress: {}, errors: {} }) as ContentState, {
    name: 'content',
    storage: persistStorage,
    partialize: (s) => ({ installed: s.installed }) as ContentState,
  }),
);

/** Local file URI for a remote asset, if its pack is installed. */
export function resolveRemote(path: string): { uri: string } | undefined {
  const e = manifest.assets[path];
  if (!e || !useContent.getState().installed[e.pack]) return undefined;
  const f = fileFor(path, e);
  return f.exists ? { uri: f.uri } : undefined;
}

const running = new Map<string, Promise<void>>();

export function downloadPack(id: string): Promise<void> {
  const existing = running.get(id);
  if (existing) return existing;
  const task = (async () => {
    const entries = entriesOf(id);
    const total = entries.reduce((n, [, e]) => n + e.bytes, 0) || 1;
    let done = 0;
    const set = (patch: Partial<ContentState>) => useContent.setState(patch);
    set({ progress: { ...useContent.getState().progress, [id]: 0 }, errors: { ...useContent.getState().errors, [id]: '' } });

    const queue = [...entries];
    const worker = async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        const [path, e] = item;
        const target = fileFor(path, e);
        if (!(target.exists && target.size === e.bytes)) {
          if (target.exists) target.delete();
          target.parentDirectory.create({ intermediates: true, idempotent: true });
          await File.downloadFileAsync(`${CDN}/${e.hash}/${path}`, target);
        }
        done += e.bytes;
        set({ progress: { ...useContent.getState().progress, [id]: done / total } });
      }
    };

    try {
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
      const s = useContent.getState();
      const { [id]: _, ...progress } = s.progress;
      set({ installed: { ...s.installed, [id]: true }, progress });
      logEvent('pack_download', { pack: id });
    } catch (err) {
      const s = useContent.getState();
      const { [id]: _, ...progress } = s.progress;
      set({ progress, errors: { ...s.errors, [id]: String(err) } });
      throw err;
    } finally {
      running.delete(id);
    }
  })();
  running.set(id, task);
  return task;
}

export function deletePack(id: string) {
  for (const [path, e] of entriesOf(id)) {
    const f = fileFor(path, e);
    if (f.exists) f.delete();
  }
  const { [id]: _, ...installed } = useContent.getState().installed;
  useContent.setState({ installed });
}

export const formatMB = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`;
