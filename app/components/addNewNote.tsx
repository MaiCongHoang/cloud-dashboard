'use client';
import React, { useState } from 'react';

type AddNoteModalProps = {
    showModal: boolean;
    setShowModal: (v: boolean) => void;
    onSave: (title: string, content: string) => void;
};

export default function AddNoteModal({
    showModal,
    setShowModal,
    onSave,
}: AddNoteModalProps) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    if (!showModal) return null;
    const onClose = () => {
        setShowModal(false);
    }
    const handleSave = () => {
        if (!title.trim() || !content.trim()) {
            alert('Vui lòng nhập đầy đủ tiêu đề và nội dung!');
            return;
        }
        onSave(title, content);
        setTitle('');
        setContent('');
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            {/* Nền mờ với animation */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
                onClick={onClose}
            ></div>

            {/* Hộp nội dung modal */}
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slideUp">
                {/* Header với gradient */}
                <div className="bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                            <h3 className="text-white font-semibold text-lg">
                                Thêm ghi chú mới
                            </h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                        >
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <span className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                    Tiêu đề
                                </span>
                            </label>
                            <input
                                type="text"
                                placeholder="Nhập tiêu đề ghi chú..."
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all placeholder:text-gray-400"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <span className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                                    </svg>
                                    Nội dung
                                </span>
                            </label>
                            <textarea
                                placeholder="Nhập nội dung ghi chú..."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 h-40 resize-none text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all placeholder:text-gray-400"
                            />
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-all"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-medium hover:from-sky-600 hover:to-blue-700 shadow-lg shadow-sky-200 transition-all flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Lưu ghi chú
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
