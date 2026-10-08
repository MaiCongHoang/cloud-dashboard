'use client';

import { useEffect, useState } from 'react';
import NoteModal from './components/noteModal';
import AddNoteModal from './components/addNewNote';
import { DragDropContext, Draggable, Droppable, DropResult } from '@hello-pangea/dnd';
import { io, Socket } from 'socket.io-client';
import { api, getActiveBackendUrl, checkAllBackendsHealth } from './utils/apiClient';
import { BACKEND_URLS } from './config/backends';

// Socket sẽ được khởi tạo sau khi kiểm tra backend
let socket: Socket | null = null;

export default function HomePage() {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
    const [showAddModal, setShowAddModal] = useState<boolean>(false);
    const [backendStatus, setBackendStatus] = useState<{ url: string; healthy: boolean }[]>([]);
    const [activeBackend, setActiveBackend] = useState<string>('');

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
            // Kiểm tra health của tất cả backends
            const healthResults = await checkAllBackendsHealth();
            setBackendStatus(healthResults);
            
            // Khởi tạo socket với backend đang active
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
            
            // Fetch data
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

        // gửi cho server để broadcast cho các client khác
        if (socket) {
            socket.emit('updateOrder', newNotes);
        }
    };

    if (loading)
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50">
                <div className="text-center">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin mx-auto"></div>
                        <div className="w-12 h-12 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin absolute top-2 left-1/2 -translate-x-1/2" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
                    </div>
                    <p className="mt-6 text-gray-600 font-medium animate-pulse">Đang tải dữ liệu...</p>
                </div>
            </div>
        );

    return (
        <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-200">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                                    Cloud Notes
                                </h1>
                                <p className="text-xs text-gray-500">Quản lý ghi chú của bạn</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="group flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all duration-300 shadow-lg shadow-sky-200 hover:shadow-xl hover:shadow-sky-300 hover:-translate-y-0.5"
                        >
                            <svg className="w-5 h-5 transition-transform group-hover:rotate-90 duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Thêm mới</span>
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Backend Status Panel */}
                <div className="mb-8 p-5 bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <h3 className="font-semibold text-gray-700">Trạng thái hệ thống</h3>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {BACKEND_URLS.map((url, index) => {
                            const status = backendStatus.find(s => s.url === url);
                            const isActive = url === activeBackend;
                            return (
                                <div
                                    key={index}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                                        status?.healthy
                                            ? isActive
                                                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-200'
                                                : 'bg-green-50 text-green-700 border border-green-200'
                                            : 'bg-red-50 text-red-600 border border-red-200'
                                    }`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${status?.healthy ? 'bg-current' : 'bg-red-500'} ${isActive ? 'animate-pulse' : ''}`}></span>
                                    {isActive && <span className="text-xs">✓</span>}
                                    Server {index + 1}: {status?.healthy ? 'Online' : 'Offline'}
                                </div>
                            );
                        })}
                    </div>
                    {activeBackend && (
                        <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            Đang kết nối: {activeBackend}
                        </p>
                    )}
                </div>

                {/* Notes Grid */}
                {notes.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-24 h-24 bg-gradient-to-br from-sky-100 to-cyan-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <svg className="w-12 h-12 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">Chưa có ghi chú nào</h3>
                        <p className="text-gray-500 mb-6">Bắt đầu tạo ghi chú đầu tiên của bạn!</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:from-sky-600 hover:to-blue-700 transition-all duration-300 shadow-lg shadow-sky-200"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Tạo ghi chú
                        </button>
                    </div>
                ) : (
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="notes">
                            {(provided) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                                >
                                    {notes.map((note, index) => (
                                        <Draggable
                                            key={note.id.toString()}
                                            draggableId={note.id.toString()}
                                            index={index}
                                        >
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    onClick={() => {
                                                        setShowDetailModal(true);
                                                        setSelectedNote(note);
                                                    }}
                                                    className={`group bg-white rounded-2xl p-6 border border-gray-100 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-sky-100 hover:-translate-y-1 hover:border-sky-200 ${
                                                        snapshot.isDragging 
                                                            ? 'shadow-2xl shadow-sky-200 rotate-2 scale-105' 
                                                            : 'shadow-sm'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="w-10 h-10 bg-gradient-to-br from-sky-100 to-cyan-100 rounded-xl flex items-center justify-center group-hover:from-sky-200 group-hover:to-cyan-200 transition-colors">
                                                            <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </div>
                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                    <h2 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2 group-hover:text-sky-600 transition-colors">
                                                        {note.title}
                                                    </h2>
                                                    <p className="text-gray-500 text-sm mb-4 line-clamp-3 leading-relaxed">
                                                        {note.content}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-xs text-gray-400 pt-4 border-t border-gray-50">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span>{new Date(note.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                )}
            </div>

            {/* Footer */}
            <footer className="mt-auto py-6 text-center text-sm text-gray-400">
                <p>© 2025 Cloud Notes</p>
            </footer>

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
        </main>
    );
}
