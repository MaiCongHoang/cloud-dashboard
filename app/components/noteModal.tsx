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
  onSave: (note: Note) => Promise<void>; // 👈 gọi API PUT/POST
  onDelete:(id:number) => void
};

export default function NoteModal({
  showModal,
  setShowModal,
  selectedNote,
  setSelectedNote,
  onSave,
  onDelete
}: NoteModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    if (selectedNote) {
      setEditTitle(selectedNote.title);
      setEditContent(selectedNote.content);
      setIsEditing(false);
    }
  }, [selectedNote]);
  

  if (!showModal || !selectedNote) return null;

  const onClose = () => {
    setShowModal(false);
    setSelectedNote(null);
    setIsEditing(false);
  };

  const handleDelete=()=>{
    if (confirm("Bạn có chắc chắn muốn xóa note này?")) {
   onDelete(selectedNote.id);
  onClose();
}
  }
  const handleSave = async () => {
    await onSave({
      ...selectedNote,
      id:selectedNote.id,
      title: editTitle,
      content: editContent,
    });
    setIsEditing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      {/* Nền mờ với animation */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      ></div>

      {/* Modal nội dung */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slideUp">
        {/* Header với gradient */}
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-lg">
                {isEditing ? 'Chỉnh sửa ghi chú' : 'Chi tiết ghi chú'}
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
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tiêu đề</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                  placeholder="Nhập tiêu đề..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nội dung</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 h-48 resize-none text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                  placeholder="Nhập nội dung..."
                />
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {selectedNote.title}
              </h2>
              <div className="bg-gray-50 rounded-xl p-4 mb-4 max-h-64 overflow-y-auto">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {selectedNote.content}
                </p>
              </div>
            </div>
          )}

          {/* Thời gian */}
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-6 pt-4 border-t border-gray-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Tạo lúc: {new Date(selectedNote.createdAt).toLocaleString('vi-VN')}</span>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-all"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-200 transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Lưu
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 text-white font-medium hover:from-amber-500 hover:to-orange-500 shadow-lg shadow-amber-200 transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Sửa
                </button>
                <button
                  onClick={handleDelete}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-white font-medium hover:from-red-600 hover:to-rose-600 shadow-lg shadow-red-200 transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Xóa
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
