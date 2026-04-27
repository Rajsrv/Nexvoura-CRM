import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Trash2, 
  Search, 
  Image as ImageIcon, 
  Film, 
  FileText, 
  Grid, 
  List as ListIcon,
  Plus,
  X,
  ExternalLink,
  ChevronLeft,
  Copy,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { blogService, MediaAsset } from '../services/blogService';
import { useAuth } from '../App';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { hasPermission } from '../lib/permissions';
import { Shield } from 'lucide-react';

export const MediaLibraryPage = () => {
  const { user, company } = useAuth();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video' | 'document'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);

  const [newAsset, setNewAsset] = useState({
    name: '',
    url: '',
    type: 'image' as 'image' | 'video' | 'document',
    tags: [] as string[]
  });

  const canManage = user && hasPermission(user, company, 'media:manage');

  useEffect(() => {
    if (user?.companyId) {
      loadAssets();
    }
  }, [user?.companyId, filterType]);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const data = await blogService.getMedia(user!.companyId, filterType === 'all' ? undefined : filterType);
      setAssets(data);
    } catch (err) {
      toast.error('Failed to initialize media stream');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      toast.error('Insufficient clearance for asset uplink');
      return;
    }
    if (!newAsset.url || !newAsset.name) return;

    try {
      await blogService.addMedia({
        ...newAsset,
        companyId: user!.companyId,
        size: 0,
        tags: []
      });
      toast.success('Asset transmitted successfully');
      setShowUploadModal(false);
      setNewAsset({ name: '', url: '', type: 'image', tags: [] });
      loadAssets();
    } catch (err) {
      toast.error('Transmission failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManage) {
      toast.error('Insufficient clearance for terminal deletion');
      return;
    }
    if (!confirm('Execute terminal deletion protocol for this asset?')) return;
    try {
      await blogService.deleteMedia(id);
      toast.success('Asset purged');
      setSelectedAsset(null);
      loadAssets();
    } catch (err) {
      toast.error('Purge failed');
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Asset URI copied to clipboard');
  };

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (user && !hasPermission(user, company, 'media:manage')) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Shield size={64} className="text-rose-500 mb-6 opacity-20" />
        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-2">Access Denied</h2>
        <p className="text-slate-400 font-medium">Your current clearance level does not allow access to the Media Vault.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen text-white pb-24">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-8">
        <div>
          <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white mb-2">Media Vault</h1>
          <p className="text-slate-500 font-bold tracking-widest uppercase text-[10px]">Centralized Asset Repository / Company: {user?.companyId?.slice(0, 8)}</p>
        </div>
        
        {canManage && (
          <button 
            onClick={() => setShowUploadModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-3xl font-black uppercase tracking-widest text-[10px] transition-all shadow-2xl shadow-indigo-500/20 flex items-center space-x-3 self-start"
          >
            <Plus size={18} />
            <span>New Transmission</span>
          </button>
        )}
      </div>

      {/* Control Bar */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-[32px] p-4 mb-8 flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 w-full lg:w-auto">
          {(['all', 'image', 'video', 'document'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex-1 lg:flex-none ${filterType === type ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-indigo-600 transition-all font-bold text-xs"
            />
          </div>
          
          <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-600 hover:text-white'}`}
            >
              <Grid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-600 hover:text-white'}`}
            >
              <ListIcon size={18} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-48 flex justify-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence>
                  {filteredAssets.map(asset => (
                    <motion.div 
                      key={asset.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={() => setSelectedAsset(asset)}
                      className={`group relative aspect-square rounded-[32px] overflow-hidden border-2 cursor-pointer transition-all ${selectedAsset?.id === asset.id ? 'border-indigo-600 shadow-[0_0_30px_rgba(99,102,241,0.3)]' : 'border-slate-800 hover:border-indigo-500/50'}`}
                    >
                      {asset.type === 'image' ? (
                        <img src={asset.url} alt={asset.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center space-y-3">
                           {asset.type === 'video' ? <Film size={32} className="text-slate-700" /> : <FileText size={32} className="text-slate-700" />}
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{asset.name.slice(0, 15)}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl">
                            <Info size={20} />
                         </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {filteredAssets.length === 0 && (
                  <div className="col-span-full py-48 text-center border-2 border-dashed border-slate-800 rounded-[48px] opacity-20 font-black italic uppercase tracking-[0.2em] text-4xl">Vault Empty</div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAssets.map(asset => (
                  <div 
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    className={`flex items-center justify-between p-6 rounded-3xl border-2 cursor-pointer transition-all ${selectedAsset?.id === asset.id ? 'bg-indigo-600/10 border-indigo-600' : 'bg-slate-900/30 border-slate-800 hover:border-slate-700'}`}
                  >
                    <div className="flex items-center space-x-6">
                      <div className="w-16 h-16 rounded-2xl bg-slate-950 overflow-hidden border border-slate-800">
                        {asset.type === 'image' ? (
                          <img src={asset.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-700">
                             {asset.type === 'video' ? <Film size={20} /> : <FileText size={20} />}
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-black italic uppercase tracking-tight text-white mb-1">{asset.name}</h4>
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{asset.type} • {asset.url.slice(0, 30)}...</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <button onClick={(e) => { e.stopPropagation(); copyToClipboard(asset.url); }} className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all"><Copy size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(asset.id); }} className="p-3 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl transition-all"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details Sidebar */}
          <div className="w-full lg:w-96 shrink-0">
             <AnimatePresence mode="wait">
               {selectedAsset ? (
                 <motion.div 
                   key={selectedAsset.id}
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: 20 }}
                   className="bg-slate-900 border border-slate-800 rounded-[48px] p-8 shadow-2xl sticky top-8"
                 >
                    <div className="aspect-square bg-slate-950 rounded-[32px] overflow-hidden mb-8 border border-slate-800 relative group">
                       {selectedAsset.type === 'image' ? (
                         <img src={selectedAsset.url} alt="" className="w-full h-full object-cover" />
                       ) : (
                         <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                            <div className="p-8 bg-slate-900 rounded-full text-slate-700">
                               {selectedAsset.type === 'video' ? <Film size={48} /> : <FileText size={48} />}
                            </div>
                         </div>
                       )}
                       <a href={selectedAsset.url} target="_blank" rel="noreferrer" className="absolute top-4 right-4 p-3 bg-black/60 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                          <ExternalLink size={18} />
                       </a>
                    </div>

                    <div className="space-y-8">
                       <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Identity Node</label>
                          <h3 className="text-2xl font-black italic uppercase tracking-tight text-white mb-2">{selectedAsset.name}</h3>
                          <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-widest">{selectedAsset.type}</span>
                       </div>

                       <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">URI Protocol</label>
                          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between group">
                             <code className="text-xs text-indigo-400 truncate max-w-[180px] font-mono">{selectedAsset.url}</code>
                             <button onClick={() => copyToClipboard(selectedAsset.url)} className="text-slate-600 hover:text-white transition-colors">
                                <Copy size={16} />
                             </button>
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                             <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Created</p>
                             <p className="text-xs font-black uppercase italic tracking-tight">{format(selectedAsset.createdAt.toDate(), 'MM.dd.yy')}</p>
                          </div>
                          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                             <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Payload</p>
                             <p className="text-xs font-black uppercase italic tracking-tight">NULL_SIZE</p>
                          </div>
                       </div>

                       <button 
                         onClick={() => handleDelete(selectedAsset.id)}
                         className="w-full py-5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-[24px] font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center space-x-3"
                       >
                          <Trash2 size={16} />
                          <span>Terminal Deletion</span>
                       </button>
                    </div>
                 </motion.div>
               ) : (
                 <div className="bg-slate-900/30 border border-slate-800/50 border-dashed rounded-[48px] p-12 text-center h-[600px] flex flex-col items-center justify-center">
                    <div className="p-8 bg-slate-900 rounded-full text-slate-800 mb-6 border border-slate-800 shadow-xl">
                       <ImageIcon size={48} />
                    </div>
                    <p className="font-black italic uppercase tracking-[0.2em] text-slate-700">Select Signal for Analysis</p>
                 </div>
               )}
             </AnimatePresence>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-[48px] overflow-hidden shadow-2xl relative"
            >
               <div className="absolute top-0 right-0 p-8 font-black text-slate-800 italic uppercase tracking-[0.2em] text-4xl pointer-events-none opacity-20">Transmit</div>
               
               <div className="p-10 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                  <div>
                    <h2 className="text-3xl font-black italic uppercase tracking-tight text-white mb-1">Asset Uplink</h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Protocol: Direct Transmission</p>
                  </div>
                  <button onClick={() => setShowUploadModal(false)} className="p-4 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl transition-all">
                    <X size={24} />
                  </button>
               </div>

               <form onSubmit={handleUpload} className="p-12 space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Signal Label</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Q2 Strategy Header"
                      value={newAsset.name}
                      onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 outline-none focus:border-indigo-600 transition-all font-bold text-sm text-white"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Source URI</label>
                    <input 
                      type="text" 
                      placeholder="https://cdn.source.com/asset.png"
                      value={newAsset.url}
                      onChange={(e) => setNewAsset({ ...newAsset, url: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 outline-none focus:border-indigo-600 transition-all font-mono text-xs text-indigo-400"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Asset Payload Type</label>
                    <div className="grid grid-cols-3 gap-4">
                      {['image', 'video', 'document'].map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setNewAsset({ ...newAsset, type: type as any })}
                          className={`py-4 rounded-2xl border-2 transition-all font-black uppercase italic tracking-tight text-xs ${newAsset.type === type ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-6 bg-indigo-600 hover:bg-slate-100 hover:text-slate-950 text-white rounded-[32px] font-black uppercase tracking-widest text-[10px] transition-all shadow-2xl shadow-indigo-500/20 flex items-center justify-center space-x-3"
                  >
                    <Upload size={18} />
                    <span>Initiate Uplink</span>
                  </button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
