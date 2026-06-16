'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getModules, addResourceUrl, toggleResourcePublish, isAxiosError, type ApiModule, type ApiResource } from '@/lib/api';

import Modal from '@/components/ui/Modal';
import { Play, Upload, Search, Video, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/common/Toast';

function extractErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg) && msg.length > 0) return String(msg[0]);
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}

interface VideoItem extends ApiResource {
  moduleName: string;
  moduleId: string;
}

const VideoThumbnail = ({
  src,
  thumbnailUrl,
  title,
}: {
  src: string;
  thumbnailUrl?: string;
  title: string;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(thumbnailUrl || null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (thumbnailUrl || !src) return;

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = src;
    video.currentTime = 10;
    video.muted = true;

    video.onloadeddata = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          setThumbnail(canvas.toDataURL('image/jpeg'));
        }
      } catch {
        setError(true);
      }
    };

    video.onerror = () => setError(true);
    video.load();
  }, [src, thumbnailUrl]);

  if (thumbnail && !error) {
    return (
      <img
        src={thumbnail}
        alt={title}
        className="w-full h-full object-cover"
        onError={() => setError(true)}
      />
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-indigo-700 flex flex-col items-center justify-center gap-2">
      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
        <Play size={24} className="text-white ml-1" />
      </div>
      <p className="text-white/60 text-xs text-center px-2 line-clamp-1">{title}</p>
    </div>
  );
};

const capitalizeWords = (str: string) =>
  str.trim().split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

export default function VideosPage() {
  const { toasts, addToast, removeToast } = useToast();
  const [modules, setModules] = useState<ApiModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState('all');
  const [filterPublish, setFilterPublish] = useState<'all' | 'published' | 'unpublished'>('all');
  const [search, setSearch] = useState('');
  const [playVideo, setPlayVideo] = useState<VideoItem | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadModuleId, setUploadModuleId] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [description, setDescription] = useState('');

  const fetchModules = useCallback(() => {
    getModules()
      .then(mods => { setModules(mods); setLoading(false); })
      .catch(() => { addToast('Failed to load videos', 'error'); setLoading(false); });
  }, []);

  useEffect(() => { fetchModules(); }, [fetchModules]);

  const videos: VideoItem[] = modules.flatMap(m =>
    m.resources
      .filter(r => r.fileType === 'video')
      .map(r => ({ ...r, moduleName: m.name, moduleId: m._id }))
  );

  const filtered = videos.filter(v =>
    (filterModule === 'all' || v.moduleId === filterModule) &&
    (search === '' || v.title.toLowerCase().includes(search.toLowerCase())) &&
    (filterPublish === 'all' ||
      (filterPublish === 'published' && v.isPublished) ||
      (filterPublish === 'unpublished' && !v.isPublished))
  );

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadModuleId || !videoUrl) return;
    setUploading(true);
    try {
      await addResourceUrl(uploadModuleId, {
        title: uploadTitle,
        url: videoUrl,
        thumbnailUrl: thumbnailUrl || undefined,
        fileType: 'video',
        description: description || undefined,
      });
      addToast('Video added successfully', 'success');
      setUploadOpen(false);
      setUploadTitle('');
      setVideoUrl('');
      setThumbnailUrl('');
      setDescription('');
      setUploadModuleId('');
      fetchModules();
    } catch (err: unknown) {
      addToast(extractErrorMessage(err), 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleTogglePublish = async (moduleId: string, resourceId: string) => {
    try {
      const result = await toggleResourcePublish(moduleId, resourceId);
      addToast(result.message, 'success');
      fetchModules();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle publish';
      addToast(msg, 'error');
    }
  };

  if (loading) return (
    <div className="p-3 pb-20 sm:p-6 sm:pb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
            <div className="bg-gray-200 h-36" />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-3 pb-20 sm:p-6 sm:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Lecture Videos</h1>
          <p className="text-gray-500 text-sm">{videos.length} videos · {modules.length} modules</p>
        </div>
        <button onClick={() => setUploadOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium">
          <Upload className="w-4 h-4" /> Add Video
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search videos..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white" />
        </div>
        <div className="flex items-center gap-2">
          <select value={filterModule} onChange={e => setFilterModule(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="all">All Modules</option>
            {modules.map(m => <option key={m._id} value={m._id}>{capitalizeWords(m.name)}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <select value={filterPublish} onChange={e => setFilterPublish(e.target.value as 'all' | 'published' | 'unpublished')}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="all">All Videos</option>
            <option value="published">Published Only</option>
            <option value="unpublished">Unpublished Only</option>
          </select>
        </div>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtered.map(v => (
          <div key={v._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer" onClick={() => setPlayVideo(v)}>
            <div className="aspect-video overflow-hidden">
              <VideoThumbnail
                src={v.url || v.fileUrl || ''}
                thumbnailUrl={v.thumbnailUrl}
                title={v.title}
              />
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-800 text-sm line-clamp-2 flex-1 pr-2">{v.title}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700 flex-shrink-0">{capitalizeWords(v.moduleName)}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleTogglePublish(v.moduleId, v._id); }}
                className={v.isPublished === true
                  ? "w-full mt-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-1"
                  : "w-full mt-3 bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-1"}>
                {v.isPublished === true ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {v.isPublished === true ? 'Published' : 'Unpublished'}
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-16 text-gray-400">
            <Play className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No videos found</p>
            <p className="text-xs mt-1">
              {videos.length > 0 ? 'Try adjusting your filters' : 'Upload a video to get started'}
            </p>
          </div>
        )}
      </div>

      {/* Play Modal */}
      <Modal
        isOpen={!!playVideo}
        onClose={() => setPlayVideo(null)}
        title={playVideo?.title ?? ''}
        size="lg"
        height="content"
      >
        {playVideo && (
          <div className="flex justify-center rounded-xl bg-black">
            <video
              src={playVideo.url || playVideo.fileUrl}
              controls
              controlsList="nodownload"
              onContextMenu={e => e.preventDefault()}
              className="max-h-[72dvh] w-full rounded-xl object-contain"
            />
          </div>
        )}
      </Modal>

      {/* Upload Modal */}
      <Modal isOpen={uploadOpen} onClose={() => { if (!uploading) setUploadOpen(false); }} title="Add Lecture Video" size="lg">
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
            <select required value={uploadModuleId} onChange={e => setUploadModuleId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
              <option value="">Select module...</option>
              {modules.map(m => <option key={m._id} value={m._id}>{capitalizeWords(m.name)} ({m.batch})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input type="text" required value={uploadTitle} onChange={e => setUploadTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              placeholder="e.g. Chapter 1 - Introduction" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Video URL</label>
            <input type="text" required value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              placeholder="https://pub-e43a8535a35b41a89a5cbb89981d3df2.r2.dev/your-video.mp4" />
            <p className="text-xs text-gray-400 mt-1">Upload video to Cloudflare R2 and paste the public URL here</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL <span className="font-normal text-gray-400">(optional)</span></label>
            <input type="text" value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              placeholder="https://pub-e43a8535a35b41a89a5cbb89981d3df2.r2.dev/thumbnail.jpg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="font-normal text-gray-400">(optional)</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setUploadOpen(false)} disabled={uploading}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-60">
              Cancel
            </button>
            <button type="submit" disabled={uploading}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
              {uploading ? 'Adding...' : 'Add Video'}
            </button>
          </div>
        </form>
      </Modal>
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
