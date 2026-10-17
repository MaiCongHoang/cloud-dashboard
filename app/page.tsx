'use client';

import { useEffect, useState, useMemo } from 'react';
import NoteModal from './components/noteModal';
import AddNoteModal from './components/addNewNote';
import { DragDropContext, Draggable, Droppable, DropResult } from '@hello-pangea/dnd';
import { io, Socket } from 'socket.io-client';
import { api, getActiveBackendUrl, checkAllBackendsHealth } from './utils/apiClient';
import { BACKEND_URLS } from './config/backends';

type Note = {
    id: number;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
};

let socket: Socket | null = null;

const CATEGORIES = [
    { id: 'all', label: 'Tất cả ghi chú', icon: '📁' },
    { id: 'pinned', label: 'Đã ghim', icon: '⭐' },
    { id: 'Công việc', label: 'Công việc', icon: '💼' },
    { id: 'Ý tưởng', label: 'Ý tưởng', icon: '💡' },
    { id: 'Học tập', label: 'Học tập', icon: '📚' },
    { id: 'Cá nhân', label: 'Cá nhân', icon: '🌿' },
    { id: 'Chung', label: 'Khác', icon: '✨' },
];

function extractCategory(title: string): { category: string; cleanTitle: string } {
    const match = title.match(/^\[(.*?)\]\s*(.*)$/);
    if (match) {
        return { category: match[1], cleanTitle: match[2] };
    }
    return { category: 'Chung', cleanTitle: title };
}

function getCategoryColor(cat: string) {
    switch (cat) {
        case 'Công việc':
            return 'bg-blue-50 text-blue-700 border-blue-200/70';
        case 'Ý tưởng':
            return 'bg-amber-50 text-amber-700 border-amber-200/70';
        case 'Học tập':
            return 'bg-purple-50 text-purple-700 border-purple-200/70';
        case 'Cá nhân':
            return 'bg-emerald-50 text-emerald-700 border-emerald-200/70';
        default:
            return 'bg-slate-100 text-slate-700 border-slate-200/70';
    }
}

export default function HomePage() {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
    const [showAddModal, setShowAddModal] = useState<boolean>(false);
    const [backendStatus, setBackendStatus] = useState<{ url: string; healthy: boolean }[]>([]);
    const [activeBackend, setActiveBackend] = useState<string>('');
    
    // UI state mới cho bố cục hiện đại
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [sortOrder, setSortOrder] = useState<'drag' | 'newest' | 'oldest' | 'alphabetical'>('drag');
    const [pinnedIds, setPinnedIds] = useState<number[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    // Tải danh sách đã ghim từ localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem('fairy_sphere_pinned');
            if (saved) {
                setPinnedIds(JSON.parse(saved));
            }
        } catch {
            // bỏ qua
        }
    }, []);

    // Lưu danh sách ghim vào localStorage khi thay đổi
    const togglePin = (id: number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setPinnedIds((prev) => {
            const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
            try {
                localStorage.setItem('fairy_sphere_pinned', JSON.stringify(next));
            } catch {
                // bỏ qua
            }
            return next;
        });
    };

    const handleCopy = (note: Note, e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(`${note.title}\n\n${note.content}`);
        setCopiedId(note.id);
        setTimeout(() => setCopiedId(null), 1800);
    };

    // Phím tắt bàn phím: N để tạo mới
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === 'n' || e.key === 'N') && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
                e.preventDefault();
                setShowAddModal(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Sử dụng API utility với failover
    const handleEdit = async (note: Note) => {
        try {
            await api.put('/post', note);
            fetchData();
        } catch (error) {
            console.error('Lỗi khi sửa ghi chú:', error);
            alert('Không thể sửa ghi chú. Tất cả backends đều không khả dụng!');
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/post/${id}`);
            fetchData();
        } catch (error) {
            console.error('Lỗi khi xóa ghi chú:', error);
            alert('Không thể xóa ghi chú. Tất cả backends đều không khả dụng!');
        }
    };

    const handleSaveNote = async (title: string, content: string) => {
        const newNote = {
            title,
            content,
            user_id: 1,
        };

        try {
            await api.post('/post', newNote);
            fetchData();
            setShowAddModal(false);
        } catch (err) {
            console.error(err);
            alert('Không thể thêm ghi chú. Tất cả backends đều không khả dụng!');
        }
    };

    const fetchData = async () => {
        try {
            const data = await api.get<Note[]>('/post');
            setNotes(data);
            setActiveBackend(getActiveBackendUrl());
        } catch (err) {
            console.error('Lỗi khi tải dữ liệu:', err);
        } finally {
            setLoading(false);
        }
    };

    // Khởi tạo socket và kiểm tra health của các backends
    useEffect(() => {
        const initializeApp = async () => {
            const healthResults = await checkAllBackendsHealth();
            setBackendStatus(healthResults);
            
            const activeUrl = getActiveBackendUrl();
            setActiveBackend(activeUrl);
            
            if (!socket) {
                socket = io(activeUrl);
                
                socket.on('orderUpdated', (newNotes: Note[]) => {
                    setNotes(newNotes);
                });
                
                socket.on('notesUpdated', () => {
                    fetchData();
                });
            }
            
            fetchData();
        };
        
        initializeApp();
        
        return () => {
            if (socket) {
                socket.off('orderUpdated');
                socket.off('notesUpdated');
            }
        };
    }, []);

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        const newNotes = Array.from(notes);
        const [moved] = newNotes.splice(result.source.index, 1);
        newNotes.splice(result.destination.index, 0, moved);
        setNotes(newNotes);

        if (socket) {
            socket.emit('updateOrder', newNotes);
        }
    };

    // Lọc và sắp xếp ghi chú
    const filteredNotes = useMemo(() => {
        let result = [...notes];

        // Lọc theo từ khóa tìm kiếm
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (n) => n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query)
            );
        }

        // Lọc theo danh mục hoặc ghim
        if (selectedCategory === 'pinned') {
            result = result.filter((n) => pinnedIds.includes(n.id));
        } else if (selectedCategory !== 'all') {
            result = result.filter((n) => {
                const { category } = extractCategory(n.title);
                return category.toLowerCase() === selectedCategory.toLowerCase();
            });
        }

        // Sắp xếp
        if (sortOrder === 'newest') {
            result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } else if (sortOrder === 'oldest') {
            result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        } else if (sortOrder === 'alphabetical') {
            result.sort((a, b) => extractCategory(a.title).cleanTitle.localeCompare(extractCategory(b.title).cleanTitle));
        }

        return result;
    }, [notes, searchQuery, selectedCategory, sortOrder, pinnedIds]);

    const isDragEnabled = sortOrder === 'drag' && selectedCategory === 'all' && !searchQuery.trim();

    if (loading)
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white">
                <div className="text-center space-y-4">
                    <div className="relative w-20 h-20 mx-auto">
                        <div className="absolute inset-0 rounded-full border-4 border-amber-400/20 border-t-amber-400 animate-spin"></div>
                        <div className="absolute inset-2 rounded-full border-4 border-purple-500/20 border-t-purple-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.2s' }}></div>
                        <div className="absolute inset-0 flex items-center justify-center text-amber-300 text-xl font-bold animate-pulse">
                            ✨
                        </div>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-wide text-amber-200">Fairy Sphere</h2>
                        <p className="text-xs text-slate-400 mt-1">Đang khởi tạo không gian lưu trữ...</p>
                    </div>
                </div>
            </div>
        );

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex overflow-x-hidden font-sans">
            {/* Sidebar Overlay (Mobile) */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            {/* MODERN SIDEBAR */}
            <aside
                className={`fixed lg:sticky top-0 h-screen w-72 bg-white/95 backdrop-blur-xl border-r border-slate-200/70 z-50 flex flex-col justify-between transition-transform duration-300 shadow-xl shadow-slate-900/5 ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                }`}
            >
                <div className="p-5 flex-1 flex flex-col overflow-y-auto">
                    {/* Brand Header */}
                    <div className="flex items-center justify-between pb-5 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="relative w-11 h-11 bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-950/20 border border-amber-400/30 group">
                                <span className="text-lg animate-float">✨</span>
                                <div className="absolute -inset-0.5 rounded-2xl bg-amber-400/20 blur-xs -z-10 group-hover:bg-amber-400/40 transition-all"></div>
                            </div>
                            <div>
                                <h1 className="text-lg font-black tracking-tight bg-gradient-to-r from-slate-950 via-purple-900 to-indigo-950 bg-clip-text text-transparent">
                                    Fairy Sphere
                                </h1>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="lg:hidden w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Primary Action Button */}
                    <div className="mt-5">
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="w-full relative group flex items-center justify-between bg-gradient-to-r from-slate-950 via-indigo-950 to-purple-950 hover:from-slate-900 hover:via-purple-900 hover:to-indigo-950 text-amber-200 hover:text-amber-100 px-4.5 py-3 rounded-2xl font-semibold text-sm transition-all duration-300 shadow-md shadow-indigo-950/15 hover:shadow-xl hover:shadow-indigo-950/30 hover:-translate-y-0.5 border border-amber-400/30"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-lg bg-amber-400/20 flex items-center justify-center border border-amber-400/30">
                                    <svg className="w-3.5 h-3.5 text-amber-300 transition-transform group-hover:rotate-90 duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                <span className="tracking-wide">Tạo ghi chú mới</span>
                            </div>
                            <kbd className="hidden sm:inline-block text-[10px] uppercase font-bold text-amber-300/80 bg-white/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                                Phím N
                            </kbd>
                        </button>
                    </div>

                    {/* Navigation Filter Groups */}
                    <div className="mt-5 space-y-6 flex-1">
                        <div>
                            <div className="space-y-1">
                                {CATEGORIES.map((cat) => {
                                    const isActive = selectedCategory === cat.id;
                                    const count =
                                        cat.id === 'all'
                                            ? notes.length
                                            : cat.id === 'pinned'
                                            ? pinnedIds.length
                                            : notes.filter((n) => extractCategory(n.title).category === cat.id).length;

                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => {
                                                setSelectedCategory(cat.id);
                                                setIsSidebarOpen(false);
                                            }}
                                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                                                isActive
                                                    ? 'bg-slate-900 text-amber-200 shadow-md shadow-slate-900/10 border border-amber-400/30'
                                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <span className="text-sm">{cat.icon}</span>
                                                <span>{cat.label}</span>
                                            </div>
                                            <span
                                                className={`text-[11px] px-2 py-0.5 rounded-lg font-bold ${
                                                    isActive
                                                        ? 'bg-amber-400/20 text-amber-300'
                                                        : 'bg-slate-100 text-slate-500'
                                                }`}
                                            >
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Cluster HA & Backend Monitor Widget */}
                    <div className="mt-auto pt-4 border-t border-slate-100">
                        <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 shadow-xs space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-700">Trạng thái hệ thống</span>
                                </div>
                                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-1.5 py-0.5 rounded-md">
                                    Online
                                </span>
                            </div>
                            <div className="space-y-1 pt-1">
                                {BACKEND_URLS.map((url, idx) => {
                                    const status = backendStatus.find((s) => s.url === url);
                                    const isActive = url === activeBackend;
                                    return (
                                        <div
                                            key={idx}
                                            className={`flex items-center justify-between text-[10px] px-2 py-1 rounded-lg ${
                                                isActive
                                                    ? 'bg-slate-900 text-amber-200 font-medium border border-amber-400/30'
                                                    : 'text-slate-500 bg-white border border-slate-200/40'
                                            }`}
                                        >
                                            <span className="truncate max-w-[130px]">Node {idx + 1}: {url.replace('http://', '')}</span>
                                            <span className={status?.healthy ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                                                {status?.healthy ? (isActive ? '✓ Active' : 'Ready') : 'Offline'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* MAIN WORKSPACE CONTENT */}
            <main className="flex-1 flex flex-col min-w-0 min-h-screen">
                {/* TOP HEADER / ACTION BAR */}
                <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/70 px-4 sm:px-8 py-4 transition-all">
                    <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        {/* Mobile Toggle & Search */}
                        <div className="flex items-center gap-3 flex-1">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="lg:hidden w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-slate-200 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                                </svg>
                            </button>

                            {/* Search Bar */}
                            <div className="relative flex-1 max-w-md">
                                <svg
                                    className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm tiêu đề hoặc nội dung ghi chú..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 bg-slate-50/80 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 w-4 h-4 rounded-full flex items-center justify-center"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Controls: Sort & View Mode */}
                        <div className="flex items-center gap-2.5 self-end sm:self-auto">
                            {/* Sort Selector */}
                            <div className="relative">
                                <select
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value as any)}
                                    className="appearance-none bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 py-2 pl-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/40 cursor-pointer shadow-xs"
                                >
                                    <option value="drag">Sắp xếp: Tự do (Kéo thả)</option>
                                    <option value="newest">Sắp xếp: Mới nhất</option>
                                    <option value="oldest">Sắp xếp: Cũ nhất</option>
                                    <option value="alphabetical">Sắp xếp: Tên A-Z</option>
                                </select>
                                <svg
                                    className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>

                            {/* View Mode Toggle */}
                            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    title="Chế độ lưới thẻ"
                                    className={`p-1.5 rounded-lg transition-all ${
                                        viewMode === 'grid'
                                            ? 'bg-white text-slate-900 shadow-xs'
                                            : 'text-slate-400 hover:text-slate-700'
                                    }`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    title="Chế độ danh sách gọn"
                                    className={`p-1.5 rounded-lg transition-all ${
                                        viewMode === 'list'
                                            ? 'bg-white text-slate-900 shadow-xs'
                                            : 'text-slate-400 hover:text-slate-700'
                                    }`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                </button>
                            </div>

                            {/* Add Note Button for Mobile Header */}
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="sm:hidden p-2 rounded-xl bg-slate-950 text-amber-300 border border-amber-400/30"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </header>

                {/* WORKSPACE CANVAS */}
                <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8">
                    {/* Status hint if drag & drop is active or disabled */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                <span>{CATEGORIES.find((c) => c.id === selectedCategory)?.label || 'Ghi chú'}</span>
                                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-600">
                                    {filteredNotes.length}
                                </span>
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {searchQuery ? `Kết quả tìm kiếm cho "${searchQuery}"` : 'Kéo thả để sắp xếp lại các ghi chú'}
                            </p>
                        </div>

                        {!isDragEnabled && (
                            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200/70 px-3 py-1 rounded-xl">
                                <span>💡</span>
                                <span>Chọn &quot;Sắp xếp: Tự do&quot; và xóa bộ lọc để kéo thả vị trí</span>
                            </span>
                        )}
                    </div>

                    {/* NOTES RENDERING */}
                    {filteredNotes.length === 0 ? (
                        /* ENCHANTING MODERN EMPTY STATE */
                        <div className="py-24 text-center max-w-md mx-auto">
                            <div className="relative w-32 h-32 mx-auto mb-8">
                                {/* Ambient Glow Rings */}
                                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-500/20 via-amber-400/20 to-indigo-500/20 blur-xl animate-pulse"></div>
                                <div className="absolute -inset-2 rounded-full border border-purple-200/60 animate-ping opacity-20"></div>
                                
                                {/* Central Floating Sphere */}
                                <div className="relative w-full h-full bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 rounded-full flex items-center justify-center shadow-2xl shadow-indigo-950/30 border border-amber-400/40 animate-float">
                                    <div className="text-4xl animate-pulse">✨</div>
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/10 to-transparent"></div>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
                                Không gian đang sẵn sàng
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6">
                                {searchQuery || selectedCategory !== 'all'
                                    ? 'Không tìm thấy ghi chú nào phù hợp với bộ lọc này. Hãy thử đặt lại điều kiện tìm kiếm!'
                                    : 'Chưa có ghi chú nào trong Fairy Sphere. Hãy khởi tạo ghi chú đầu tiên để bắt đầu lưu trữ ý tưởng của bạn!'}
                            </p>
                            <div className="flex items-center justify-center gap-3">
                                {searchQuery || selectedCategory !== 'all' ? (
                                    <button
                                        onClick={() => {
                                            setSearchQuery('');
                                            setSelectedCategory('all');
                                        }}
                                        className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 shadow-sm transition-all"
                                    >
                                        Xóa tất cả bộ lọc
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setShowAddModal(true)}
                                        className="inline-flex items-center gap-2.5 bg-gradient-to-r from-slate-950 via-indigo-950 to-purple-950 hover:from-slate-900 hover:via-purple-900 hover:to-indigo-950 text-amber-200 hover:text-amber-100 px-6 py-3 rounded-2xl font-bold text-sm tracking-wide transition-all duration-300 shadow-lg shadow-indigo-950/20 hover:shadow-xl hover:shadow-indigo-950/35 hover:-translate-y-0.5 border border-amber-400/40"
                                    >
                                        <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                        </svg>
                                        <span>Tạo ghi chú đầu tiên</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <DragDropContext onDragEnd={handleDragEnd}>
                            <Droppable droppableId="notes-canvas" isDropDisabled={!isDragEnabled}>
                                {(provided) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={
                                            viewMode === 'grid'
                                                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'
                                                : 'space-y-3'
                                        }
                                    >
                                        {filteredNotes.map((note, index) => {
                                            const { category, cleanTitle } = extractCategory(note.title);
                                            const isPinned = pinnedIds.includes(note.id);
                                            const isCopied = copiedId === note.id;

                                            return (
                                                <Draggable
                                                    key={note.id.toString()}
                                                    draggableId={note.id.toString()}
                                                    index={index}
                                                    isDragDisabled={!isDragEnabled}
                                                >
                                                    {(dragProvided, snapshot) => (
                                                        <div
                                                            ref={dragProvided.innerRef}
                                                            {...dragProvided.draggableProps}
                                                            onClick={() => {
                                                                setSelectedNote(note);
                                                                setShowDetailModal(true);
                                                            }}
                                                            className={`relative bg-white rounded-2xl border cursor-pointer ${
                                                                viewMode === 'grid'
                                                                    ? 'p-5.5 flex flex-col justify-between'
                                                                    : 'p-4 flex items-center justify-between gap-4'
                                                            } ${
                                                                snapshot.isDragging
                                                                    ? 'shadow-2xl shadow-indigo-950/30 scale-105 rotate-1 border-amber-400 z-50 ring-2 ring-amber-400/40'
                                                                    : isPinned
                                                                    ? 'border-amber-400/40 shadow-xs'
                                                                    : 'border-slate-200 shadow-xs'
                                                            }`}
                                                        >
                                                            {/* Card Header (Category, Drag Handle, Pin, Copy) */}
                                                            <div className="flex items-center justify-between w-full mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    {isDragEnabled && (
                                                                        <div
                                                                            {...dragProvided.dragHandleProps}
                                                                            title="Kéo thả để đổi vị trí"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            className="w-6 h-6 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-grab active:cursor-grabbing transition-colors"
                                                                        >
                                                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                                                                <circle cx="9" cy="6" r="1.5" />
                                                                                <circle cx="15" cy="6" r="1.5" />
                                                                                <circle cx="9" cy="12" r="1.5" />
                                                                                <circle cx="15" cy="12" r="1.5" />
                                                                                <circle cx="9" cy="18" r="1.5" />
                                                                                <circle cx="15" cy="18" r="1.5" />
                                                                            </svg>
                                                                        </div>
                                                                    )}
                                                                    <span
                                                                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg border ${getCategoryColor(
                                                                            category
                                                                        )}`}
                                                                    >
                                                                        {category}
                                                                    </span>
                                                                </div>

                                                                {/* Pin & Copy Buttons */}
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => handleCopy(note, e)}
                                                                        title="Sao chép nội dung"
                                                                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors"
                                                                    >
                                                                        {isCopied ? (
                                                                            <span className="text-xs font-bold text-emerald-600">✓</span>
                                                                        ) : (
                                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                                            </svg>
                                                                        )}
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => togglePin(note.id, e)}
                                                                        title={isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
                                                                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                                                                            isPinned
                                                                                ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                                                                                : 'text-slate-300 hover:text-amber-500 hover:bg-slate-100'
                                                                        }`}
                                                                    >
                                                                        <svg className="w-3.5 h-3.5" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Card Title & Content */}
                                                            <div className="flex-1 w-full">
                                                                <h3 className="text-base font-bold text-slate-900 line-clamp-1 mb-2 tracking-tight">
                                                                    {cleanTitle}
                                                                </h3>
                                                                <p className="text-slate-500 text-xs sm:text-sm line-clamp-3 leading-relaxed mb-4">
                                                                    {note.content}
                                                                </p>
                                                            </div>

                                                            {/* Card Footer (Timestamp & Word count) */}
                                                            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-100 w-full mt-auto">
                                                                <div className="flex items-center gap-1.5">
                                                                    <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                    <span>
                                                                        {new Date(note.createdAt).toLocaleDateString('vi-VN', {
                                                                            day: '2-digit',
                                                                            month: '2-digit',
                                                                            hour: '2-digit',
                                                                            minute: '2-digit',
                                                                        })}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[10px] bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/50">
                                                                    {note.content.length} ký tự
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            );
                                        })}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    )}
                </div>
            </main>

            {/* MODALS */}
            <NoteModal
                selectedNote={selectedNote}
                setSelectedNote={setSelectedNote}
                setShowModal={setShowDetailModal}
                showModal={showDetailModal}
                onDelete={handleDelete}
                onSave={handleEdit}
            />
            <AddNoteModal
                setShowModal={setShowAddModal}
                showModal={showAddModal}
                onSave={handleSaveNote}
            />
        </div>
    );
}
