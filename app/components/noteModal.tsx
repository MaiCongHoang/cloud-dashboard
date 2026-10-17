'use client';
import React, { useState, useEffect } from 'react';

type Note = {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type NoteModalProps = {
  showModal: boolean;
  setShowModal: (v: boolean) => void;
  selectedNote: Note | null;
  setSelectedNote: (v: Note | null) => void;
  onSave: (note: Note) => Promise<void>;
  onDelete: (id: number) => void;
};

export default function NoteModal({
  showModal,
  setShowModal,
  selectedNote,
  setSelectedNote,
  onSave,
  onDelete,
}: NoteModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (selectedNote) {
      setEditTitle(selectedNote.title);
      setEditContent(selectedNote.content);
      setIsEditing(false);
      setCopied(false);
    }
  }, [selectedNote]);

  if (!showModal || !selectedNote) return null;

  const onClose = () => {
    setShowModal(false);
    setSelectedNote(null);
    setIsEditing(false);
    setCopied(false);
  };

  const handleDelete = () => {
    if (confirm('Bạn có chắc chắn muốn xóa ghi chú này không?')) {
      onDelete(selectedNote.id);
      onClose();
    }
  };

  const handleSave = async () => {
    await onSave({
      ...selectedNote,
      id: selectedNote.id,
      title: editTitle.trim(),
      content: editContent.trim(),
    });
    setIsEditing(false);
    onClose();
  };

  const handleCopy = () => {
    const textToCopy = `${selectedNote.title}\n\n${selectedNote.content}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Trích xuất danh mục nếu có dạng [Category]
  const categoryMatch = selectedNote.title.match(/^\[(.*?)\]\s*(.*)$/);
  const category = categoryMatch ? categoryMatch[1] : null;
  const displayTitle = categoryMatch ? categoryMatch[2] : selectedNote.title;

  const wordCount = (isEditing ? editContent : selectedNote.content).trim().split(/\s+/).filter(Boolean).length;
  const charCount = (isEditing ? editContent : selectedNote.content).length;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      {/* Nền mờ sang trọng với backdrop blur */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-fadeIn"
        onClick={onClose}
      ></div>

      {/* Modal nội dung */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-slideUp border border-slate-100 ring-1 ring-black/5">
        {/* Header với gradient Obsidian sang trọng */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-purple-950 px-6 py-5 border-b border-amber-400/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 bg-gradient-to-br from-amber-400/20 to-purple-500/20 border border-amber-400/40 rounded-2xl flex items-center justify-center shadow-inner">
                <svg className="w-6 h-6 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-amber-100 font-bold text-lg tracking-wide">
                  {isEditing ? 'Chỉnh sửa ghi chú' : 'Chi tiết ghi chú'}
                </h3>
                <p className="text-xs text-indigo-200/70">Không gian Fairy Sphere Sanctuary</p>
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

        {/* Content */}
        <div className="p-6 sm:p-7 space-y-5">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Tiêu đề ghi chú
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full border border-slate-200 rounded-2xl px-4.5 py-3 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all placeholder:text-slate-400 bg-slate-50/50"
                  placeholder="Nhập tiêu đề..."
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Nội dung
                  </label>
                  <span className="text-[11px] font-medium text-slate-400">
                    {wordCount} từ • {charCount} ký tự
                  </span>
                </div>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full border border-slate-200 rounded-2xl px-4.5 py-3.5 h-52 resize-none text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all placeholder:text-slate-400 bg-slate-50/50"
                  placeholder="Nhập nội dung..."
                />
              </div>
            </div>
          ) : (
            <div>
              {/* Category & Badge */}
              <div className="flex items-center justify-between mb-3">
                {category ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-xs">
                    🏷️ {category}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600">
                    ✨ Ghi chú
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>{copied ? 'Đã sao chép!' : 'Sao chép'}</span>
                </button>
              </div>

              <h2 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight leading-snug">
                {displayTitle}
              </h2>
              <div className="bg-slate-50/90 border border-slate-200/70 rounded-2xl p-5 mb-2 max-h-72 overflow-y-auto shadow-inner">
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-sm">
                  {selectedNote.content}
                </p>
              </div>
              <div className="flex justify-end text-[11px] text-slate-400 mt-1">
                {wordCount} từ • {charCount} ký tự
              </div>
            </div>
          )}

          {/* Thời gian */}
          <div className="flex items-center gap-2 text-xs text-slate-400 pt-3 border-t border-slate-100">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Tạo lúc: {new Date(selectedNote.createdAt).toLocaleString('vi-VN')}</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-all shadow-sm"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 hover:from-emerald-700 hover:to-teal-700 text-emerald-100 text-sm font-semibold tracking-wide shadow-md shadow-emerald-950/20 hover:shadow-xl hover:shadow-emerald-900/30 border border-emerald-400/30 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Lưu thay đổi</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-900 via-rose-800 to-red-900 hover:from-rose-800 hover:via-red-800 hover:to-rose-800 text-rose-100 text-sm font-semibold tracking-wide shadow-md shadow-rose-950/20 hover:shadow-xl hover:shadow-rose-900/30 border border-rose-400/30 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 mr-auto"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Xóa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-slate-950 text-sm font-semibold tracking-wide shadow-md shadow-amber-900/20 hover:shadow-xl hover:shadow-amber-600/30 border border-amber-300/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Chỉnh sửa</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
