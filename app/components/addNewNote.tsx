'use client';
import React, { useState } from 'react';

type AddNoteModalProps = {
    showModal: boolean;
    setShowModal: (v: boolean) => void;
    onSave: (title: string, content: string) => void;
};

const CATEGORIES = [
    { id: 'Công việc', label: 'Công việc', icon: '💼', color: 'from-blue-600 to-indigo-600' },
    { id: 'Ý tưởng', label: 'Ý tưởng', icon: '💡', color: 'from-amber-500 to-yellow-600' },
    { id: 'Học tập', label: 'Học tập', icon: '📚', color: 'from-purple-600 to-pink-600' },
    { id: 'Cá nhân', label: 'Cá nhân', icon: '🌿', color: 'from-emerald-600 to-teal-600' },
    { id: 'Chung', label: 'Chung', icon: '✨', color: 'from-slate-700 to-slate-900' },
];

export default function AddNoteModal({
    showModal,
    setShowModal,
    onSave,
}: AddNoteModalProps) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Công việc');

    if (!showModal) return null;
    const onClose = () => {
        setShowModal(false);
    };

    const handleSave = () => {
        if (!title.trim() || !content.trim()) {
            alert('Vui lòng nhập đầy đủ tiêu đề và nội dung!');
            return;
        }
        // Gắn category vào tiêu đề theo định dạng [Category] Tiêu đề nếu chưa có
        const formattedTitle = title.startsWith('[') ? title.trim() : `[${selectedCategory}] ${title.trim()}`;
        onSave(formattedTitle, content.trim());
        setTitle('');
        setContent('');
    };

    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    const charCount = content.length;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            {/* Backdrop với hiệu ứng mờ cao cấp */}
            <div
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-fadeIn"
                onClick={onClose}
            ></div>

            {/* Modal Dialog */}
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-slideUp border border-slate-100 ring-1 ring-black/5">
                {/* Header với gradient Obsidian sang trọng */}
                <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-purple-950 px-6 py-5 border-b border-amber-400/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 bg-gradient-to-br from-amber-400/20 to-purple-500/20 border border-amber-400/40 rounded-2xl flex items-center justify-center shadow-inner">
                                <svg className="w-6 h-6 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-amber-100 font-bold text-lg tracking-wide">
                                    Thêm ghi chú mới
                                </h3>
                                <p className="text-xs text-indigo-200/70">Lưu trữ ý tưởng vào không gian Fairy Sphere</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-amber-200/80 hover:text-white"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-6 sm:p-7 space-y-5">
                    {/* Category Selector */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2.5">
                            Danh mục ghi chú
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                        selectedCategory === cat.id
                                            ? 'bg-slate-900 text-amber-300 border border-amber-400/40 shadow-md shadow-slate-900/15 scale-105'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 border border-transparent'
                                    }`}
                                >
                                    <span>{cat.icon}</span>
                                    <span>{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Input Tiêu đề */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                            Tiêu đề
                        </label>
                        <input
                            type="text"
                            placeholder="Nhập tiêu đề ghi chú..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full border border-slate-200 rounded-2xl px-4.5 py-3 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all placeholder:text-slate-400 placeholder:font-normal bg-slate-50/50"
                        />
                    </div>

                    {/* Input Nội dung */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Nội dung chi tiết
                            </label>
                            <span className="text-[11px] font-medium text-slate-400">
                                {wordCount} từ • {charCount} ký tự
                            </span>
                        </div>
                        <textarea
                            placeholder="Viết nội dung ý tưởng, kế hoạch hay tài liệu tại đây..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full border border-slate-200 rounded-2xl px-4.5 py-3.5 h-44 resize-none text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all placeholder:text-slate-400 bg-slate-50/50"
                        />
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm font-semibold hover:bg-slate-100 hover:text-slate-900 transition-all shadow-sm"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-slate-950 via-indigo-950 to-purple-950 hover:from-slate-900 hover:via-purple-900 hover:to-indigo-950 text-amber-200 hover:text-amber-100 text-sm font-semibold tracking-wide border border-amber-400/40 shadow-lg shadow-indigo-950/20 hover:shadow-xl hover:shadow-indigo-950/30 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2"
                        >
                            <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Lưu ghi chú</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
