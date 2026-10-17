'use client';

import React, { useState, useRef } from 'react';
import { SavedExperiment, SceneSnapshot } from '@/lib/types/lab';
import {
  FolderOpen,
  X,
  Plus,
  Download,
  Upload,
  Trash2,
  Play,
  RotateCcw,
  Clock,
  Layers,
  FileText,
  Check,
} from 'lucide-react';

interface SavedScenesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedExperiments: SavedExperiment[];
  onSaveCurrentScene: (title: string, description: string) => void;
  onLoadExperiment: (snapshot: SceneSnapshot) => void;
  onDeleteExperiment: (id: string) => void;
  onExportCurrentScene: () => void;
  onImportSceneJSON: (snapshot: SceneSnapshot) => void;
  lastAutoSave?: SceneSnapshot | null;
  onRestoreAutoSave?: () => void;
}

export const SavedScenesDrawer: React.FC<SavedScenesDrawerProps> = ({
  isOpen,
  onClose,
  savedExperiments,
  onSaveCurrentScene,
  onLoadExperiment,
  onDeleteExperiment,
  onExportCurrentScene,
  onImportSceneJSON,
  lastAutoSave,
  onRestoreAutoSave,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isSavingNew, setIsSavingNew] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleCreateSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onSaveCurrentScene(newTitle, newDescription);
    setNewTitle('');
    setNewDescription('');
    setIsSavingNew(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text) as SceneSnapshot;
        if (parsed && (parsed.mode === 'field' || parsed.mode === 'circuit')) {
          onImportSceneJSON(parsed);
        } else {
          alert('Invalid experiment snapshot file format.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 max-w-2xl w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center space-x-2.5">
            <FolderOpen className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Experiment Scene Snapshots &amp; State Persistence
              </h2>
              <p className="text-xs text-slate-400">
                Auto-save recovery, experiment versioning, and JSON serialization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* Top Actions: Save New, Export, Import */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsSavingNew(prev => !prev)}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold transition flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Save Current 3D Scene</span>
              </button>
              {lastAutoSave && onRestoreAutoSave && (
                <button
                  onClick={onRestoreAutoSave}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center space-x-1.5"
                  title="Reload state automatically cached from last session"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Restore Auto-Save</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={onExportCurrentScene}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center space-x-1"
                title="Download scene snapshot as a JSON file"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export JSON</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center space-x-1"
                title="Upload and restore a saved JSON experiment file"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Import JSON</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* New Save Form */}
          {isSavingNew && (
            <form
              onSubmit={handleCreateSave}
              className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-3"
            >
              <div className="font-semibold text-cyan-400 flex items-center space-x-1.5">
                <Plus className="w-4 h-4" />
                <span>Create Permanent Scene Snapshot</span>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Experiment Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Asymmetric Dipole with 2D Slice Plane"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Notes / Description (Optional)</label>
                <textarea
                  placeholder="e.g. Verified zero field point at x = 3.2m using RK4 streamlines."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsSavingNew(false)}
                  className="px-3 py-1 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold"
                >
                  Confirm &amp; Save
                </button>
              </div>
            </form>
          )}

          {/* Saved Experiments List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
              <span>Saved Experiment Versions ({savedExperiments.length})</span>
              <span>Local &amp; Cloud Storage</span>
            </div>

            {savedExperiments.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800 text-slate-500 space-y-2">
                <Layers className="w-8 h-8 mx-auto text-slate-600" />
                <p>No saved snapshots yet. Click &quot;Save Current 3D Scene&quot; to bookmark your experiment state!</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {savedExperiments.map(exp => {
                  const snap = exp.snapshot;
                  const isField = snap.mode === 'field';
                  const chargeCount = snap.fieldData?.charges?.length || 0;
                  const compCount = snap.circuitData?.components?.length || 0;

                  return (
                    <div
                      key={exp.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 hover:border-slate-700 transition flex items-center justify-between group"
                    >
                      <div className="space-y-1 max-w-[65%]">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white text-sm">{exp.title}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                              isField
                                ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/50'
                                : 'bg-amber-950 text-amber-400 border border-amber-800/50'
                            }`}
                          >
                            {isField ? 'Electric Field' : 'Circuit Workbench'}
                          </span>
                        </div>
                        {exp.description && (
                          <p className="text-slate-400 text-[11px] line-clamp-1">
                            {exp.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-3 text-[10px] text-slate-500 font-mono">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(exp.updatedAt).toLocaleDateString()}</span>
                          </span>
                          <span>·</span>
                          <span>
                            {isField ? `${chargeCount} charges` : `${compCount} components`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            onLoadExperiment(snap);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 font-semibold transition flex items-center space-x-1"
                          title="Restore this state in 3D viewport"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Load Scene</span>
                        </button>
                        <button
                          onClick={() => onDeleteExperiment(exp.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition"
                          title="Delete snapshot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>State parameters serialize coordinates (x,y,z), values (q, R, C), and camera matrix.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
