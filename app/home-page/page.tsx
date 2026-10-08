'use client';

import { useEffect, useState } from 'react';
import NoteModal from '../components/noteModal';
import AddNoteModal from '../components/addNewNote';
import { DragDropContext, Draggable, Droppable, DropResult } from '@hello-pangea/dnd';
import { io, Socket } from 'socket.io-client';
import { api, getActiveBackendUrl, checkAllBackendsHealth } from '../utils/apiClient';
import { BACKEND_URLS } from '../config/backends';

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
            <div className="flex items-center justify-center h-screen">
                <p className="text-gray-500 text-lg animate-pulse">Đang tải dữ liệu...</p>
            </div>
        );

    return (
        <main className="min-h-screen bg-gray-100 p-6">
            {/* Backend Status Panel */}
            <div className="mb-4 p-4 bg-white rounded-lg shadow">
                <h3 className="font-semibold text-gray-700 mb-2">Trạng thái Backends:</h3>
                <div className="flex flex-wrap gap-2">
                    {BACKEND_URLS.map((url, index) => {
                        const status = backendStatus.find(s => s.url === url);
                        const isActive = url === activeBackend;
                        return (
                            <div
                                key={index}
                                className={`px-3 py-1 rounded-full text-sm ${
                                    status?.healthy
                                        ? isActive
                                            ? 'bg-green-500 text-white'
                                            : 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                }`}
                            >
                                {isActive && '✓ '} Backend {index + 1}: {status?.healthy ? 'Online' : 'Offline'}
                            </div>
                        );
                    })}
                </div>
                {activeBackend && (
                    <p className="text-xs text-gray-500 mt-2">
                        Đang kết nối: {activeBackend}
                    </p>
                )}
            </div>

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-blue-600">
                    Danh sách ghi chú
                </h1>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                    Thêm mới
                </button>
            </div>

            {notes.length === 0 ? (
                <p className="text-center text-gray-500">Không có ghi chú nào.</p>
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
                                                className={`bg-white shadow-lg rounded-2xl p-5 border border-gray-200 hover:shadow-xl transition-all duration-300 ${snapshot.isDragging ? 'opacity-80 rotate-1' : ''
                                                    }`}
                                            >
                                                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                                                    {note.title}
                                                </h2>
                                                <p className="text-gray-600 mb-4">{note.content}</p>
                                                <div className="text-sm text-gray-400">
                                                    <p>
                                                        Tạo: {new Date(note.createdAt).toLocaleString()}
                                                    </p>
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
