'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { apiClient } from '@/lib/api-client';

export function PrivacyView() {
  const { idToken, logout, profile } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const handleExport = async () => {
    if (!idToken || exporting) return;
    setExporting(true);
    setNotice(null);
    setErrorNotice(null);
    try {
      await apiClient.exportData(idToken);
      setNotice('Data archive successfully downloaded as JSON.');
    } catch (err: any) {
      setErrorNotice(err.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idToken || isDeletingAll) return;

    if (deleteConfirmText !== 'DELETE ALL REFLECTIQ DATA') {
      setErrorNotice('Confirmation string must exactly match: DELETE ALL REFLECTIQ DATA');
      return;
    }

    setIsDeletingAll(true);
    setErrorNotice(null);
    setNotice(null);
    try {
      await apiClient.deleteAllData(idToken, deleteConfirmText);
      setNotice('All data has been permanently deleted. Signing out...');
      setDeleteConfirmText('');
      setTimeout(() => {
        logout();
      }, 3000);
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to erase data.');
      setIsDeletingAll(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8 space-y-10">
      {/* Header */}
      <div className="border-b border-[#E6E4DD] pb-6">
        <h1 className="font-serif text-3xl font-medium text-[#1C1B18] tracking-tight">
          Privacy & Data
        </h1>
        <p className="text-sm font-serif text-[#525048] mt-1 leading-relaxed">
          Your reflections are only ever visible to you &mdash; no one else can access them, including other signed-in users. You have full ownership to download or delete your records at any time.
        </p>
      </div>

      {notice && (
        <div className="p-3 border border-[#2E4A3D] bg-[#F0F5F2] text-xs font-mono text-[#2E4A3D]">
          {notice}
        </div>
      )}

      {errorNotice && (
        <div className="p-3 border border-[#D5D2C8] bg-[#F8F7F2] text-xs font-mono text-[#525048]">
          {errorNotice}
        </div>
      )}

      {/* Profile & Security Architecture */}
      <div className="border border-[#E6E4DD] bg-[#FFFFFF] p-6 space-y-4">
        <h2 className="font-serif text-lg font-medium text-[#1C1B18]">
          Account & Security
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <span className="text-[#737168] block">Account Email:</span>
            <span className="text-[#1C1B18]">{profile?.email || 'Active User'}</span>
          </div>
          <div>
            <span className="text-[#737168] block">Account ID:</span>
            <span className="text-[#1C1B18] break-all">{profile?.uid || 'Active Session'}</span>
          </div>
          <div>
            <span className="text-[#737168] block">Data Isolation:</span>
            <span className="text-[#1C1B18]">Private to your account only</span>
          </div>
          <div>
            <span className="text-[#737168] block">Authentication:</span>
            <span className="text-[#1C1B18]">Secure signed-in session</span>
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="border border-[#E6E4DD] bg-[#FFFFFF] p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="font-serif text-lg font-medium text-[#1C1B18]">
            Export Your Data
          </h2>
          <p className="text-xs font-serif text-[#525048] leading-relaxed">
            Download a complete JSON file containing all your reflections, dialogue history, detected patterns, goals, action steps, memories, and weekly reviews.
          </p>
        </div>

        <button
          id="export-data-btn"
          onClick={handleExport}
          disabled={exporting}
          className="border border-[#1C1B18] bg-[#FFFFFF] hover:bg-[#FAF9F5] text-[#1C1B18] px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors"
        >
          {exporting ? 'Preparing download...' : 'Download My Data'}
        </button>
      </div>

      {/* Account Actions */}
      <div className="border border-[#E6E4DD] bg-[#FFFFFF] p-6 space-y-4">
        <h2 className="font-serif text-lg font-medium text-[#1C1B18]">
          Sign Out
        </h2>
        <p className="text-xs font-serif text-[#525048] leading-relaxed">
          Sign out of your account on this device.
        </p>
        <button
          id="privacy-sign-out-btn"
          onClick={logout}
          className="border border-[#D5D2C8] bg-[#FAF9F5] hover:bg-[#F3F1EB] text-[#1C1B18] px-4 py-2 text-xs font-mono uppercase tracking-wider"
        >
          Sign Out
        </button>
      </div>

      {/* Irreversible Destruction Zone */}
      <div className="border border-[#D5D2C8] bg-[#FAF9F5] p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="font-serif text-lg font-medium text-[#1C1B18]">
            Delete All Data
          </h2>
          <p className="text-xs font-serif text-[#525048] leading-relaxed">
            This will permanently delete all your reflections, conversations, goals, memories, and weekly reviews. Once deleted, this information cannot be recovered.
          </p>
        </div>

        <form onSubmit={handleDeleteAll} className="space-y-3 pt-2">
          <label htmlFor="delete-confirm-input" className="block text-xs font-mono text-[#737168]">
            To confirm deletion, type: <code className="text-[#1C1B18] bg-[#FFFFFF] px-1 border border-[#D5D2C8] font-bold">DELETE ALL REFLECTIQ DATA</code>
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="delete-confirm-input"
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE ALL REFLECTIQ DATA"
              className="flex-1 bg-[#FFFFFF] border border-[#D5D2C8] px-3 py-2 text-xs font-mono text-[#1C1B18] focus:outline-none focus:border-[#8B5E3C]"
            />
            <button
              id="delete-all-btn"
              type="submit"
              disabled={isDeletingAll || deleteConfirmText !== 'DELETE ALL REFLECTIQ DATA'}
              className="bg-[#1C1B18] text-[#FAF9F5] hover:bg-[#33312B] disabled:opacity-40 px-4 py-2 text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-colors"
            >
              {isDeletingAll ? 'Deleting...' : 'Delete Everything'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
