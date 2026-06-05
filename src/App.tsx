import { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  Check, 
  Copy, 
  FileCode, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  Search, 
  Terminal, 
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Compass,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CodeSnippet {
  id: string; // Unique ID
  name: string; // Full relative path, e.g. "Micro/p7.c" or "hello.py"
  displayName: string; // Just the filename, e.g. "p7.c"
  folder: string; // Folder name (e.g. "Micro" or "")
  language: string;
  code: string;
  isCustom?: boolean; // true if created locally by the user
}

const getLanguageFromExtension = (filename: string): string => {
  const normalized = filename.toLowerCase();
  if (normalized.endsWith('.c')) return 'c';
  if (normalized.endsWith('.cpp') || normalized.endsWith('.cxx')) return 'cpp';
  if (normalized.endsWith('.py')) return 'python';
  if (normalized.endsWith('.js') || normalized.endsWith('.jsx')) return 'javascript';
  if (normalized.endsWith('.ts') || normalized.endsWith('.tsx')) return 'typescript';
  if (normalized.endsWith('.html')) return 'html';
  if (normalized.endsWith('.css')) return 'css';
  if (normalized.endsWith('.json')) return 'json';
  if (normalized.endsWith('.md')) return 'markdown';
  if (normalized.endsWith('.asm') || normalized.endsWith('.s')) return 'asm';
  if (normalized.endsWith('.sh') || normalized.endsWith('.bash')) return 'bash';
  if (normalized.endsWith('.sql')) return 'sql';
  if (normalized.endsWith('.java')) return 'java';
  if (normalized.endsWith('.go')) return 'go';
  if (normalized.endsWith('.rs')) return 'rust';
  return 'text';
};

export default function App() {
  const [publicFiles, setPublicFiles] = useState<CodeSnippet[]>([]);
  
  // Local overrides/edits and created snippets
  const [localSnippets, setLocalSnippets] = useState<CodeSnippet[]>(() => {
    try {
      const stored = localStorage.getItem('yshos_local_snippets');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [selectedId, setSelectedId] = useState<string>('hello.c');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editCode, setEditCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  
  // Custom file creation state
  const [newFileName, setNewFileName] = useState('');
  const [newFileCode, setNewFileCode] = useState('');
  const [newFileType, setNewFileType] = useState('c'); // 'c' | 'cpp' | 'py' | 'text'
  const [newFileFolder, setNewFileFolder] = useState(''); // e.g. "Micro" or ""

  // Fetch index list + fetch file contents
  useEffect(() => {
    fetch('/files.json')
      .then(res => res.json())
      .then(data => {
        if (data.files && Array.isArray(data.files)) {
          const fetchPromises = data.files.map(async (name: string) => {
            try {
              const res = await fetch(`/${name}`);
              const text = await res.text();
              const isHtmlFallback = text.trim().startsWith('<!doctype html>');
              
              // Extract folder and file names
              const parts = name.split('/');
              const folder = parts.length > 1 ? parts[0] : '';
              const displayName = parts[parts.length - 1];

              return {
                id: name,
                name,
                displayName,
                folder,
                language: getLanguageFromExtension(name),
                code: isHtmlFallback ? `// Error loading content for /${name}` : text,
                isCustom: false
              };
            } catch {
              const parts = name.split('/');
              const folder = parts.length > 1 ? parts[0] : '';
              const displayName = parts[parts.length - 1];

              return {
                id: name,
                name,
                displayName,
                folder,
                language: getLanguageFromExtension(name),
                code: `// Failed to load file: ${name}`,
                isCustom: false
              };
            }
          });
          Promise.all(fetchPromises).then(results => {
            setPublicFiles(results);
          });
        }
      })
      .catch(err => {
        console.error('Error loading files manifest:', err);
      });
  }, []);

  // Save edits locally (no git changes!)
  useEffect(() => {
    localStorage.setItem('yshos_local_snippets', JSON.stringify(localSnippets));
  }, [localSnippets]);

  // Merge loaded files with local overrides or created files
  const getMergedSnippets = (): CodeSnippet[] => {
    // 1. Start with copying public files
    const list = publicFiles.map(pub => {
      // Find if we have a local edit override for this public file
      const override = localSnippets.find(loc => loc.id === pub.id);
      if (override) {
        return { ...pub, code: override.code }; // Use the local copy
      }
      return pub;
    });

    // 2. Add local files that are not overriding a public file (user-created files)
    localSnippets.forEach(loc => {
      const isOverride = publicFiles.some(pub => pub.id === loc.id);
      if (!isOverride) {
        list.push(loc);
      }
    });

    return list;
  };

  const allSnippets = getMergedSnippets();

  // Highlight and view matching selected file
  const currentSnippet = allSnippets.find(s => s.id === selectedId) || allSnippets[0];

  useEffect(() => {
    if (currentSnippet) {
      setEditCode(currentSnippet.code);
    }
    setIsEditing(false);
  }, [selectedId, currentSnippet]);

  // Clean search filter
  const filteredSnippets = allSnippets.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopy = () => {
    const textToCopy = isEditing ? editCode : (currentSnippet?.code || '');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (!currentSnippet) return;
    
    // Save locally on the browser inside localSnippets (100% git-safe)
    const existsLocally = localSnippets.some(s => s.id === currentSnippet.id);
    if (existsLocally) {
      setLocalSnippets(prev => prev.map(s => s.id === currentSnippet.id ? { ...s, code: editCode } : s));
    } else {
      const newOverride: CodeSnippet = {
        ...currentSnippet,
        code: editCode,
        isCustom: currentSnippet.isCustom ?? false
      };
      setLocalSnippets(prev => [...prev, newOverride]);
    }
    setIsEditing(false);
  };

  const handleDeleteSnippet = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}" from local storage?`)) {
      setLocalSnippets(prev => prev.filter(s => s.id !== id));
      if (selectedId === id) {
        setSelectedId('hello.c');
      }
    }
  };

  const handleCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    let extension = '.c';
    if (newFileType === 'cpp') extension = '.cpp';
    if (newFileType === 'py') extension = '.py';
    if (newFileType === 'text') extension = '.txt';

    let finalName = newFileName.trim();
    if (!finalName.endsWith(extension)) {
      finalName += extension;
    }

    // Determine targeted folder
    const targetFolder = newFileFolder.trim();
    const fullPath = targetFolder ? `${targetFolder}/${finalName}` : finalName;

    const newId = `custom_${Date.now()}`;
    const newSnippet: CodeSnippet = {
      id: newId,
      name: fullPath,
      displayName: finalName,
      folder: targetFolder,
      language: newFileType === 'text' ? 'text' : newFileType,
      code: newFileCode || `// Created local file: ${fullPath}\n// Write code here...`,
      isCustom: true
    };

    setLocalSnippets(prev => [newSnippet, ...prev]);
    setSelectedId(newId);
    setShowCreateModal(false);
    setNewFileName('');
    setNewFileCode('');
  };

  // Group files inside folders
  const foldersMap: Record<string, CodeSnippet[]> = {};
  const rootFiles: CodeSnippet[] = [];

  filteredSnippets.forEach(s => {
    if (s.folder) {
      if (!foldersMap[s.folder]) {
        foldersMap[s.folder] = [];
      }
      foldersMap[s.folder].push(s);
    } else {
      rootFiles.push(s);
    }
  });

  const folderNames = Object.keys(foldersMap).sort();

  const toggleFolder = (folderName: string) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  const systemDate = new Date();
  const formattedTime = systemDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const formattedDay = systemDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="h-screen w-screen relative flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden select-none font-sans bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(15,23,42,0.4),rgba(9,9,11,1))]">
      
      {/* Premium Apple Ysh.OS Top Menu Bar */}
      <div className="h-7 w-full border-b border-zinc-900 bg-zinc-950/90 backdrop-blur-md px-4 flex items-center justify-between text-xs font-normal text-zinc-300 z-10 select-none">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-zinc-100 cursor-default"></span>
          <span className="font-semibold text-white/95">Ysh.OS</span>
          <span className="text-emerald-500/90 font-medium tracking-wider bg-emerald-950/40 px-1.5 py-0.5 rounded text-[10px] border border-emerald-950/30">
            CSE B™
          </span>
        </div>
        
        <div className="flex items-center gap-4 text-zinc-400">
          <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1 bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Cloud Sandbox
          </span>
          <span>{formattedDay}</span>
          <span className="text-zinc-200 font-medium">{formattedTime}</span>
        </div>
      </div>

      <div className="flex-1 w-full flex items-stretch relative overflow-hidden">
        {/* Sleek organic background glow */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[160px] pointer-events-none"></div>

        {/* Premium macOS Unified Finder Interface */}
        <div 
          className="w-full h-full bg-zinc-900/80 backdrop-blur-2xl border-t border-zinc-800/80 flex flex-col md:flex-row overflow-hidden transition-all duration-300"
          id="yshos-app-window"
        >
          
          {/* Left Finder Directory Sidebar */}
          <div className="w-full md:w-64 border-r border-zinc-800/80 bg-zinc-950/50 flex flex-col flex-shrink-0">
            
            {/* Window Controls (Traffic Lights) */}
            <div className="h-12 px-4 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/30">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-[#FF5F56] border border-[#DE443B] block hover:after:content-['×'] after:text-[8px] after:text-black/60 after:absolute after:ml-[2.5px] after:mt-[-4px] cursor-pointer" title="Close" onClick={() => alert('Ysh.OS Window minimized to dock')}></span>
                <span className="w-3.5 h-3.5 rounded-full bg-[#FFBD2E] border border-[#E0A31D] block cursor-pointer"></span>
                <span className="w-3.5 h-3.5 rounded-full bg-[#27C93F] border border-[#1A9E2D] block cursor-pointer"></span>
              </div>
              <span className="text-[11px] font-mono tracking-widest font-bold text-zinc-500">
                FINDER
              </span>
            </div>

            {/* Premium Control Buttons */}
            <div className="p-3 border-b border-zinc-900/80 bg-zinc-900/20 flex flex-col gap-2">
              <button 
                onClick={() => setShowCreateModal(true)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-550 hover:to-emerald-450 text-zinc-50 font-semibold rounded-lg text-xs shadow-md shadow-emerald-950/45 transition-all duration-200 border border-emerald-500/20"
                id="store-new-snippet-btn"
              >
                <span className="flex items-center gap-2">
                  <FolderPlus className="w-3.5 h-3.5" />
                  Store Inside Public
                </span>
                <span className="text-[10px] text-zinc-200 bg-zinc-900/60 px-1.5 py-0.5 rounded font-mono">
                  +N
                </span>
              </button>

              {/* Live search bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search code files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-zinc-950/80 border border-zinc-800/80 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 font-sans"
                />
              </div>
            </div>

            {/* Consolidated Directory Tree - Highly requested layout */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 space-y-3 font-sans">
              
              {/* Collapsible Subdirectories (e.g. Micro folder) */}
              {folderNames.map(folderName => {
                const folderFiles = foldersMap[folderName];
                const isCollapsed = collapsedFolders[folderName];
                const isFolderActive = folderFiles.some(f => f.id === selectedId);

                return (
                  <div key={folderName} className="space-y-1">
                    <button
                      onClick={() => toggleFolder(folderName)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-left transition-all ${
                        isFolderActive ? 'text-zinc-200 bg-zinc-900/40' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/20'
                      }`}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                      )}
                      {isCollapsed ? (
                        <Folder className="w-4 h-4 text-emerald-450 fill-emerald-500/20 flex-shrink-0" />
                      ) : (
                        <FolderOpen className="w-4 h-4 text-emerald-450 fill-emerald-500/35 flex-shrink-0" />
                      )}
                      <span className="truncate flex-1 tracking-wide">{folderName}</span>
                      <span className="text-[10px] text-zinc-500 font-mono pr-1">{folderFiles.length}</span>
                    </button>

                    {!isCollapsed && (
                      <div className="pl-3 border-l border-zinc-800 ml-3.5 space-y-0.5">
                        {folderFiles.map(file => (
                          <div
                            key={file.id}
                            className={`group w-full flex items-center justify-between rounded-md text-xs transition-all ${
                              selectedId === file.id
                                ? 'bg-zinc-800 text-zinc-100 font-medium'
                                : 'text-zinc-400 hover:bg-zinc-800/45 hover:text-zinc-200'
                            }`}
                          >
                            <button
                              onClick={() => setSelectedId(file.id)}
                              className="flex-1 flex items-center gap-2 px-2.5 py-1.5 truncate text-left"
                            >
                              <FileCode className={`w-3.5 h-3.5 flex-shrink-0 ${
                                file.language === 'python' ? 'text-blue-450' :
                                file.language === 'cpp' ? 'text-emerald-400' : 'text-[#f45c37]'
                              }`} />
                              <span className="truncate">{file.displayName}</span>
                            </button>
                            
                            {file.isCustom && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSnippet(file.id, file.name);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 bg-transparent hover:bg-zinc-700/60 text-zinc-500 hover:text-red-400 rounded transition-all duration-150 mr-1"
                                title="Delete local file"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Root / Main directory files directly listed */}
              {rootFiles.length > 0 && (
                <div className="space-y-0.5">
                  <h4 className="px-2 pb-1.5 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                    Root Files
                  </h4>
                  {rootFiles.map(file => (
                    <div
                      key={file.id}
                      className={`group w-full flex items-center justify-between rounded-md text-xs transition-all ${
                        selectedId === file.id
                          ? 'bg-zinc-800 text-zinc-100 font-medium'
                          : 'text-zinc-400 hover:bg-zinc-800/45 hover:text-zinc-200'
                      }`}
                    >
                      <button
                        onClick={() => setSelectedId(file.id)}
                        className="flex-1 flex items-center gap-2 px-2.5 py-1.5 truncate text-left"
                      >
                        <FileCode className={`w-3.5 h-3.5 flex-shrink-0 ${
                          file.language === 'python' ? 'text-blue-450' :
                          file.language === 'cpp' ? 'text-emerald-400' : 'text-[#f45c37]'
                        }`} />
                        <span className="truncate">{file.displayName}</span>
                      </button>
                      
                      {file.isCustom && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSnippet(file.id, file.name);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 bg-transparent hover:bg-zinc-700/60 text-zinc-500 hover:text-red-400 rounded transition-all duration-150 mr-1"
                          title="Delete local file"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {filteredSnippets.length === 0 && (
                <p className="text-[11px] text-zinc-650 px-2.5 py-1.5 italic">No matching code files</p>
              )}

            </div>

            {/* Apple Drive System Profile Card (Device Local Only) */}
            <div className="p-3 border-t border-zinc-900 bg-zinc-950/30 flex items-center justify-between text-xs text-zinc-500 font-normal">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500"></span>
                Browser Storage Active
              </span>
              <span className="text-[9px] font-mono bg-zinc-900 border border-zinc-850 px-1 py-0.2 rounded text-zinc-400 select-none">
                Local-Only
              </span>
            </div>

          </div>

          {/* Right Text Code View Editor Panel */}
          <div className="flex-1 min-w-0 flex flex-col bg-[#111112]">
            
            {/* Main Action Bar for selected Code Snippet */}
            <div className="h-12 border-b border-zinc-900 px-4 flex items-center justify-between bg-zinc-950/40">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-zinc-500 font-mono text-[11px] select-none">LOC:</span>
                <span className="font-mono text-xs text-zinc-400 font-medium select-all truncate">
                  {currentSnippet ? `/${currentSnippet.name}` : '/No folder/No active snippet'}
                </span>
              </div>

              {/* Unified buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {currentSnippet && (
                  <button
                    onClick={() => {
                      if (isEditing) {
                        handleSaveEdit();
                      } else {
                        setEditCode(currentSnippet.code);
                        setIsEditing(true);
                      }
                    }}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${
                      isEditing 
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30 font-bold' 
                        : 'text-zinc-400 hover:text-white bg-zinc-900 border-zinc-800'
                    }`}
                  >
                    {isEditing ? (
                      <>
                        <Save className="w-3.5 h-3.5 animate-pulse" />
                        <span>Save Locally</span>
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Locally</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={handleCopy}
                  disabled={!currentSnippet}
                  className="disabled:opacity-40 select-none flex items-center gap-1.5 text-xs font-bold text-zinc-100 hover:text-white transition-all bg-emerald-600 hover:bg-emerald-550 disabled:cursor-not-allowed px-3.5 py-1.5 rounded-lg shadow-md shadow-emerald-950/40"
                  id="copy-code-action-button"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Formatted Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* High-fidelity Editor Text Area / Renderer Area */}
            <div className="flex-1 relative overflow-auto bg-zinc-950/15 flex flex-col font-mono text-[13px]">
              {isEditing ? (
                <textarea
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="flex-1 w-full p-5 bg-[#121214] text-[#D8D8D8] font-mono focus:outline-none resize-none leading-relaxed border-none focus:ring-0 selection:bg-emerald-500/20"
                  placeholder="// Paste or write C / Python / Text programs here without worrying about git changes..."
                  autoFocus
                />
              ) : currentSnippet ? (
                <div className="flex-1 relative bg-zinc-950/40 overflow-y-auto">
                  <SyntaxHighlighter
                    language={currentSnippet.language}
                    style={vscDarkPlus}
                    customStyle={{
                      margin: 0,
                      padding: '1.5rem',
                      background: 'transparent',
                      fontSize: '13px',
                      lineHeight: '1.65',
                      fontFamily: 'var(--font-mono)'
                    }}
                    showLineNumbers={true}
                    lineNumberStyle={{ minWidth: '2.5em', color: '#52525b', textAlign: 'right', paddingRight: '1em' }}
                  >
                    {currentSnippet.code}
                  </SyntaxHighlighter>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-3 p-10 text-center">
                  <Terminal className="w-10 h-10 text-zinc-700 stroke-1" />
                  <div>
                    <h3 className="font-semibold text-zinc-400">Ysh.OS Code Vault empty</h3>
                    <p className="text-xs text-zinc-650 max-w-xs mt-1">Select code files or click Store Inside Public to load interactive folders.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Status bar */}
            <div className="h-8 border-t border-zinc-900 bg-zinc-950/40 px-4 flex items-center justify-between text-[11px] text-zinc-550 font-mono select-none">
              <div className="flex items-center gap-3">
                <span className="text-emerald-500/70 font-medium">● Status: Saved</span>
                <span>Language: <span className="text-zinc-400">{currentSnippet?.language || 'plain text'}</span></span>
              </div>
              <div className="flex items-center gap-4">
                <span>UTF-8</span>
                <span>Type: <span className="text-zinc-400">{currentSnippet?.isCustom ? 'Local-Only Created' : 'Public Manifest Override'}</span></span>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* New File Store Glassmorphic Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-zinc-900/95 border border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl p-6 relative overflow-hidden"
              id="new-snippet-modal"
            >
              <div className="flex items-center justify-between border-b border-zinc-850 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-emerald-450" />
                  <h3 className="font-semibold text-sm text-zinc-200">Store New File in Public Folder</h3>
                </div>
                {/* Traffic light close */}
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#DE443B] block hover:opacity-80 transition-all cursor-pointer"
                  title="Close"
                ></button>
              </div>

              <form onSubmit={handleCreateFile} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1">Target Directory / Folder</label>
                    <input
                      type="text"
                      placeholder="e.g. Micro (leave empty for root)"
                      value={newFileFolder}
                      onChange={(e) => setNewFileFolder(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1">File Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. bubblesort, assignment1"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Code/Text Format</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { key: 'c', label: '.c (C Code)', color: 'text-[#f45c37]' },
                      { key: 'cpp', label: '.cpp (C++)', color: 'text-emerald-400' },
                      { key: 'py', label: '.py (Python)', color: 'text-blue-400' },
                      { key: 'text', label: '.txt (Text)', color: 'text-zinc-400' }
                    ].map(type => (
                      <button
                        key={type.key}
                        type="button"
                        onClick={() => setNewFileType(type.key)}
                        className={`py-2 px-1 rounded-lg text-[11px] font-semibold border transition-all text-center flex flex-col items-center justify-center gap-1 ${
                          newFileType === type.key
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-zinc-950 text-zinc-500 border-zinc-900/50 hover:border-zinc-850'
                        }`}
                      >
                        <span className={`font-mono text-xs font-bold ${type.color}`}>
                          {type.key === 'text' ? 'TXT' : `.${type.key}`}
                        </span>
                        <span>{type.label.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Code / Text Content</label>
                  <textarea
                    rows={8}
                    placeholder="// Type or paste your code/text content here..."
                    value={newFileCode}
                    onChange={(e) => setNewFileCode(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-900 rounded-lg p-3 text-xs text-zinc-200 placeholder-zinc-700 font-mono focus:outline-none focus:border-emerald-500/50 resize-none leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-850">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs px-3.5 py-1.5 rounded-lg border border-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-zinc-100 font-bold text-xs px-4 py-1.5 rounded-lg shadow-lg shadow-emerald-900/15"
                  >
                    Save to Device Vault
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
