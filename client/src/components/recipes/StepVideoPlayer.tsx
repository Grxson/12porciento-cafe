import { Play } from 'lucide-react';

function getVideoEmbed(url: string): {
  type: 'youtube' | 'vimeo' | 'native' | 'link';
  src: string;
} {
  const yt = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
  );
  if (yt) return { type: 'youtube', src: `https://www.youtube.com/embed/${yt[1]}` };
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return { type: 'vimeo', src: `https://player.vimeo.com/video/${vm[1]}` };
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) return { type: 'native', src: url };
  return { type: 'link', src: url };
}

export default function StepVideoPlayer({ url }: { url: string }) {
  const embed = getVideoEmbed(url);
  if (embed.type === 'youtube' || embed.type === 'vimeo') {
    return (
      <div className="mt-3 aspect-video w-full rounded-lg overflow-hidden bg-coffee-100 dark:bg-coffee-900">
        <iframe
          src={embed.src}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Video del paso"
        />
      </div>
    );
  }
  if (embed.type === 'native') {
    return (
      <video
        src={embed.src}
        controls
        className="mt-3 w-full rounded-lg bg-coffee-100 dark:bg-coffee-900"
      />
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 flex items-center gap-2 text-xs text-gold-600 dark:text-gold-400 hover:text-gold-700 dark:hover:text-gold-300 transition-colors"
    >
      <Play className="w-3.5 h-3.5" /> Ver video
    </a>
  );
}
